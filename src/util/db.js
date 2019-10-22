/*
Copyright 2019 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const mysql_sync = require('mysql');
const mysql_async = require('promise-mysql');
const moment = require('moment');
const fs = require('fs-extra');
const big_json = require('big-json');

module.exports = {
    connection: {
        sync: (argv) => {
            console.log('Creating new DB connection pool...');
            let db = mysql_sync.createPool({
                connectionLimit: 10,
                host: argv.dbServer,
                user: argv.dbUser,
                password: argv.dbPassword,
                database: argv.dbName,
                port: argv.dbPort
            });
            console.log('... established.');
            return db;
        },
        async: async (argv) => {
            console.log('Creating new DB connection pool...');
            let db = await mysql_async.createPool({
                connectionLimit: 10,
                host: argv.dbServer,
                user: argv.dbUser,
                password: argv.dbPassword,
                database: argv.dbName,
                port: argv.dbPort
            });
            console.log('... established.');
            return db;
        }
    },
    cache: {
        read: (argv) => {
            return new Promise((resolve, reject) => {
                let start = moment();
                let end = moment();
                console.log('Loading DB cache into memory...');
                let file = fs.createReadStream('db.json', {encoding: 'utf-8'});
                let json_parser = big_json.createParseStream();
                json_parser.on('data', (data) => {
                    end = moment();
                    console.log('... ' + Object.keys(data).length + ' records loaded in ' + end.from(start, true) + '.');
                    resolve(data);
                });
                json_parser.on('error', (err) => {
                    console.error('Error parsing JSON!', err);
                });
                file.pipe(json_parser).on('error', (err) => {
                    console.error('Error piping JSON!', err);
                }).on('finish', () => {
                    console.log('Piping JSON complete.');
                });
            });
        },
        write: async (argv, cache) => {
            let start = moment();
            console.log('Writing out DB cache to', argv.dbJson, '...');
            await fs.writeFile(argv.dbJson, JSON.stringify(cache));
            let end = moment();
            console.log('... completed in ' + end.from(start, true) + '.');
        }
    }
};
