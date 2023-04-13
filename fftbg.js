const fs = require('fs');

const util = require('./util.js');

const API_PAGE_SIZE = 1000;
const SCHEMA_PATH = 'schema.sql';

const tournamentsApi = `https://fftbg.com/api/tournaments?limit=${API_PAGE_SIZE}`;
const tournamentDetailsApi = 'https://fftbg.com/api/tournament/';

// TODO: this endpoint doesn't always get the last champ; when a new season
// starts, it is sometimes "stuck" showing the last champ of the ended season
const latestChampionApi = 'https://fftbg.com/api/champions/?limit=1&sort=latest';
//const latestChampionApi = 'https://fftbg.com/api/champions/16?limit=1&sort=latest'; // TODO remove constant season when accurate
const championDetailsApi = 'https://fftbg.com/api/champion/';

async function createTables(db) {
    const createSql = fs.readFileSync(SCHEMA_PATH, 'utf8').split(';');
    for (const stmt of createSql) {
        await db.exec(stmt);
    }
}

async function checkTournamentLastUpdate(tid, db) {
    const lastUpdateSql = 'SELECT last_updated FROM tournaments WHERE tournament_id = ?';
    const response = await db.get(lastUpdateSql, [tid]);
    return response ? response.last_updated : -1;
}

async function clearExistingData(tid, db) {
    const tournamentDeleteSql = 'DELETE FROM tournaments WHERE tournament_id = ?';
    const tournamentMapsDeleteSql = 'DELETE FROM tournament_maplists WHERE tournament_id = ?';
    const tournamentWinnersDeleteSql = 'DELETE FROM tournament_winners WHERE tournament_id = ?';
    await db.run(tournamentDeleteSql, tid);
    await db.run(tournamentMapsDeleteSql, tid);
    await db.run(tournamentWinnersDeleteSql, tid);
}

async function insertTournament(data, db) {
    await clearExistingData(data.ID, db);
    const tournamentSql = 'INSERT INTO tournaments (tournament_id, skill_drop, complete, last_updated, last_fetched) VALUES (?, ?, ?, ?, ?)';
    const tid = data.ID;
    const skill = data.SkillDrop;
    const complete = data.Complete ? 1 : 0;
    const lastUpdate = new Date(data.LastMod).valueOf();
    const lastFetch = 0;
    await db.run(tournamentSql, tid, skill, complete, lastUpdate, lastFetch);

    const tournamentMapsSql = 'INSERT INTO tournament_maplists (tournament_id, map_index, map_name) VALUES (?, ?, ?)';
    for (let i = 0; i < data.Maps.length; i++) {
        await db.run(tournamentMapsSql, tid, i, data.Maps[i]);
    }

    const tournamentWinnersSql = 'INSERT INTO tournament_winners (tournament_id, fight_number, winner_name) VALUES (?, ?, ?)';
    for (let i = 0; i < data.Winners.length; i++) {
        await db.run(tournamentWinnersSql, tid, i, data.Winners[i]);
    }
}

async function addTournament(tournament, db) {
    const lastUpdateApi = new Date(tournament.LastMod).valueOf();
    const lastUpdateDb = await checkTournamentLastUpdate(tournament.ID, db);

    if (lastUpdateApi == lastUpdateDb) {
        return false;
    }

    util.log(`    Populating summary data for tournament ${tournament.ID}`);
    await insertTournament(tournament, db);
    return true;
}

async function fetchTournamentSummaries(db) {
    let last = 0;
    for (let i = 0; last != -1; i++) {
        const fetchUrl = last == 0 ? tournamentsApi : `${tournamentsApi}&before=${last}`;
        const summaries = await util.fetchJson(fetchUrl);
        util.log(`  Fetch: ${fetchUrl} returned ${summaries.length} results.`);
        last = -1;
        for (const tournament of summaries) {
            await db.exec('BEGIN');
            const success = await addTournament(tournament, db);
            if (success) {
                last = tournament.ID;
            }
            await db.exec('COMMIT');
        }
    }
}

async function insertTournamentDetails(details, db) {
    const tournamentEntrantsSql = 'INSERT INTO tournament_entrants (tournament_id, entrant_index, entrant_name) VALUES (?, ?, ?)';
    for (let i = 0; i < details.Entrants.length; i++) {
        await db.run(tournamentEntrantsSql, details.ID, i, details.Entrants[i]);
    }
    const tournamentSnubsSql = 'INSERT INTO tournament_snubs (tournament_id, snub_index, snub_name) VALUES (?, ?, ?)';
    for (let i = 0; i < details.Snubs.length; i++) {
        await db.run(tournamentSnubsSql, details.ID, i, details.Snubs[i]);
    }
}

async function insertUnit(unitId, unit, db) {
    const unitsInsertSql = 'INSERT INTO units (unit_id, unit_name, gender, zodiac_sign, brave, faith, job_class, action_skill, reaction_skill, support_skill, move_skill, mainhand_equip, offhand_equip, head_equip, armor_equip, accessory_equip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    await db.run(unitsInsertSql, unitId, unit.Name, unit.Gender, unit.Sign, unit.Brave, unit.Faith, unit.Class, unit.ActionSkill, unit.ReactionSkill, unit.SupportSkill, unit.MoveSkill, unit.Mainhand, unit.Offhand, unit.Head, unit.Armor, unit.Accessory);
    const unitJobskillsInsertSql = 'INSERT INTO unit_jobskills (unit_id, skill_type, skill_index, skill_name) VALUES (?, ?, ?, ?)';
    for (let j = 0; j < unit.ClassSkills.length; j++) {
        await db.run(unitJobskillsInsertSql, unitId, 1, j, unit.ClassSkills[j]);
    }
    for (let j = 0; j < unit.ExtraSkills.length; j++) {
        await db.run(unitJobskillsInsertSql, unitId, 2, j, unit.ExtraSkills[j]);
    }
}

async function fetchTournamentDetails(db) {
    const tournamentsToFetchSql = 'SELECT tournament_id FROM tournaments WHERE tournament_id NOT IN (SELECT tournament_id FROM tournament_units)';
    const results = await db.all(tournamentsToFetchSql);
    util.log(`  Fetch: ${results.length} tournaments queued for update`);
    let doneCount = 0;
    for (const row of results) {
        await db.exec('BEGIN');
        const tid = row.tournament_id;
        const fetchUrl = `${tournamentDetailsApi}${tid}`;
        const details = await util.fetchJson(fetchUrl);
        await insertTournamentDetails(details, db);
        for (const team of Object.keys(details.Teams)) {
            for (let i = 0; i < details.Teams[team].Units.length; i++) {
                const unit = details.Teams[team].Units[i];
                const tournamentUnitsInsertSql = 'INSERT INTO tournament_units (tournament_id, team_name, unit_index, unit_id) VALUES (?, ?, ?, ?)';
                const unitId = `${tid}-${team}-${i}`;
                await db.run(tournamentUnitsInsertSql, tid, team, i, unitId);
                await insertUnit(unitId, unit, db);
            }
        }
        await db.exec('COMMIT');
        util.log(`    Finished tournament ${tid}; ${++doneCount} of ${results.length} complete`);
    }
    util.log(`  Fetch: ${results.length} complete`);
}

async function getLatestChampion(db) {
    const latestChampSql = 'SELECT MAX(champ_id) cid FROM champs';
    const result = await db.get(latestChampSql);
    return result ? result.cid : 0;
}

async function fetchLatestChampion() {
    const response = await util.fetchJson(latestChampionApi);
    return response[0].ID;
}

async function updateChampions(db) {
    const latestSavedChamp = await getLatestChampion(db);
    const latestChamp = await fetchLatestChampion();
    for (let i = latestSavedChamp + 1; i <= latestChamp; i++) {
        util.log(`  Fetch: Champ #${i} (up to ${latestChamp})`);
        const champ = await util.fetchJson(`${championDetailsApi}${i}`);
        const insertChampSql = 'INSERT INTO champs (champ_id, streak, defeat, season, color) VALUES (?, ?, ?, ?, ?)';
        await db.run(insertChampSql, champ.ID, champ.Streak, champ.Defeat, champ.Season, champ.Color);
        for (let j = 0; j < champ.Team.Units.length; j++) {
            const unit = champ.Team.Units[j];
            const unitId = `c${i}-champion-${j}`;
            const insertChampUnitSql = 'INSERT INTO champ_units (champ_id, unit_index, unit_id) VALUES (?, ?, ?)';
            await db.run(insertChampUnitSql, i, j, unitId);
            await insertUnit(unitId, unit, db);
        }
    }
}

(async () => {
    util.log('Initializing SQLite');
    const db = await util.dbConnect();
    await createTables(db);
    util.log('Fetching tournament summaries from API');
    await fetchTournamentSummaries(db);
    util.log('Fetching tournament details from API');
    await fetchTournamentDetails(db);
    util.log('Updating champions from API');
    await updateChampions(db);
    util.log('Updates complete, closing SQLite connection');
    await db.close();
})();
