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
                file.pipe(json_parser);
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
