const fs = require('fs-extra');
const FILENAME = 'row.marker';

module.exports.read = async () => {
    let row_marker = 0;
    try {
        row_marker = await fs.exists('row.marker');
    } catch (e) {
        console.error('Error reading row marker file', e);
        throw e;
    }
    if (row_marker) {
        row_marker = parseInt((await fs.readFile('row.marker')).toString().trim());
    } else {
        row_marker = 0;
    }
    return row_marker;
};
module.exports.write = async (mark) => {
    try {
        await fs.writeFile(FILENAME, '' + mark);
    } catch (e) {
        console.error('Error writing row marker!', e);
        console.warn('The Row marker is', mark, '- save this yourself!');
    }
};

module.exports.delete = async () => {
    await fs.remove(FILENAME);
};
