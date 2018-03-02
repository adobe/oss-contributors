let fs = require('fs-extra');
const octokit = require('@octokit/rest')();
const BigQuery = require('@google-cloud/bigquery');
const moment = require('moment');
moment.relativeTimeThreshold('m', 55);
moment.relativeTimeThreshold('ss', 5);
moment.relativeTimeThreshold('s', 55);
const PROJECT_ID = 'public-github-adobe';
const DATASET_ID = 'github_archive_query_views';
const bigquery = new BigQuery({
    projectId: PROJECT_ID,
    keyFilename: 'bigquery.json'
});
const row_module = require('./util/row_marker.js');
const github_tokens = require('./util/github_tokens.js');
const companies = require('./util/companies.js');
const db = require('./util/db.js');

let avg = (array) => array.reduce((a, b) => a + b) / array.length;

// Given a BigQuery source table full of GitHub.com `git push` events for a given time interval:
module.exports = async function (argv) {
    let db_conn = await db.connection.async(argv);
    let row_marker = false; // a file that tells us how many github usernames (from the githubarchive activity stream) weve already processed
    let cache = await db.cache.read(argv); // read giant db as json (from db-to-json command)
    let db_updates = 0;
    let db_fails = 0;
    let db_errors = {};
    let not_founds = 0;
    let cache_hits = 0;
    let company_unchanged = 0;
    let start_time = moment();
    let end_time = moment();
    let table_size = 0;
    let GH_calls = [];
    let DB_calls = [];
    let log_progress = () => {
        console.log('Issued', db_updates, 'DB updates,', db_fails, 'DB updates failed,', not_founds, 'profiles not found (likely deleted),', company_unchanged, 'users\' companies unchanged and', cache_hits, 'GitHub profile cache hits in', end_time.from(start_time, true) + '.');
        console.log('DB errors:', JSON.stringify(db_errors));
        console.log('Average time per iteration for:: GitHub API calls -', Math.round(avg(GH_calls)) + 'ms,', 'DB update calls -', Math.round(avg(DB_calls)) + 'ms');
        console.log(Math.round(row_marker / table_size * 100) + '% complete');
    };
    // get a ctrl+c handler in (useful for testing)
    process.on('SIGINT', async () => {
        await row_module.write(row_marker);
        // Close off DB connection.
        await db_conn.end();
        // Write out db.json since we updated it in-memory on the go anyways
        await db.cache.write(argv, cache);
        log_progress();
        process.exit(1);
    });
    // BigQuery objects
    const dataset = bigquery.dataset(DATASET_ID);
    // TODO: the source tables shuold be managed by the tool, not specified by the user https://git.corp.adobe.com/dx/oss-contributors/issues/6
    const user_source = dataset.table(argv.source); // this table has a list of active github usernames over a particular time interval, ordered by number of commits
    const table_data = await user_source.getMetadata();
    table_size = table_data[0].numRows;
    await github_tokens.seed_tokens(); // read github oauth tokens from filesystem
    row_marker = await row_module.read(); // read our row marker file for a hint as to where to start from
    let counter = 0;
    console.log('Found row marker hint:', row_marker);
    console.log('Currently about', Math.round(row_marker / table_size * 100) + '% complete');
    while (await github_tokens.has_not_reached_api_limit()) { // this loop executes roughly as much as the hourly API limit for GitHub is, which is currently around 5000
        const token_details = await github_tokens.get_roomiest_token(true); // silent=true
        const calls_remaining = token_details.remaining;
        const limit_reset = token_details.reset;
        console.log('Retrieving rows', row_marker, '-', row_marker + calls_remaining, '(' + calls_remaining + ' GitHub API calls on current token remaining, window will reset', moment.unix(limit_reset).fromNow() + ')');
        octokit.authenticate({
            type: 'token',
            token: token_details.token
        });
        let raw_data = [];
        try {
            raw_data = (await user_source.getRows({startIndex: row_marker, maxResults: calls_remaining}))[0];
        } catch (e) {
            // TODO: is this the correct error handling here?
            console.error('Error retrieving source rows, skipping...', e);
        }
        if (raw_data.length === 0) {
            console.log('No rows returned! We might have hit the end! Row marker is', row_marker);
            break;
        }
        db_updates = 0;
        db_fails = 0;
        db_errors = {};
        not_founds = 0;
        cache_hits = 0;
        company_unchanged = 0;
        end_time = moment();
        GH_calls = [];
        DB_calls = [];
        for (let user of raw_data) {
            let login = user.login;
            let profile;
            let options = {username: login};
            // If we have the user in our local db cache already, add ETag fingerprint to GitHub.com request
            // This may possibly trip the error flow via a returned 304 Not Modified HTTP status
            if (cache[login]) {
                options.headers = {
                    'If-None-Match': '"' + cache[login][1] + '"'
                };
            }
            row_marker++;
            counter++;
            let s = new Date().valueOf();
            let et = new Date().valueOf();
            try {
                // TODO: the following call is the most expensive during this operation: usually about 200ms.
                // What can we do to speed this up?
                profile = await octokit.users.getForUser(options);
                et = new Date().valueOf();
                GH_calls.push(et - s);
            } catch (e) {
                et = new Date().valueOf();
                GH_calls.push(et - s);
                switch (e.code) {
                case 404: // profile not found, user deleted their account now
                    not_founds++;
                    break;
                case 304: // profile not modified since last retrieval (via ETag)
                    cache_hits++;
                    break;
                default:
                    console.warn('Error retrieving profile info for', login, '- moving on. Error code:', e.code, 'Status:', e.status);
                }
                process.stdout.write('Processed ' + counter + ' records in ' + end_time.from(start_time, true) + '                     \r');
                continue;
            }
            let etag = profile.meta.etag.replace(/"/g, '');
            let company = profile.data.company;
            if (!companies.is_empty(company)) {
                let company_match = company.match(companies.catch_all);
                if (company_match) {
                    var company_info = companies.map[company_match[0].toLowerCase()];
                    // We store additional company data to customize behaviour here, in certain cases.
                    if (company_info.ignore) {
                        // First, some of the company names catch A LOT of stuff via regex, so `ignore` helps to qualify this a bit
                        if (!company.match(company_info.ignore)) {
                            company = company_info.label;
                        }
                    } else {
                        // If there is no ignore property in the company map, then we just use the string value returned from the company map
                        company = company_info;
                    }
                }
            } else {
                company = '';
            }
            let statement = '';
            let values = [];
            if (cache[login]) {
                // user already exists in our DB, may need to prepare an UPDATE statement if the company changed.
                if (company !== cache[login][0]) {
                    statement = 'UPDATE ' + argv.dbName + '.' + argv.tableName + ' SET company = ?, fingerprint = ? WHERE user = ?';
                    values = [company, etag, login];
                    cache[login][0] = company;
                } else {
                    // If company is the same, move on.
                    company_unchanged++;
                    process.stdout.write('Processed ' + counter + ' records in ' + end_time.from(start_time, true) + '                     \r');
                    continue;
                }
            } else {
                // user does not exist in our DB, time for an INSERT statement
                statement = 'INSERT INTO ' + argv.dbName + '.' + argv.tableName + ' (user, company, fingerprint) VALUES (?, ?, ?)';
                values = [login, company, etag];
                cache[login] = [company, etag];
            }
            s = new Date().valueOf();
            try {
                // TODO: Instead of awaiting on the query here, can we toss it to a background "thread" ?
                // To be fair typical exec times here are 3ms. If a month of activity includes 1.2 million user records,
                // and we typically only need to update about 30% of those, that's only 15 mins waiting on DB.
                let db_results = await db_conn.query(statement, values);
                et = new Date().valueOf();
                if (db_results.affectedRows) db_updates++;
                else db_fails++;
            } catch (e) {
                et = new Date().valueOf();
                db_fails++;
                if (e.code) {
                    if (db_errors[e.code]) db_errors[e.code]++;
                    else db_errors[e.code] = 1;
                } else {
                    console.warn('DB update error, with no error code either :o, details:', e);
                }
            }
            DB_calls.push(et - s);
            end_time = moment();
            process.stdout.write('Processed ' + counter + ' records in ' + end_time.from(start_time, true) + '                     \r');
        }
        await row_module.write(row_marker);
        log_progress();
    }
    await row_module.write(row_marker);
    console.log('Closing DB connection...');
    await db_conn.end();
    console.log('... closed.');
    console.log('Writing out DB cache to', argv.dbJson, '...');
    await fs.writeFile(argv.dbJson, JSON.stringify(cache));
    console.log('... complete. Goodbye!');
};
