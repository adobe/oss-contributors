#!/usr/bin/env node
const yargs = require('yargs');
const db_to_json = require('../src/db-to-json.js');

yargs
    .command('db-to-json [output]', 'create a (huge) json blob of user-to-company associations based on database records', {
        output: {
            alias: 'o'
        }
    }, db_to_json)
    .command('update-db --source source-table [--db-json db.json]', 'update user-to-company database based on source-table, optionally providing a db.json db cache (to speed things up)', {
        source: {
            alias: 's'
        },
        'db-json': {
            alias: 'd'
        }
    }, (argv) => {
    })
    .option('verbose', {
        alias: 'v',
        default: false
    })
    .argv;
