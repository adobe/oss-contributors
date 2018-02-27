#standardSQL
WITH
period AS (
  SELECT *
  FROM `githubarchive.month.201801` a # month to process specified here
)
    SELECT APPROX_TOP_COUNT(actor.login,1)[OFFSET(0)].value login
      , COUNT(*) pushes
    FROM period a
    WHERE type='PushEvent'
    GROUP BY actor.id
    HAVING pushes>1 # having pushed at least this many times
    ORDER BY pushes DESC
