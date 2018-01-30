const fs = require('fs-extra');
const octokit = require('@octokit/rest')();
const BigQuery = require('@google-cloud/bigquery');
const moment = require('moment');
moment.relativeTimeThreshold('m', 55);
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
    let token = '';
    let rate_limit_results;
    try {
        const token_buffer = await fs.readFile('oauth.token');
        token = token_buffer.toString().trim();
    } catch (e) {
        console.error('Error reading oauth token', e);
        throw e;
    }
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
    const rate_limit = rate_limit_results.data.rate.limit;
    const calls_remaining = rate_limit_results.data.rate.remaining;
    const limit_reset = rate_limit_results.data.rate.reset;
    console.log('We have', calls_remaining, 'API calls to GitHub remaining, window will reset', moment.unix(limit_reset).fromNow());
    const dataset = bigquery.dataset(DATASET_ID);
    const user_source = dataset.get(USERS_WITH_PUSHES);
    const target_table = dataset.get(USERS_TO_COMPANIES);

    // Read our row marker
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
})();
