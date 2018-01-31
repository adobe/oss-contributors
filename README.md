# The Big Idea

Take the approach of ranking companies-as-contributors-to-public-GitHub [in this blog post](https://medium.freecodecamp.org/the-top-contributors-to-github-2017-be98ab854e87) and make it better.
The user-to-company association in this blog post is poor at best: it uses the email associated to a `git` config, and if the domain to the email is NOT of a public mail provider (gmail, yahoo, etc), it assumes its a company.
To make that association better, let's cross-reference GitHub.com activity, which is tracked via githubarchive.org data (and is freely available as a dataset in Google BigQuery), with GitHub.com user profiles, to pull the `company` field from user's profiles, which I think is a much better way to correlate github users to tech companies. That's what this project does.

## BigQuery plan of attack

1. have a table in bigquery tracking user-company associations. columns are: github username, company field, fingerprint (ETag value as reported from github, as a cache-buster)
2. another table tracks github usernames active over a certain time period. to start: all github users active in 2017.
3. pwn the github api to pull user info, and drop that info into the table in point 1.

## TODO

1. Assuming we have a table of user-company associations, what about periodically updating the table with new users? that gets tricky since we need to check if the table contains the user or not already. could maybe download the user-company table locally and load into RAM? need to think this through more. this seems viable as a local copy of the table should be less than 50MB.

## Requirements

- node 9+
- a `bigquery.json` file is needed in the root of the repo, which contains the auth credentials for access to Google Cloud BigQuery
- a `oauth.token` file is needed in the root of the repo, which contains GitHub.com personal access tokens, one per line, which we will use to get data from api.github.com

## Doing The Thing

    $ npm install
    $ node index.js
