SELECT "Data updated through champ #"||(SELECT MAX(champ_id) FROM champs) 'Longest streak by job'
;

SELECT
    (job_class || IIF(gender = 'Monster', "", " " || gender) || ": " || streak || "-time by " || GROUP_CONCAT(champ_id || ' (' || unit_name || ')', ', ')) '----- ----- ----- ----- ----- ----- ----- ----- ----- -----'
FROM (
    SELECT
        job_class, gender, streak, champ_id, unit_name,
        rank() OVER win AS rn
    FROM cunits
    WINDOW win AS (PARTITION BY job_class, gender ORDER BY streak DESC)
)
WHERE rn = 1
GROUP BY job_class, gender
ORDER BY IIF(gender = 'Monster', 2, 1), job_class, gender
;
