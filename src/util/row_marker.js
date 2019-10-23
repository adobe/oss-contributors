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
        await fs.writeFile(FILENAME, String(mark));
    } catch (e) {
        console.error('Error writing row marker!', e);
        console.warn('The Row marker is', mark, '- save this yourself!');
    }
};

module.exports.delete = async () => {
    await fs.remove(FILENAME);
};
