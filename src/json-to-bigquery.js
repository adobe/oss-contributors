const fs = require('fs');
const BigQuery = require('@google-cloud/bigquery');
const es = require('event-stream');
const prompt = require('async-prompt');

const PROJECT_ID = 'public-github-adobe';
const DATASET_ID = 'github_archive_query_views';
const bigquery = new BigQuery({
    projectId: PROJECT_ID,
    keyFilename: 'bigquery.json'
});

// Connects to mysql DB storing user-company associations and streams rows to be written as json
module.exports = async function (argv) {
    const TABLE_ID = argv.output;
    const dataset = bigquery.dataset(DATASET_ID);
    const table = dataset.table(TABLE_ID);
    let table_exists = (await table.exists())[0];
    if (table_exists) {
        let destroy = await prompt.confirm('The destination table in BigQuery already exists. Do you want to overwrite it? ');
        if (destroy) {
            console.log('Deleting table...');
            destroy = await table.destroy();
            console.log('... complete.', destroy);
            table_exists = false;
        } else {
            console.warn('Then ima bail! l8s');
            process.exit(1337);
        }
    }
    // TODO: create table with right schema
    let start = true;
    let end = true;
    fs.createReadStream(argv.input)
        .pipe(require('split')())
        .pipe(es.mapSync((data) => {
            if (data.length > 1) {
                let obj;
                try {
                    obj = JSON.parse('{' + (data[data.length - 1] === ',' ? data.slice(0, data.length - 1) : data) + '}');
                } catch (e) {
                    console.error('error parsing!', e, data);
                }
                let login = Object.keys(obj)[0];
                let company = obj[login][0];
                let item = {};
                item[login] = company;
                console.log(data);
                return JSON.stringify(item) + ',';
            } else {
                if (start) {
                    start = false;
                    console.log('opening bracket', data);
                    return '{';
                } else if (end) {
                    end = false;
                    console.log('closing bracket', data);
                    return '}';
                }
            }
        }))
        .pipe(table.createWriteStream('json'))
        .on('error', (e) => {
            console.error('Error!', e);
        })
        .on('complete', (job) => {
            console.log('All done!');
        });
};
