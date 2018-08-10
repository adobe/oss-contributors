#standardSQL
WITH
period AS (
  SELECT *
  FROM (SELECT * FROM `githubarchive.month.201807`) a
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
  JOIN `github_archive_query_views.users_companies` y
  ON z.login = y.user
),
top_repos AS (
  SELECT ARRAY(
        SELECT AS STRUCT JSON_EXTRACT_SCALAR(repo, '$.repo_name') repo_name
        , CAST(JSON_EXTRACT_SCALAR(repo, '$.stars') AS INT64) stars
        , COUNT(*) githubers_from_company
        FROM UNNEST(repos) repo 
        GROUP BY 1, 2 
        HAVING githubers_from_company > 0 
        ORDER BY githubers_from_company DESC, stars DESC LIMIT 100 # show top X repos with most stars
      ) top
  FROM (
    SELECT company, COUNT(*) githubers, ARRAY_CONCAT_AGG(ARRAY(SELECT * FROM UNNEST(repos) repo)) repos
    FROM pushers_and_top_projects
    WHERE company = 'Adobe Systems'
    GROUP BY 1
    HAVING githubers > 0 # filter out companys with X or less contributors (see contributor defn above)
  )
)
SELECT top FROM top_repos,
UNNEST(top) top
ORDER BY top.githubers_from_company DESC, top.stars DESC
