# The Big Idea

Take the approach of ranking companies-as-contributors-to-public-GitHub [in this blog post](https://medium.freecodecamp.org/the-top-contributors-to-github-2017-be98ab854e87) and make it better. The user-to-company association in this blog post is poor at best. To make that association better, I want to cross-reference GitHub.com activity with GitHub.com user profiles, to pull the `company` field from user's profiles, which I think is a much better way to correlate github users to tech companies (better than the email associated to a `git` config, as the blog post uses).

## BigQuery plan of attack


1. have a table in bigquery tracking user-company associations. columns would be: github username, company field, fingerprint (ETag value as reported from github, as a cache-buster)
2. pwn the github api to pull user info. can we just pull company info from username? remember to save github api etag as cache.
  a) keep track of rate limit headers in github responses ot make sure we dont cross the max

To start: work with temporary table in project that lists all active users with more than 3 pushes from Oct 2017.

## Work In Progress Shtuff

- a `bigquery.json` file is needed in the root of the repo, which contains the auth credentials for access to Google Cloud BigQuery
- a `oauth.token` file is needed in the root of the repo, which contains GitHub.com personal access tokens, one per line, which we will use to get data from api.github.com
