const row_module = require('./row_marker.js');

let is_saving = false;
module.exports.is_saving = () => is_saving;
module.exports.save_rows_to_bigquery = async (target_table, row_marker, new_rows, bomb) => {
    is_saving = true;
    let insert_op = null;
    try {
        insert_op = await target_table.insert(new_rows);
    } catch (e) {
        console.error('Error inserting rows! Oh no!', e);
        throw e;
    }
    console.log('', new_rows.length, 'user-company records saved to BigQuery!', insert_op);
    // save our row marker to disk
    await row_module.write(row_marker);
    is_saving = false;
    if (bomb) process.exit(0);
};
