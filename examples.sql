/* All champ units for a player */
SELECT *
FROM cunits
WHERE LOWER(unit_name) = 'q99m'
ORDER BY champ_id;

/* Number of champ units for a player */
SELECT COUNT(1) ct
FROM cunits
WHERE LOWER(unit_name) = 'q99m';

/* Player's 10 most recent non-meme units for tournaments that completed successfully */
SELECT *
FROM tunits
WHERE LOWER(unit_name) = 'q99m'
ORDER BY tournament_id DESC LIMIT 10;

/* Number of champs each team color has in season 16 */
SELECT color, COUNT(1) ct
FROM champs
WHERE season = 16
GROUP BY color
ORDER BY ct DESC;

/* Champ units with 80+ brave manashield + movempup combo */
SELECT *
FROM cunits
WHERE brave >= 80 AND reaction_skill = 'Mana Shield' AND move_skill = 'Move-MP Up';

/* Non-meme 75+ faith units with both Holy and Dark Holy */
SELECT *
FROM tunits JOIN unit_jobskills USING (unit_id)
WHERE skill_name IN ('Holy', 'Dark Holy') AND faith >= 75
GROUP BY unit_id HAVING COUNT(1) = 2;

/* Champ units with dualwield stone guns */
SELECT *
FROM cunits
WHERE mainhand_equip = 'Stone Gun' AND offhand_equip = 'Stone Gun';

/* Champ teams with all 4 units having the same job class/monster type */
SELECT champ_id, job_class, COUNT(1) ct
FROM cunits
GROUP BY 1, 2 HAVING COUNT(1) = 4;

/* Rank jobs by sum-of-streak within a season (equivalent to !stats command in-stream) */
SELECT
    rank() OVER win AS rank,
    job_class,
    SUM(streak) times
FROM cunits
WHERE season = 16
GROUP BY job_class
WINDOW win AS (ORDER BY SUM(streak) DESC)
ORDER BY rank;

/* Players who have been to ToC at least 4 times (excluding current season) */
SELECT
  LOWER(unit_name) uname,
  COUNT(1) ct,
  GROUP_CONCAT("Season "||toc.season||" seed "||seed, ", ") info
FROM toc JOIN cunits USING (champ_id)
GROUP BY uname HAVING COUNT(1) >= 4
ORDER BY ct DESC;

