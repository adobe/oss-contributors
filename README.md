# Tracking Open Source Contributors

> Build a(n improved) ranking of companies-as-contributors-to-public-GitHub (based on [this blog post](https://medium.freecodecamp.org/the-top-contributors-to-github-2017-be98ab854e87)).

The user-to-company association in [the ranking blog post that inspired us](https://medium.freecodecamp.org/the-top-contributors-to-github-2017-be98ab854e87)
is fairly poor: it uses the email associated to a `git` config, and if the domain
to the email is NOT of a public mail provider (gmail, yahoo, etc), it assumes it's
a company.

To make that association better, this project cross-reference GitHub.com activity,
which is tracked via [githubarchive.org](http://githubarchive.org) data (and is
[freely available as a dataset](https://www.githubarchive.org/#bigquery) in
[Google BigQuery](http://bigquery.cloud.google.com)), with
[GitHub.com](http://github.com) user profiles, to pull the `company` field
from user's profiles, which I think is a much better way to correlate GitHub users
to tech companies. That's what this project does.

## Features

- Leverages [githubarchive.org](http://githubarchive.org)'s [freely available dataset on Google BigQuery](https://www.githubarchive.org/#bigquery)
  to track public user activity on GitHub.
- A GitHub.com REST API crawler that pulls users' company associations (based
  on their public profile), that we then store in a database (and periodically
  update).
- Tracking and visualizing GitHub contributors from tech companies' activity
  over time.

## Implementation

We have a [BigQuery project](https://bigquery.cloud.google.com/dataset/public-github-adobe)
with relevant supporting tables and queries. If you'd like access, contact @maj
(on Slack at #guild-dev-experience, email, an issue here, whatever).

1. Have a [long-running table in BigQuery tracking user-company associations](https://bigquery.cloud.google.com/table/public-github-adobe:github_archive_query_views.user_to_company).
   Fields include GitHub username, company field, fingerprint (ETag value as
   reported from GitHub, as a cache-buster).
2. Another [table tracks GitHub usernames active over a certain time period](https://bigquery.cloud.google.com/table/public-github-adobe:github_archive_query_views.users_pushes_2017?pli=1).
   To start: all GitHub users active in 2017.
3. Pound the GitHub REST API to pull user info, and drop that info into the
   table in point 1.

## TODO

1. Assuming we have a table of user-company associations, what about periodically
   updating the table with new users? That gets tricky since we need to check if
   the table contains the user or not already. Could download the entire table
   first before starting updates (it is in the range of 50MB currently), then
   keep it in RAM during update runs.
  - according to bigquery docs, tables that have been inserted into recently
    will have a streaming data buffer that can hang around for a couple hours,
    and this prevents us from issuing `UPDATE` statements. So we need to run
    updates _first_, then inserts.
  - BigQuery docs say: "Maximum UPDATE/DELETE statements per day per table — 96"
    Ooof. That's low. Perhaps we should store GitHub user-to-company associations
    in our own database instead?
2. Real-time visualization of the data.

## Requirements

- Node.js 9+
- a `bigquery.json` file is needed in the root of the repo, which contains the
  credentials for access to Google Cloud BigQuery
- a `oauth.token` file is needed in the root of the repo, which contains GitHub.com
  personal access tokens, one per line, which we will use to get data from
  api.github.com

## Doing The Thing

    $ npm install
    $ node index.js
