# BigQuery plan of attack

1. have a table in bigquery tracking user-company associations. columns would be: github username, company field, fingerprint (ETag value as reported from github, as a cache-buster)
2. pwn the github api to pull user info. can we just pull company info from username? remember to save github api etag as cache.
  a) keep track of rate limit headers in github responses ot make sure we dont cross the max

To start: work with temporary table in project that lists all active users with more than 3 pushes from Oct 2017.
