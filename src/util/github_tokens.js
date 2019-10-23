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
const Octokit = require('@octokit/rest');

let tokens = [];
let limit_map = {};

module.exports.get_tokens = () => {
    return tokens;
};
module.exports.get_limit = async (token) => {
    let rate_limit_results = null;
    let octokit = new Octokit({
        auth: token
    });
    try {
        rate_limit_results = await octokit.rateLimit.get({});
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
        return 1;
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
    return false;
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
