const fs = require('fs-extra');
const octokit = require('@octokit/rest')();

let tokens = [];
let limit_map = {};

module.exports.get_tokens = () => {
    return tokens;
};
module.exports.get_limit = async (token) => {
    let rate_limit_results = null;
    octokit.authenticate({
        type: 'token',
        token: token
    });
    try {
        rate_limit_results = await octokit.misc.getRateLimit({});
    } catch (e) {
        console.error('Error retrieving rate limit', e);
        throw e;
    }
    return rate_limit_results.data.rate;
};

module.exports.refresh_limits = async (silent) => {
    if (!silent) console.log('Retrieving GitHub token rate limits...');
    for (let token of tokens) {
        limit_map[token] = await module.exports.get_limit(token);
    }
    if (!silent) console.log('...complete.');
};

module.exports.get_tokens_by_remaining_calls = async (silent) => {
    await module.exports.refresh_limits(silent);
    let limits = [];
    for (let key in limit_map) {
        limits.push({
            token: key,
            remaining: limit_map[key].remaining,
            reset: limit_map[key].reset
        });
    }
    limits.sort((a, b) => {
        if (a.remaining === b.remaining) return 0;
        else if (a.remaining > b.remaining) return -1;
        else return 1;
    });
    return limits;
};

module.exports.get_roomiest_token = async (silent) => {
    let limits = await module.exports.get_tokens_by_remaining_calls(silent);
    return limits[0];
};

module.exports.has_not_reached_api_limit = async (silent) => {
    let token = await module.exports.get_roomiest_token(silent);
    if (token.remaining > 0) return true;
    else return false;
};

module.exports.seed_tokens = async () => {
    try {
        const token_buffer = await fs.readFile('oauth.token');
        tokens = token_buffer.toString().trim().split('\n').map((line) => {
            return line.split('#')[0].trim();
        });
    } catch (e) {
        console.error('Error reading oauth token', e);
        throw e;
    }
};
