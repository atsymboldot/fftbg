SELECT "Data updated through champ #"||(SELECT MAX(champ_id) FROM champs) 'Top 5 players for each class by champ count, gendered'
UNION ALL
SELECT '----- ----- ----- ----- ----- ----- ----- ----- ----- -----';

SELECT
    (job_class||gender||" #"||rn||": "||ct||" champ"||IIF(ct = 1, "", "s")||" by "||IIF(COUNT(1) <= 5, GROUP_CONCAT(unit_name, ', '), COUNT(1)||' different players')) "Most champs by class (human)"
FROM (
    SELECT
        unit_name,
        job_class,
        gender,
        ct,
        rank() OVER win AS rn
    FROM (
        SELECT
            IFNULL(new_name, LOWER(unit_name)) AS unit_name,
            job_class,
            gender,
            count(1) AS ct
        FROM
            units
            LEFT JOIN name_changes ON (LOWER(unit_name) = old_name)
        WHERE
            unit_id LIKE "c%"
            AND gender != 'Monster'
        GROUP BY 1, 2, 3
        ORDER BY 2, 3, 4 DESC
    )
    WINDOW win AS (PARTITION BY job_class, gender ORDER BY ct DESC)
)
WHERE rn <= 5
GROUP BY job_class, gender, rn
ORDER BY job_class, gender, rn
;
SELECT '----- ----- ----- ----- ----- ----- ----- ----- ----- -----' "End of most champs by class (human)";

SELECT
    (job_class||" #"||rn||": "||ct||" champ"||IIF(ct = 1, "", "s")||" by "||IIF(COUNT(1) <= 5, GROUP_CONCAT(unit_name, ', '), COUNT(1)||' different players')) "Most champs by class (monster)"
FROM (
    SELECT
        unit_name,
        job_class,
        ct,
        rank() OVER win AS rn
    FROM (
        SELECT
            IFNULL(new_name, LOWER(unit_name)) AS unit_name,
            job_class,
            count(1) AS ct
        FROM
            units
            LEFT JOIN name_changes ON (LOWER(unit_name) = old_name)
        WHERE
            unit_id LIKE "c%"
            AND gender = 'Monster'
        GROUP BY 1, 2
        ORDER BY 2, 3 DESC
    )
    WINDOW win AS (PARTITION BY job_class ORDER BY ct DESC)
)
WHERE rn <= 5
GROUP BY job_class, rn
ORDER BY job_class, rn
;
SELECT '----- ----- ----- ----- ----- ----- ----- ----- ----- -----' "End of most champs by class (monster)";
