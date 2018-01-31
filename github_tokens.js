const fs = require('fs-extra');

module.exports.get = async () => {
    let tokens = [];
    try {
        const token_buffer = await fs.readFile('oauth.token');
        tokens = token_buffer.toString().trim().split('\n');
    } catch (e) {
        console.error('Error reading oauth token', e);
        throw e;
    }
    return tokens;
};
