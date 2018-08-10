#standardSQL
WITH
period AS (
  SELECT *
  FROM `githubarchive.month.201801` a # what period of time being queried
),
repo_stars AS (
  SELECT repo.id, COUNT(DISTINCT actor.login) stars, APPROX_TOP_COUNT(repo.name, 1)[OFFSET(0)].value repo_name 
  FROM period
  WHERE type='WatchEvent'
  GROUP BY 1
  HAVING stars > 0 # only look at repos that had X new stars over the selected time period
), 
pushers_and_projects AS (
  SELECT * FROM (
    SELECT actor.id
      , APPROX_TOP_COUNT(actor.login,1)[OFFSET(0)].value login
      , COUNT(*) c
      , b.repo_name 
      , APPROX_TOP_COUNT(b.stars,1)[OFFSET(0)].value stars
    FROM period a
    JOIN repo_stars b
    ON a.repo.id = b.id
    WHERE type='PushEvent'
    GROUP BY 1, b.repo_name
    HAVING c > 0 # ensure each contributor has at least X commits to each project
  ) z
  JOIN `github_archive_query_views.users_companies` y # this is our relational data containing user-co associations
  ON z.login = y.user
)
SELECT   login
       , SUM(c) as total_pushes
       , SUM(stars) as total_stars
       , ARRAY_AGG(DISTINCT TO_JSON_STRING(STRUCT(repo_name,stars,c as pushes))) # array-based sub-breakdown of different repos an individual has contributed to
FROM pushers_and_projects
WHERE company = 'Adobe Systems'
GROUP BY login
ORDER BY total_stars DESC, total_pushes DESC
