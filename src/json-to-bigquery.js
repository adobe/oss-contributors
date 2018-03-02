const fs = require('fs');
const json_stream = require('JSONStream');
const transform_stream = require('stream-transform');
const BigQuery = require('@google-cloud/bigquery');
const db = require('./util/db.js');

const PROJECT_ID = 'public-github-adobe';
const DATASET_ID = 'github_archive_query_views';
const TABLE_ID = 'users_companies';
const bigquery = new BigQuery({
    projectId: PROJECT_ID,
    keyFilename: 'bigquery.json'
});

// Connects to mysql DB storing user-company associations and streams rows to be written as json
module.exports = function (argv) {
    const dataset = bigquery.dataset(DATASET_ID);
    const table = dataset.table(TABLE_ID);
    fs.createReadStream(argv.input)
        .pipe(table.createWriteStream('json'))
        .on('complete', (job) => {
            
        });
};
