# Tracking Open Source Contributors [![Build Status](https://travis-ci.com/adobe/oss-contributors.svg?branch=master)](https://travis-ci.com/adobe/oss-contributors)

> Build a(n improved) ranking of companies-as-contributors-to-public-GitHub (based on [this blog post](https://medium.freecodecamp.org/the-top-contributors-to-github-2017-be98ab854e87)).

## Too Long; Didn't Read

Pretty graphs over [here](https://docs.google.com/spreadsheets/d/1EosxNv67tC2IYFY_RFeCoSY3JipiVfYyky9VejKAS9k/edit#gid=566883526).

## Why?

The user-to-company association in [the ranking blog post that inspired us](https://medium.freecodecamp.org/the-top-contributors-to-github-2017-be98ab854e87)
is not ideal: it uses the email associated to a `git` config, and if the domain
to the email is NOT of a public mail provider (gmail, yahoo, etc), it assumes it's
a company. That's not a great way of going about it because not many people use
their company's e-mail in the git config they use with their public GitHub.com account.

To make that association better, this project cross-reference GitHub.com activity,
which is tracked via [githubarchive.org](http://githubarchive.org) data (and is
[freely available as a dataset](https://www.githubarchive.org/#bigquery) in
[Google BigQuery](http://bigquery.cloud.google.com)) with
[GitHub.com](http://github.com) user profiles. We pull the `company` field
from user's profiles and store those in a periodically-updated (currently
monthly) database that we then copy over into BigQuery.

## Features

- Leverages [githubarchive.org](http://githubarchive.org)'s [freely available dataset on Google BigQuery](https://www.githubarchive.org/#bigquery)
  to track public user activity on GitHub.
- A GitHub.com REST API crawler that pulls users' company associations (based
  on their public profile), that we then store in a database (and periodically
  update).
- Tracking and visualizing GitHub contributors from tech companies' activity
  over time in a [spreadsheet](https://docs.google.com/spreadsheets/d/1EosxNv67tC2IYFY_RFeCoSY3JipiVfYyky9VejKAS9k/edit#gid=566883526).

## Implementation

We have a [BigQuery project](https://bigquery.cloud.google.com/dataset/public-github-adobe)
with relevant supporting tables and queries. If you'd like access, contact @filmaj
(via an issue in this repo or on twitter). This project contains:

1. A database table tracking user-company associations (currently done in an Adobe IT managed MySQL DB).
   Fields include GitHub username, company field, fingerprint (ETag value as
   reported from GitHub, as a cache-buster). We synchronize the MySQL DB with
   BigQuery every now and then using a command this program provides.
2. Another [table tracks GitHub usernames active over a certain time period](https://bigquery.cloud.google.com/table/public-github-adobe:github_archive_query_views.users_pushes_2017?pli=1).
    - We have one table, [`users_pushes_2017`](https://bigquery.cloud.google.com/table/public-github-adobe:github_archive_query_views.users_pushes_2017?pli=1),
      that we used as a baseline. This table tracked all GitHub users that had
      at least 1 commit in 2017.
    - We will [make incremental tables containing activity, for each passing month](https://bigquery.cloud.google.com/table/public-github-adobe:github_archive_query_views.users_pushes_2018_01?pli=1),
      and track how things progress.
3. For each active user identified in (2), we pound the GitHub REST API to pull
   user profile info, and drop the `company` field from that info into the DB
   table described in (1).

### How Are Companies Tracked?

Check out the [`src/util/companies.js`](src/util/companies.js) file. How it
works:

1. There is a "catch-all" regular expression (🤡) that tries to match on known
   tech company names.
2. If a match is detected, then we try to map that back to a nicer label for a
   company name. Note that multiple expressions from the company catch-all may
   map to a single company (e.g. AWS, AMZN and Amazon all map back to Amazon).

## TODO

1. Describe how to use bigquery in conjunction with this repo.
1. Real-time visualization of the data.
2. Tests.

## Requirements

- Node.js 9+
- a BigQuery account, and a `bigquery.json` file is needed in the root of the repo, which contains the
  credentials for access to Google Cloud BigQuery. More info on how to set this
  file up is available on [BigQuery
  docs](https://cloud.google.com/bigquery/docs/authentication/service-account-file).
- a `oauth.token` file is needed in the root of the repo, which contains GitHub.com
  personal access tokens, one per line, which we will use to get data from
  api.github.com. In my version of this file, I have several tokens (thanks to all
  my nice friends who graciously granted me one) as there is a maximum of 5,000 calls
  per hour to the GitHub REST API.
- a MySQL database to store user-company associations. Currently using an Adobe-IT-managed
  instance: hostname `leopardprdd`, database name, table name and username are all
  `GHUSERCO`, running on port 3323. @filmaj has the password. The schema for this
  table is under the [`usercompany.sql`](usercompany.sql) file.

## Doing The Thing

    $ npm install
    $ npm link

At this point you should be able to run the CLI and provide it subcommands:

### Updating MySQL DB of User-Company Affiliations

This command will pull the rows from a bigquery table containing github.com
usernames, pull user profile information for each user from the GitHub.com REST
API and store the result of the `company` field (and the `ETag`) in a MySQL DB
table.

    $ node bin/oss.js update-db <bigquery-table-of-user-activity>

Running this command and pointing it to a bigquery table containing ~1.5 million
github.com usernames, on last run (Feb 2018), took about 6 days.

### Uploading Results Back to BigQuery

This command will push the MysQL DB up to BigQuery.
This command will delete the table you specify before pushing up the results.

    $ node bin/oss.js db-to-bigquery <bigquery-table-of-user-company-affiliations>

On last run (Feb 2018), this command took a few minutes to complete.

# Putting It All Together

If you're still with me here: wow, thanks for sticking it out. How all of this
fits together:

1. Run the [incremental user activity query on BigQuery](db/githubarchive_incremental_active_users_query.sql), and store the result in a new table. I usually run this on a monthly basis, but you are free to use whatever time interval you wish.
2. Run this program's [`update-db`
   command](#updating-mysql-db-of-user-company-affiliations), specifying the
   bigquery table name you created in (1), to get the latest company
   affiliations for the users identified in (1) stored in your MySQL DB. This
   usually takes _days_. You have been warned.
3. Run this program's [`db-to-bigquery`
   command](#uploading-results-back-to-bigquery) to send these affiliations up
   to bigquery. Note that the table you specify to store these affiliations in,
   if it already exists, will be deleted. This should only take a few minutes.
4. Run the [contributor-count, repo-count and stars-accrued query on
   BigQuery](db/githubarchive_stars.sql), and store the result in a new table.
   This query will look at all github activity over the time period you specify
   (top of the query) and correlate it with the user-company affiliations table
   we created in (3). Make sure you use the correct table name for the
   user-company affiliations in the query (search for `JOIN`). BigQuery is
   awesome so this should never take more than a minute, though do keep an eye
   on your bill as, well, money goes fast ;)
5. Bask in sweet, sweet data.

# Contributing

Firstly, check out our [contribution guidelines](.github/CONTRIBUTING.md).
Secondly, there are probably way better ways of doing this! For example, I've
noticed that the company field info is somewhat available directly in BigQuery,
so probably the whole "use a MySQL DB" thing is dumb. I'm grateful for any help
🙏.
