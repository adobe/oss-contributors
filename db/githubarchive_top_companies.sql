SELECT company, count(user) as githubbers
FROM `githubarchive.stars_2018_q1`
WHERE company NOT LIKE '%freelance%' AND company <> '' AND company NOT LIKE '%none%' and company NOT LIKE '%student%' and company NOT LIKE '%university%' and company NOT LIKE '%n/a%' AND company <> '-' and company NOT LIKE '%self%' AND company NOT LIKE '%personal%' and company <> 'MIT' and company <> 'UC Berkeley' and company <> 'China' AND company NOT LIKE '%college%' and company <> 'private' and company <> 'no' and company <> 'UCLA' and company NOT LIKE '%independent%' and company <> 'SJTU' and company <> 'Virginia Tech' and company <> 'myself' and company NOT LIKE '%institute of tech%' and company <> 'Georgia Tech' and company <> 'UC Davis' and company <> 'NA' and company <> 'UCSD' and company <> 'UC San Diego' and company NOT LIKE '%individual%' and company <> 'japan' and company <> 'null'
GROUP BY company
ORDER BY githubbers DESC
