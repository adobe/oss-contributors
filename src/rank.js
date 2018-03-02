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
const companies = require('./util/companies.js');
const db = require('./util/db.js');

// Given a BigQuery source table full of GitHub.com `git push` events for a given time interval:
module.exports = async function (argv) {
    let cache = await db.cache.read(argv); // use a local db.json cache
    // BigQuery objects
    const dataset = bigquery.dataset(DATASET_ID);
    // TODO: this table should be created (and managed) transparently by the tool
    const activity = dataset.table(argv.source); // this table has a list of active github usernames over a particular time interval, ordered by number of commits
    let raw_data;
    console.log('Retrieving metadata for table', argv.source + '...');
    let metadata = await activity.getMetadata();
    let start_time = moment();
    let end_time;
    // TODO: maybe worth implementing a local FS cache for these tables, since they dont change, and are on the order of dozens of MB in size
    console.log('Pulling in ' + metadata[0].numRows + ' rows (' + metadata[0].numBytes + ' bytes) from BigQuery, this may take a while...');
    try {
        raw_data = (await activity.getRows())[0];
        end_time = moment();
        console.log('... data retrieval complete in ' + end_time.from(start_time, true) + '. Beginning processing...');
    } catch (e) {
        console.error('Error retrieving source rows!', e);
        return 1;
    }
    start_time = moment();
    let map = {};
    let counter = 0;
    let missing_users = 0;
    for (let user of raw_data) {
        let login = user.login;
        let cached_user = cache[login];
        counter++;
        if (cached_user) {
            let company = cache[login][0];
            if (map[company]) map[company]++;
            else map[company] = 1;
        } else {
            missing_users++;
            continue;
        }
        if (counter % 10000 === 0) {
            end_time = moment();
            process.stdout.write('Processed ' + counter + ' users in ' + end_time.from(start_time, true) + '                     \r');
        }
    }
    end_time = moment();
    if (missing_users) {
        console.warn('WARNING! Found', missing_users, 'missing users from your DB cache. You likely need to run an incremental update (the `update-db` command)');
    }
    console.log('Processed ' + counter + ' users in ' + end_time.from(start_time, true));
    console.log('Sorting and organizing data...');
    // Create an array of company name and active user tuples, sorted by most number of active users
    // TODO: filter out universities and institutes and shit
    let sorted = Object.keys(map).map((co) => {
        return [co, map[co]]; // return company name / users active tuples, i.e. ['Adobe Systems', 300]
    }).filter((tuple) => {
        let company = tuple[0];
        return !companies.is_empty(company) && companies.is_corporation(company);
    }).sort((a, b) => {
        return b[1] - a[1]; // sort by most number of active contributors
    });
    let winners = [];
    if (argv.limit) {
        winners = sorted.slice(0, argv.limit);
    } else {
        let index = null;
        for (let i = 0; i < sorted.length; i++) {
            if (sorted[i][0] === 'Adobe Systems') {
                index = i;
                console.log('Found Adobe at position ' + (i + 1) + '!');
                break;
            }
        }
        winners = sorted.slice(0, index + 1);
    }
    console.log('------------');
    console.log(winners);
};
