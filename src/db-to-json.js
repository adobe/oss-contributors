let fs = require('fs');
let mysql = require('mysql');
let json_stream = require('JSONStream');
let transform_stream = require('stream-transform');

// Connects to mysql DB storing user-company associations and streams rows to be written as json
module.exports = function (argv) {
    console.log('Connecting to DB...');
    let conn = mysql.createConnection({
        host: argv.dbServer,
        user: argv.dbUser,
        password: argv.dbPassword,
        database: argv.dbName,
        port: argv.dbPort
    });
    conn.connect();
    let counter = 0;
    let row_transformer = transform_stream((data) => {
        // count results to give us a sense of progress...
        counter++;
        if (counter % 10000 === 0) {
            console.log('Processed', counter, 'rows...');
        }
        // must return an array with [key, data] as that is what stringifyObject accepts
        return [data.user, [data.company, data.fingerprint]];
    });
    console.log('Starting DB query stream...');
    conn.query('SELECT * FROM ' + argv.tableName)
        .stream({highWaterMark: 5})
        .pipe(row_transformer)
        .pipe(json_stream.stringifyObject('{\n', ',\n', '\n}\n'))
        .pipe(fs.createWriteStream(argv.output))
        .on('finish', () => {
            console.log('... complete. Closing DB connection.');
            conn.end();
        });
};
