const fs = require('fs');
const BigQuery = require('@google-cloud/bigquery');
const es = require('event-stream');
const prompt = require('async-prompt');
const moment = require('moment');
moment.relativeTimeThreshold('m', 55);
moment.relativeTimeThreshold('ss', 5);
moment.relativeTimeThreshold('s', 55);

// TODO: dont load bigquery up front, do so inside function. check other files for this too.
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
    let table = dataset.table(TABLE_ID);
    console.log('Checking BigQuery table...');
    let table_exists = (await table.exists())[0];
    if (table_exists) {
        let destroy = await prompt.confirm('The BigQuery destination table' + TABLE_ID + ' already exists. Do you want to overwrite it? ');
        if (destroy) {
            console.log('Deleting table...');
            await table.delete();
            console.log('... complete.');
        } else {
            console.warn('Then ima bail! l8s');
            process.exit(1337);
        }
    }
    console.log('Creating new table...');
    await dataset.createTable(TABLE_ID, {
        schema: 'user,company'
    });
    console.log('... complete.');
    table = dataset.table(TABLE_ID);
    let counter = 0;
    let start_time = moment();
    let end_time = moment();
    let json_transformer = (data) => {
        if (data.length > 1) {
            counter++;
            let obj;
            try {
                obj = JSON.parse('{' + (data[data.length - 1] === ',' ? data.slice(0, data.length - 1) : data) + '}');
            } catch (e) {
                console.error('error parsing!', e, data);
            }
            let user = Object.keys(obj)[0];
            let company = obj[user][0];
            let item = {
                user: user,
                company: company
            };
            end_time = moment();
            if (counter % 1000 === 0) {
                process.stdout.write((counter / 1000) + 'k JSONs munged in ' + end_time.from(start_time, true) + '                     \r');
            }
            return JSON.stringify(item) + '\n';
        }
    };
    let firehose = table.createWriteStream({
        sourceFormat: 'NEWLINE_DELIMITED_JSON'
    });
    firehose.on('error', (e) => {
        console.error('firehose error!', e);
    });
    firehose.on('complete', (job) => {
        end_time = moment();
        console.log('Firehose into BigQuery emptied in ' + end_time.from(start_time, true) + '! BigQuery Job details:', job.metadata.status.state, job.metadata.jobReference.jobId);
        console.log('Now we wait for the Job to finish...');
        job.on('complete', (job) => {
            console.log('BigQuery Job loaded', job.statistics.load.inputFileBytes, 'bytes yielding', job.statistics.load.outputRows, 'rows and', job.statistics.load.badRecords, 'bad records in', moment(parseInt(job.statistics.endTime)).from(moment(parseInt(job.statistics.startTime)), true));
        });
        job.on('error', (e) => { console.error('Job error', e); });
    });
    fs.createReadStream(argv.input)
        .pipe(require('split')())
        .pipe(es.mapSync(json_transformer))
        .pipe(firehose);
};
