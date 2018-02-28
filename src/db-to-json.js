var mysql = require('promise-mysql');

module.exports = async function (argv) {
    let conn = await mysql.createConnection({
        host: argv.dbServer,
        user: argv.dbUser,
        password: argv.dbPassword,
        database: argv.dbName,
        port: argv.dbPort
    });
    let results = await conn.query('SELECT 1');
    console.log(results);
    conn.end();
};
