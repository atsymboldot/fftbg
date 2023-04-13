CREATE TABLE IF NOT EXISTS tournaments (
    tournament_id INTEGER PRIMARY KEY,
    name TEXT,
    skill_drop TEXT,
    complete INTEGER,
    meme INTEGER,
    last_updated INTEGER,
    last_fetched INTEGER
);

CREATE TABLE IF NOT EXISTS tournament_maplists (
    tournament_id INTEGER,
    map_index INTEGER,
    map_name TEXT
);
CREATE INDEX IF NOT EXISTS tm_tournament_id_idx on tournament_maplists (tournament_id);

CREATE TABLE IF NOT EXISTS tournament_winners (
    tournament_id INTEGER,
    fight_number INTEGER,
    winner_name TEXT,
    loser_name TEXT
);
CREATE INDEX IF NOT EXISTS tw_tournament_id_idx on tournament_winners (tournament_id);

CREATE TABLE IF NOT EXISTS tournament_entrants (
    tournament_id INTEGER,
    entrant_index INTEGER,
    entrant_name TEXT
);
CREATE INDEX IF NOT EXISTS te_tournament_id_idx on tournament_entrants (tournament_id);

CREATE TABLE IF NOT EXISTS tournament_snubs (
    tournament_id INTEGER,
    snub_index INTEGER,
    snub_name TEXT
);
CREATE INDEX IF NOT EXISTS ts_tournament_id_idx on tournament_snubs (tournament_id);

CREATE TABLE IF NOT EXISTS tournament_units (
    tournament_id INTEGER,
    team_name TEXT,
    unit_index INTEGER,
    unit_id TEXT
);
CREATE INDEX IF NOT EXISTS tu_unit_id_idx on tournament_units (unit_id);
CREATE INDEX IF NOT EXISTS tu_tournament_id_idx on tournament_units (tournament_id);

CREATE TABLE IF NOT EXISTS units (
    unit_id TEXT PRIMARY KEY,
    unit_name TEXT,
    gender TEXT,
    zodiac_sign TEXT,
    brave INTEGER,
    faith INTEGER,
    job_class TEXT,
    action_skill TEXT,
    reaction_skill TEXT,
    support_skill TEXT,
    move_skill TEXT,
    mainhand_equip TEXT,
    offhand_equip TEXT,
    head_equip TEXT,
    armor_equip TEXT,
    accessory_equip TEXT
);
CREATE INDEX IF NOT EXISTS unit_name_idx ON units(unit_name);
CREATE INDEX IF NOT EXISTS job_class_idx ON units(job_class);
CREATE INDEX IF NOT EXISTS lower_unit_name_idx ON units(LOWER(unit_name));

CREATE TABLE IF NOT EXISTS unit_jobskills (
    unit_id TEXT,
    skill_type INTEGER,
    skill_index INTEGER,
    skill_name TEXT
);
CREATE INDEX IF NOT EXISTS unit_job_idx ON unit_jobskills (unit_id);

CREATE TABLE IF NOT EXISTS champs (
    champ_id INTEGER PRIMARY KEY,
    streak INTEGER,
    defeat INTEGER,
    season INTEGER,
    color TEXT
);

CREATE TABLE IF NOT EXISTS champ_units (
    champ_id INTEGER,
    unit_index INTEGER,
    unit_id TEXT
);
CREATE INDEX IF NOT EXISTS cu_champ_id_idx on champ_units (champ_id);
CREATE INDEX IF NOT EXISTS cu_unit_id_idx on champ_units (unit_id);

CREATE TABLE IF NOT EXISTS name_changes (
    old_name TEXT NOT NULL PRIMARY KEY,
    new_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inserts (
    timestamp INTEGER,
    tournament_id INTEGER,
    name TEXT,
    job TEXT,
    gender TEXT,
    include TEXT,
    exclude TEXT,
    altname TEXT
);
CREATE INDEX IF NOT EXISTS inserts_time_idx ON inserts (timestamp);
CREATE INDEX IF NOT EXISTS inserts_tid_idx ON inserts (tournament_id);

CREATE TABLE IF NOT EXISTS job_tags (
    job_class TEXT,
    tagset_id INTEGER,
    category TEXT
);

CREATE TABLE IF NOT EXISTS season_end (
    season INTEGER PRIMARY KEY,
    end INTEGER
);

CREATE VIEW IF NOT EXISTS cunits AS
SELECT
    *
FROM
    champs
    JOIN champ_units USING (champ_id)
    JOIN units USING (unit_id);

CREATE VIEW IF NOT EXISTS tunits AS
SELECT
    *
FROM
    tournaments
    JOIN tournament_units USING (tournament_id)
    JOIN units USING (unit_id)
WHERE
    team_name != 'champion'
    AND complete
    AND (NOT meme OR meme IS NULL);

CREATE VIEW IF NOT EXISTS toc AS
SELECT
    rn seed,
    season,
    streak,
    champ_id
FROM
    (
        SELECT
            row_number() OVER win AS rn,
            season,
            streak,
            champ_id
        FROM
            champs
        WINDOW win AS (PARTITION BY season ORDER BY streak DESC, champ_id)
    )
WHERE
    rn <= 8
    AND season < (SELECT MAX(season) FROM champs);

CREATE VIEW IF NOT EXISTS tcunits AS SELECT * FROM tournaments JOIN tournament_units USING (tournament_id) JOIN units USING (unit_id) WHERE complete
/* tcunits(tournament_id,name,skill_drop,complete,meme,last_updated,last_fetched,team_name,unit_index,unit_id,unit_name,gender,zodiac_sign,brave,faith,job_class,action_skill,reaction_skill,support_skill,move_skill,mainhand_equip,offhand_equip,head_equip,armor_equip,accessory_equip) */;
CREATE VIEW IF NOT EXISTS cunits_norm AS SELECT LOWER(IFNULL(new_name, unit_name)) AS name, cunits.* FROM cunits LEFT JOIN name_changes ON (LOWER(unit_name) = old_name)
/* cunits_norm(name,champ_id,streak,defeat,season,color,unit_index,unit_id,unit_name,gender,zodiac_sign,brave,faith,job_class,action_skill,reaction_skill,support_skill,move_skill,mainhand_equip,offhand_equip,head_equip,armor_equip,accessory_equip) */;
CREATE VIEW IF NOT EXISTS taunits AS SELECT * FROM tournaments JOIN tournament_units USING (tournament_id) JOIN units USING (unit_id) WHERE team_name != 'champion'
/* taunits(tournament_id,name,skill_drop,complete,meme,last_updated,last_fetched,team_name,unit_index,unit_id,unit_name,gender,zodiac_sign,brave,faith,job_class,action_skill,reaction_skill,support_skill,move_skill,mainhand_equip,offhand_equip,head_equip,armor_equip,accessory_equip) */;

CREATE VIEW IF NOT EXISTS tunits_champ AS SELECT * FROM tournaments JOIN tournament_units USING (tournament_id) JOIN units USING (unit_id) WHERE complete AND (NOT meme OR meme IS NULL)
/* tunits_champ(tournament_id,name,skill_drop,complete,meme,last_updated,last_fetched,team_name,unit_index,unit_id,unit_name,gender,zodiac_sign,brave,faith,job_class,action_skill,reaction_skill,support_skill,move_skill,mainhand_equip,offhand_equip,head_equip,armor_equip,accessory_equip) */;
CREATE VIEW IF NOT EXISTS tocproj AS SELECT rn seed, season, streak, champ_id FROM (SELECT row_number() OVER win AS rn, season, streak, champ_id FROM champs WINDOW win AS (PARTITION BY season ORDER BY streak DESC, champ_id)) WHERE rn <= 8
/* tocproj(seed,season,streak,champ_id) */;
CREATE VIEW IF NOT EXISTS ddstreak AS SELECT rn seed, season, streak, champ_id FROM (SELECT row_number() OVER win AS rn, season, streak, champ_id FROM champs WINDOW win AS (PARTITION BY season ORDER BY streak DESC, champ_id)) WHERE rn <= 8 OR streak >= 10
/* ddstreak(seed,season,streak,champ_id) */;
