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

// Given a BigQuery source table full of GitHub.com `git push` events for a given time interval:
module.exports = async function (argv) {
    let db_conn = await db.connection.async();
    let cache = await db.cache();
    let row_marker = false; // a file that tells us how many github usernames (from the githubarchive activity stream) weve already processed
    // BigQuery objects
    const dataset = bigquery.dataset(DATASET_ID);
    const user_source = dataset.table(argv.source); // this table has a list of active github usernames over a particular time interval, ordered by number of commits
    await github_tokens.seed_tokens(); // read github oauth tokens from filesystem
    row_marker = await row_module.read(); // read our row marker file for a hint as to where to start from
    console.log('Starting up processing at row', row_marker);
    // get a ctrl+c handler in (useful for testing)
    process.on('SIGINT', async () => {
        // Close off DB connection.
        db.end();
    });
    while (await github_tokens.has_not_reached_api_limit()) {
        const token_details = await github_tokens.get_roomiest_token(true); // silent=true
        const calls_remaining = token_details.remaining;
        const limit_reset = token_details.reset;
        console.log('We have', calls_remaining, 'API calls to GitHub remaining with the current token, window will reset', moment.unix(limit_reset).fromNow());
        console.log('Asking for rows', row_marker, 'through', row_marker + calls_remaining, '...');
        octokit.authenticate({
            type: 'token',
            token: token_details.token
        });
        let raw_data = [];
        try {
            raw_data = (await user_source.getRows({startIndex: row_marker, maxResults: calls_remaining}))[0];
        } catch (e) {
            console.error('Error retrieving source rows, skipping...', e);
        }
        if (raw_data.length === 0) {
            console.log('No rows returned! We might have hit the end! Row marker is', row_marker);
            break;
        }
        let db_updates = 0;
        let not_founds = 0;
        let cache_hits = 0;
        let company_unchanged = 0;
        let start_time = moment();
        let end_time = moment();
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
            try {
                profile = await octokit.users.getForUser(options);
            } catch (e) {
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
                process.stdout.write('Processed ' + row_marker + ' records in ' + end_time.from(start_time, true) + '                     \r');
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
            if (cache[login]) {
                // user already exists in our DB, may need to prepare an UPDATE statement if the company changed.
                if (company !== cache[login][0]) {
                    statement = 'UPDATE ' + argv.dbName + '.' + argv.tableName + ' SET company = \'' + company + '\', fingerprint = \'' + etag + '\' WHERE user = \'' + login + '\'';
                    cache[login][0] = company;
                } else {
                    // If company is the same, move on.
                    company_unchanged++;
                    process.stdout.write('Processed ' + row_marker + ' records in ' + end_time.from(start_time, true) + '                     \r');
                    continue;
                }
            } else {
                // user does not exist in our DB, time for an INSERT statement
                statement = 'INSERT INTO ' + argv.dbName + '.' + argv.tableName + ' (user, company, fingerprint) VALUES (\'' + login + '\', \'' + company + '\', \'' + etag + '\')';
                cache[login] = [company, etag];
            }
            try {
                await db_conn.query(statement);
            } catch (e) {
                console.warn('Error updating DB!', e);
            }
            db_updates++;
            end_time = moment();
            process.stdout.write('Processed ' + row_marker + ' records in ' + end_time.from(start_time, true) + '                     \r');
        }
        row_module.write(row_marker);
        console.log('Prepared', db_updates, 'record updates,', not_founds, 'profiles not found (likely deleted),', company_unchanged, 'users\' companies unchanged, and', cache_hits, 'GitHub profile cache hits in', end_time.from(start_time, true), '.');
    }
    console.log('Closing DB connection...');
    db_conn.end();
    console.log('... closed.');
    console.log('Writing out DB cache to', argv.dbJson, '...');
    await fs.writeFile(argv.dbJson, JSON.stringify(cache));
    console.log('... complete. Goodbye!');
};
