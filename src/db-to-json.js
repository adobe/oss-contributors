let fs = require('fs');
let json_stream = require('JSONStream');
let transform_stream = require('stream-transform');
let db = require('./util/db.js');

// Connects to mysql DB storing user-company associations and streams rows to be written as json
module.exports = function (argv) {
    let conn = db.connection.sync(); // sync db module has streaming API, promise based one does not
    let counter = 0;
    let row_transformer = transform_stream((data) => {
        // count results to give us a sense of progress...
        counter++;
        if (counter % 10000 === 0) {
            console.log('DB-TO-JSON: Processed', counter, 'rows...');
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
        })
        .on('error', (err) => {
            console.error('ERROR!', err);
            console.error('Closing connection and aborting.');
            conn.end();
        });
};
