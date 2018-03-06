#standardSQL
WITH
period AS (
  SELECT *
  FROM `githubarchive.month.201801` a # period to look at
),
repo_stars AS (
  SELECT repo.id, COUNT(DISTINCT actor.login) stars, APPROX_TOP_COUNT(repo.name, 1)[OFFSET(0)].value repo_name 
  FROM period
  WHERE type='WatchEvent'
  GROUP BY 1
  HAVING stars > 0 # only look at repos that had X new stars over the selected time period
), 
pushers_and_top_projects AS (
  SELECT * FROM (
    SELECT actor.id
      , APPROX_TOP_COUNT(actor.login,1)[OFFSET(0)].value login
      , COUNT(*) c
      , ARRAY_AGG(DISTINCT TO_JSON_STRING(STRUCT(b.repo_name,stars))) repos
    FROM period a
    JOIN repo_stars b
    ON a.repo.id = b.id
    WHERE type='PushEvent'
    GROUP BY 1
    HAVING c > 0 # ensure each contributor has at least X commits
  ) z
  JOIN `github_archive_query_views.users_companies` y # correlate against the table we generate based on our scraped GitHub results, stored in our own MySQL DB on adobe.corp
  ON z.login = y.user
)
SELECT * FROM (
  SELECT company
    , githubers
    , (SELECT COUNT(DISTINCT repo) FROM UNNEST(repos) repo) repos_contributed_to
    , ARRAY(
        SELECT AS STRUCT JSON_EXTRACT_SCALAR(repo, '$.repo_name') repo_name
        , CAST(JSON_EXTRACT_SCALAR(repo, '$.stars') AS INT64) stars
        , COUNT(*) githubers_from_company
        FROM UNNEST(repos) repo 
        GROUP BY 1, 2 
        HAVING githubers_from_company > 0 
        ORDER BY stars DESC LIMIT 5 # show top X repos with most stars
      ) top
    , (SELECT SUM(CAST(JSON_EXTRACT_SCALAR(repo, '$.stars') AS INT64)) FROM (SELECT DISTINCT repo FROM UNNEST(repos) repo)) sum_stars_projects_contributed_to
  FROM (
    SELECT company, COUNT(*) githubers, ARRAY_CONCAT_AGG(ARRAY(SELECT * FROM UNNEST(repos) repo)) repos
    FROM pushers_and_top_projects
    GROUP BY 1
    HAVING githubers > 0 # filter out companys with X or less contributors (see contributor defn above)
  )
)
ORDER BY githubers DESC # order by sheer number of unique contributors active. could also order by sum_stars_projects_contributed_to to rank based on accrued stars
