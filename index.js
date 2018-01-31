const fs = require('fs-extra');
const octokit = require('@octokit/rest')();
const BigQuery = require('@google-cloud/bigquery');
const moment = require('moment');
moment.relativeTimeThreshold('m', 55);
moment.relativeTimeThreshold('ss', 5);
moment.relativeTimeThreshold('s', 55);
const PROJECT_ID = 'public-github-adobe';
const DATASET_ID = 'github_archive_query_views';
const USERS_WITH_PUSHES = 'users_pushes_oct2017';
const USERS_TO_COMPANIES = 'user_to_company';
const bigquery = new BigQuery({
    projectId: PROJECT_ID,
    keyFilename: 'bigquery.json'
});

(async () => {
    // Auth and setup
    let tokens = [];
    let rate_limit_results;
    try {
        const token_buffer = await fs.readFile('oauth.token');
        tokens = token_buffer.toString().trim().split('\n');
    } catch (e) {
        console.error('Error reading oauth token', e);
        throw e;
    }
    const dataset = bigquery.dataset(DATASET_ID);
    const user_source = dataset.table(USERS_WITH_PUSHES);
    const target_table = dataset.table(USERS_TO_COMPANIES);
    // Read our row marker, like, where are we starting back up from?
    let row_marker = false;
    try {
        row_marker = await fs.exists('row.marker');
    } catch (e) {
        console.error('Error reading row marker file', e);
        throw e;
    }
    if (row_marker) {
        row_marker = parseInt((await fs.readFile('row.marker')).toString().trim());
    } else {
        row_marker = 0;
    }
    console.log('Starting up processing at row', row_marker);
    let new_rows = [];
    let save_rows = async function (bomb) {
        console.log('Will start to insert rows shortly. First, save our row marker (', row_marker, ')...');
        try {
            await fs.writeFile('row.marker', '' + row_marker);
            console.log('... done.');
        } catch (e) {
            console.error('Error writing row marker!', e);
            console.warn('The Row marker is', row_marker, '- save this yourself!');
        }
        console.log('We have', new_rows.length, 'new rows to insert, commencing insertion...');
        let insert_op = null;
        try {
            insert_op = await target_table.insert(new_rows);
        } catch (e) {
            console.error('Error inserting rows! Oh no!', e);
            throw e;
        }
        console.log('...complete. Hooray!', insert_op);
        if (bomb) process.exit(0);
    };
    let is_saving = false;
    process.on('SIGINT', async () => {
        if (!is_saving) {
            is_saving = true;
            await save_rows(true);
        } else {
            console.log('CTRL+C aint gonna do shiet! wait til this process flushes yo!');
        }
    });
    for (let token of tokens) {
        console.log('Retrieving API limits with current token...');
        octokit.authenticate({
            type: 'token',
            token: token
        });
        try {
            rate_limit_results = await octokit.misc.getRateLimit({});
        } catch (e) {
            console.error('Error retrieving rate limit', e);
            throw e;
        }
        const calls_remaining = rate_limit_results.data.rate.remaining;
        const limit_reset = rate_limit_results.data.rate.reset;
        if (calls_remaining === 0) {
            console.log('No API calls to GitHub remaining with the current token! Window will reset', moment.unix(limit_reset).fromNow());
            return;
        } else {
            console.log('We have', calls_remaining, 'API calls to GitHub remaining with the current token, window will reset', moment.unix(limit_reset).fromNow());
        }
        console.log('Asking for rows', row_marker, 'through', row_marker + calls_remaining, '...');
        let raw_data = [];
        try {
            raw_data = (await user_source.getRows({startIndex: row_marker, maxResults: calls_remaining}))[0];
        } catch (e) {
            console.error('Error retrieving source rows, skipping...', e);
        }
        console.log('Beginning processing...');
        let counter = 0;
        let start_time = moment();
        let end_time = moment();
        for (let user of raw_data) {
            let login = user.login;
            let profile;
            try {
                profile = await octokit.users.getForUser({username: login});
            } catch (e) {
                return;
            }
            var etag = profile.meta.etag;
            new_rows.push({
                user: login,
                company: profile.data.company,
                fingerprint: etag
            });
            row_marker++;
            counter++;
            end_time = moment();
            process.stdout.write('Processed ' + counter + ' records in ' + end_time.from(start_time, true) + '\r');
        }
        console.log('Processed', counter, 'records in', end_time.from(start_time, true), '.');
    }
    if (!is_saving) {
        is_saving = true;
        await save_rows();
    }
})();
