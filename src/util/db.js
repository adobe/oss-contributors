const mysql_sync = require('mysql');
const mysql_async = require('promise-mysql');
const moment = require('moment');
const fs = require('fs-extra');

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
            db.connect();
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
    cache: async (argv) => {
        let start = moment();
        console.log('Loading DB cache into memory...');
        let cache = JSON.parse(await fs.readFile(argv.dbJson));
        let end = moment();
        console.log('... ' + Object.keys(cache).length + ' records loaded in ' + end.from(start, true) + '.');
        return cache;
    }
};
