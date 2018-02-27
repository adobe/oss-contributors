const yargs = require('yargs');
yargs
    .command('db-to-json [output]', 'create a (huge) json blob of user-to-company associations based on database records', {
        output: {
            alias: 'o'
        }
    }, (argv) => {
    })
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
