const octokit = require('@octokit/rest')();
const BigQuery = require('@google-cloud/bigquery');
const moment = require('moment');
moment.relativeTimeThreshold('m', 55);
moment.relativeTimeThreshold('ss', 5);
moment.relativeTimeThreshold('s', 55);
const PROJECT_ID = 'public-github-adobe';
const DATASET_ID = 'github_archive_query_views';
const USERS_WITH_PUSHES = 'users_pushes_2017';
const USERS_TO_COMPANIES = 'user_to_company';
const bigquery = new BigQuery({
    projectId: PROJECT_ID,
    keyFilename: 'bigquery.json'
});
const row_module = require('./row_marker.js');
const persistence = require('./persistence.js');
const github_tokens = require('./github_tokens.js');

let row_marker = false;
let new_rows = [];

// BigQuery objects
const dataset = bigquery.dataset(DATASET_ID);
const user_source = dataset.table(USERS_WITH_PUSHES);
const target_table = dataset.table(USERS_TO_COMPANIES);

(async () => {
    await github_tokens.seed_tokens();
    row_marker = await row_module.read();
    console.log('Starting up processing at row', row_marker);
    process.on('SIGINT', async () => {
        if (new_rows.length === 0) process.exit(1);
        if (!persistence.is_saving()) {
            console.log('SIGINT caught! Will flush rows then exit process, please wait...');
            await persistence.save_rows_to_bigquery(target_table, row_marker, new_rows, true);
        } else {
            console.log('CTRL+C aint gonna do shiet! wait til this process flushes yo!');
        }
    });
    while (await github_tokens.has_not_reached_api_limit()) {
        const token_details = await github_tokens.get_roomiest_token(true);
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
                if (e.code !== 404) {
                    console.warn('Error retrieving profile info for', login, '- moving on. Error code:', e.code, 'Status:', e.status);
                }
                continue;
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
            if (counter % 1000 === 0 && !persistence.is_saving()) {
                // Every X records, lets flush the new rows to bigquery, unless were already saving/flushing.
                await persistence.save_rows_to_bigquery(target_table, row_marker, new_rows);
                new_rows = [];
            }
        }
        console.log('Processed', counter, 'records in', end_time.from(start_time, true), '.');
    }
    if (!persistence.is_saving()) {
        await persistence.save_rows_to_bigquery(target_table, row_marker, new_rows);
    }
})();
