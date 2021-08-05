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

CREATE TABLE IF NOT EXISTS tournament_winners (
  tournament_id INTEGER,
  fight_number INTEGER,
  winner_name TEXT
);

CREATE TABLE IF NOT EXISTS tournament_entrants (
  tournament_id INTEGER,
  entrant_index INTEGER,
  entrant_name TEXT
);

CREATE TABLE IF NOT EXISTS tournament_snubs (
  tournament_id INTEGER,
  snub_index INTEGER,
  snub_name TEXT
);

CREATE TABLE IF NOT EXISTS tournament_units (
  tournament_id INTEGER,
  team_name TEXT,
  team_index INTEGER,
  unit_id TEXT
);

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

CREATE TABLE IF NOT EXISTS unit_jobskills (
  unit_id TEXT,
  skill_type INTEGER,
  skill_index INTEGER,
  skill_name TEXT
);

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