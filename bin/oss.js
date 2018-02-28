#!/usr/bin/env node
const yargs = require('yargs');
const db_to_json = require('../src/db-to-json.js');
const update_db = require('../src/update-db.js');

yargs
    .command('db-to-json <output>', 'create a (huge) json blob of user-to-company associations based on database records', {
        output: {
            alias: 'o',
            demandOption: 'You must specify an output file to write to.',
            desc: 'Output file to write DB to (in JSON)'
        }
    }, db_to_json)
    .command('update-db <source> [db-json]', 'update user-to-company database based on source-table, optionally providing a db.json db cache (to speed things up)', {
        source: {
            alias: 's',
            demandOption: 'You must provide a BigQuery table name as a GitHub.com activity source!',
            desc: 'BigQuery table name housing GitHub.com activity data'
        },
        'db-json': {
            alias: 'j',
            demandOption: 'You must provide a db.json cache file.',
            desc: 'Local file storing GitHub username to company associations (with ETags), used to speed up processing'
        }
    }, update_db)
    .command('rank [limit]', 'show top companies based on number of active GitHubbers', {
        limit: {
            alias: 'l',
            desc: 'How many top companies to show?',
            default: null,
            defaultDescription: 'Shows up to and including Adobe'
        }
    }, db_to_json)
    .env('OSS')
    .option('db-server', {
        alias: 'd',
        default: 'leopardprdd',
        desc: 'Database server name'
    })
    .option('db-user', {
        alias: 'u',
        default: 'GHUSERCO',
        desc: 'Database username'
    })
    .option('db-password', {
        demandOption: 'You must provide a database password!',
        type: 'string'
    })
    .option('db-name', {
        alias: 'n',
        default: 'GHUSERCO',
        desc: 'Database name'
    })
    .option('table-name', {
        alias: 't',
        default: 'usercompany',
        desc: 'Database table name'
    })
    .option('db-port', {
        alias: 'p',
        default: 3323,
        desc: 'Database port'
    })
    .argv;
