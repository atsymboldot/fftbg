SELECT "Data updated through ToC "||(SELECT MAX(season) FROM toc) 'ToC appearances by gendered job class'
UNION ALL
SELECT '----- ----- ----- ----- ----- ----- ----- ----- ----- -----';

SELECT
    a.job_class 'Class', a.gender 'Gender', COUNT(t.champ_id) '#', GROUP_CONCAT(t.champ_id, ', ') 'Champ IDs'
FROM
    (SELECT job_class, gender FROM cunits GROUP BY 1, 2) a
    LEFT JOIN
    (toc t JOIN cunits u USING (champ_id)) USING (job_class, gender)
GROUP BY a.job_class, a.gender
ORDER BY IIF(a.gender = 'Monster', 2, 1), a.job_class, a.gender;
