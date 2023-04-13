const util = require('./util.js');

const whitelist = [
    1636205326360 // clock error - this tournament actually took place between 1636136901467 and 1636168570048
];

function checkIdenticalUnits(u1, u2) {
    const attribs = [
        "unit_name",
        "gender",
        "zodiac_sign",
        "brave",
        "faith",
        "job_class",
        "action_skill",
        "reaction_skill",
        "support_skill",
        "move_skill",
        "mainhand_equip",
        "offhand_equip",
        "head_equip",
        "armor_equip",
        "accessory_equip",
    ];
    for (const attrib of attribs) {
        if (u1[attrib] != u2[attrib]) {
            return false;
        }
    }
    // TODO: also check job skills
    return true;
}

function checkIdenticalTeams(t1, t2) {
    if (t1.length != t2.length) return false;
    for (let i = 0; i < t1.length; i++) {
        if (!checkIdenticalUnits(t1[i], t2[i])) {
            return false;
        }
    }
    return true;
}

async function retrieveUnit(uid, db) {
    const unitSql = 'SELECT * FROM units WHERE unit_id = ?';
    const response = await db.get(unitSql, [uid]);
    // TODO: also retrieve job skills
    return response ? response : {};
}

async function retrieveChampTeam(cid, db) {
    const champUnitsSql = 'SELECT unit_id FROM champ_units WHERE champ_id = ? ORDER BY unit_index';
    const response = await db.all(champUnitsSql, [cid]);
    const team = [];
    for (const row of response) {
        team.push(await retrieveUnit(row.unit_id, db));
    }
    return team;
}

async function retrieveTournamentWinner(tid, db) {
    const tournamentWinnerSql = 'SELECT winner_name FROM tournament_winners WHERE fight_number = 7 AND tournament_id = ?';
    const response = await db.get(tournamentWinnerSql, [tid]);
    return response ? retrieveTournamentTeam(tid, response.winner_name, db) : null;
}

async function retrieveTournamentTeam(tid, color, db) {
    const tournamentUnitsSql = 'SELECT unit_id FROM tournament_units WHERE tournament_id = ? AND team_name = ? ORDER BY unit_index';
    const response = await db.all(tournamentUnitsSql, [tid, color]);
    const team = [];
    for (const row of response) {
        team.push(await retrieveUnit(row.unit_id, db));
    }
    return team;
}

async function retrieveTournamentIds(db) {
    const tournamentsSql = 'SELECT tournament_id FROM tournaments ORDER BY tournament_id';
    const response = await db.all(tournamentsSql);
    return response ? response.map(x => x.tournament_id) : [];
}

// Special events: not necessarily identifiable based on the units
async function isSpecialEvent(tid, db) {
    const events = {
        1674324341816: "ToC15",
        1674320613856: "ToC15 Preshow",
        1667003854785: "Halloween",
        1665856058438: "ToC14",
        1665850213032: "ToC14 Preshow",
        1657992116846: "ToC13",
        1657987362178: "ToC13 Preshow",
        1650734937613: "ToC12",
        1650730612086: "ToC12 Preshow",
        1642874578699: "ToC11",
        1642870909685: "ToC11 Preshow",
        1638641481262: "Preshow ToC (3-10)",
        1634404319022: "ToC10",
        1634400701466: "ToC10 Preshow",
        1628388509016: "MissingNo",
        1627751617900: "ToC9",
        1627747662561: "ToC9 Preshow",
        1625624800707: "MissingNo",
        1621707007044: "ToCoC (1-8)",
        1621703107641: "ToC8",
        1621699709977: "ToC8 Preshow",
        1615655671340: "ToC7",
        1615651608510: "ToC7 Preshow",
        1610213100670: "ToC6",
        1610209173029: "ToC6 Preshow",
        1604769408798: "ToC5",
        1604765554851: "ToC5 Preshow",
        1598717985739: "ToC4",
        1598713592655: "ToC4 Preshow",
        1592669987096: "ToC3",
        1592666702432: "ToC3 Preshow",
        1587226995760: "ToC2",
        1582392212189: "ToC1",
        1581967597519: "Dev", // https://discord.com/channels/665021428239958017/665021428889813043/679048115470204988 TheKillerNacho: "dont mind me, just trying to test things on dev and didnt realize i didnt have the dev override on"
    }
    if (tid in events) return events[tid];
    if (1585744390025 <= tid && tid <= 1585780690686) return "AprilFools";
    if (1617235707001 <= tid && tid <= 1617321943235) return "AprilFools";
    if (1648781004808 <= tid && tid <= 1648866569862) return "AprilFools";
    if (1680315359487 <= tid && tid <= 1680399981748) return "AprilFools";
    if (1635637509998 <= tid && tid <= 1635728806283) return "Halloween";
    if (1667183196105 <= tid && tid <= 1667266092999) return "Halloween";
    return false;
}

// Algus tournament: losers advance, so no team can win more than 1 match
async function isAlgus(tid, db) {
    const winnersSql = 'SELECT DISTINCT winner_name FROM tournament_winners WHERE tournament_id = ?';
    const response = await db.all(winnersSql, [tid]);
    return response.length == 8 ? "Algus" : false;
}

// Pokemon tournament: for all teams, unit 1 is guaranteed to be a Chemist with Beastmaster, and units 2, 3, and 4 are guaranteed to be monsters
async function isPokemon(tid, db) {
    const unitsSql = 'SELECT COUNT(1) count FROM tournament_units JOIN units USING (unit_id) WHERE ((unit_index = 0 AND job_class = "Chemist" AND support_skill = "Beastmaster") OR (unit_index > 0 AND gender = "Monster") OR (team_name = "champion")) AND tournament_id = ?';
    const response = await db.get(unitsSql, [tid]);
    return response.count >= 32 ? "Pokemon" : false;
}

// Blue Magic tournament: all units, regardless of class, have Blue Magic instead of normal job skills
async function isBlueMagic(tid, db) {
    const unitsSql = 'SELECT COUNT(1) count FROM tournament_units JOIN units USING (unit_id) JOIN unit_jobskills USING (unit_id) WHERE skill_type = 1 AND skill_name = "Blue Magic" AND tournament_id = ?';
    const response = await db.get(unitsSql, [tid]);
    return response.count >= 32 ? "BlueMagic" : false;
}

// Blue Mage tournament: all units are Calculators with Blue Magic (a subset of Blue Magic tournaments)
async function isBlueMageOnly(tid, db) {
    const unitsSql = 'SELECT COUNT(1) count FROM tournament_units JOIN units USING (unit_id) JOIN unit_jobskills USING (unit_id) WHERE job_class = "Calculator" AND skill_type = 1 AND skill_name = "Blue Magic" AND tournament_id = ?';
    const response = await db.get(unitsSql, [tid]);
    return response.count >= 32 ? "BlueMage" : false;
}

// Clone Wars tournament: each team has 4 copies of the same unit
async function isCloneWars(tid, db) {
    const unitsSql = 'SELECT COUNT(1) count FROM tournament_units tu1 JOIN tournament_units tu2 ON (tu1.tournament_id = tu2.tournament_id AND tu1.team_name = tu2.team_name) JOIN units u1 ON (tu1.unit_id = u1.unit_id) JOIN units u2 ON (tu2.unit_id = u2.unit_id) WHERE tu1.tournament_id = ? AND u1.unit_id != u2.unit_id AND (u1.job_class != u2.job_class OR u1.gender != u2.gender OR u1.brave != u2.brave OR u1.faith != u2.faith OR u1.zodiac_sign != u2.zodiac_sign) AND tu1.team_name != "champion"';
    const response = await db.get(unitsSql, [tid]);
    return response.count == 0 ? "CloneWars" : false;
}

// BirdUp tournament: all units are birds
async function isBirdUp(tid, db) {
    const unitsSql = 'SELECT COUNT(1) count FROM tournament_units JOIN units USING (unit_id) WHERE job_class IN ("Chocobo", "Black Chocobo", "Red Chocobo", "Juravis", "Iron Hawk", "Cockatrice") AND team_name != "champion" AND tournament_id = ?';
    const response = await db.get(unitsSql, [tid]);
    return response.count == 32 ? "Birb" : false;
}

// Goblin tournament: all units are goblins
async function isGoblin(tid, db) {
    const unitsSql = 'SELECT COUNT(1) count FROM tournament_units JOIN units USING (unit_id) WHERE job_class IN ("Goblin", "Black Goblin", "Gobbledeguck") AND team_name != "champion" AND tournament_id = ?';
    const response = await db.get(unitsSql, [tid]);
    return response.count == 32 ? "GobGob" : false;
}


// Internship tournament: all units are squires
async function isInternship(tid, db) {
    const unitsSql = 'SELECT COUNT(1) count FROM tournament_units JOIN units USING (unit_id) WHERE job_class = "Squire" AND team_name != "champion" AND tournament_id = ?';
    const response = await db.get(unitsSql, [tid]);
    return response.count == 32 ? "BasicTraining" : false;
}

// Mimicry tournament: first 2 units are mimes, last 2 units are casters/performers
async function isMimicry(tid, db) {
    const unitsSql = 'SELECT COUNT(1) count FROM tournament_units JOIN units USING (unit_id) WHERE ((job_class = "Mime" AND unit_index IN (0, 1)) OR (job_class IN ("Samurai", "Time Mage", "Wizard", "Priest", "Calculator", "Bard", "Dancer", "Oracle", "Summoner") AND unit_index IN (2, 3))) AND team_name != "champion" AND tournament_id = ?';
    const response = await db.get(unitsSql, [tid]);
    return response.count > 24 ? "MemeDream" : false;
}

// Halloween 2020: restricted set of monsters; all humans have Cursed Ring equipped
async function isHalloween2020(tid, db) {
    const unitsSql = 'SELECT COUNT(1) count FROM tournament_units JOIN units USING (unit_id) WHERE ((gender != "Monster" AND accessory_equip = "Cursed Ring") OR (gender = "Monster" AND job_class IN ("Coeurl", "Vampire", "Goblin", "Black Goblin", "Gobbledeguck", "Ghoul", "Ghost", "Revenant", "Skeleton", "Draugr", "Reaper", "Ultima Demon", "Archaic Demon", "Floating Eye", "Ahriman", "Plague", "Squidraken", "Mindflayer"))) AND team_name != "champion" AND tournament_id = ?';
    const response = await db.get(unitsSql, [tid]);
    return response.count == 32 ? "Halloween" : false;
}

// Pisco Clone: like Clone Wars, but the 4th unit is a Pisco Demon instead of a clone
async function isPiscoClone(tid, db) {
    const unitsSql = 'SELECT COUNT(1) count FROM tournament_units tu1 JOIN tournament_units tu2 ON (tu1.tournament_id = tu2.tournament_id AND tu1.team_name = tu2.team_name) JOIN units u1 ON (tu1.unit_id = u1.unit_id) JOIN units u2 ON (tu2.unit_id = u2.unit_id) WHERE tu1.tournament_id = ? AND u1.unit_id != u2.unit_id AND tu1.unit_index < 3 AND tu2.unit_index < 3 AND (u1.job_class != u2.job_class OR u1.gender != u2.gender OR u1.brave != u2.brave OR u1.faith != u2.faith OR u1.zodiac_sign != u2.zodiac_sign) AND tu1.team_name != "champion"';
    const response = await db.get(unitsSql, [tid]);
    const unitsSql2 = 'SELECT COUNT(1) count FROM tournament_units JOIN units USING (unit_id) WHERE tournament_id = ? AND unit_index = 3 AND team_name != "champion" AND job_class = "Pisco Demon"';
    const response2 = await db.get(unitsSql2, [tid]);
    return response.count == 0 && response2.count == 8 ? "PiscoClone" : false;
}

// Gun: all units have guns equipped
async function isGun(tid, db) {
    const unitsSql = 'SELECT COUNT(1) count FROM tournament_units JOIN units USING (unit_id) WHERE tournament_id = ? AND mainhand_equip IN ("Blast Gun", "Blaze Gun", "Glacier Gun", "Mythril Gun", "Romanda Gun", "Stone Gun") AND team_name != "champion"';
    const response = await db.get(unitsSql, [tid]);
    return response.count == 32 ? "Wick" : false;
}

async function findMemeAttributes(tid, db) {
    const attr = [];
    const specialEvent = await isSpecialEvent(tid, db);
    if (specialEvent) attr.push(specialEvent);
    if (await isAlgus(tid, db)) attr.push("Algus");
    if (await isPokemon(tid, db)) attr.push("Pokemon");
    if (await isBlueMageOnly(tid, db)) attr.push("BlueMage");
    else if (await isBlueMagic(tid, db)) attr.push("BlueMagic");
    if (await isGun(tid, db)) attr.push("Wick");
    if (await isCloneWars(tid, db)) attr.push("CloneWars");
    if (await isPiscoClone(tid, db)) attr.push("PiscoClone");
    if (await isBirdUp(tid, db)) attr.push("Birb");
    if (await isInternship(tid, db)) attr.push("BasicTraining");
    if (await isMimicry(tid, db)) attr.push("MemeDream");
    if (await isGoblin(tid, db)) attr.push("GobGob");
    else if (await isHalloween2020(tid, db)) attr.push("Halloween");
    if (attr.length == 0) attr.push("???");
    return attr;
}

async function markMemeTournaments(db) {
    const memeChamps = [];
    const clearMemeFlagSql = 'UPDATE tournaments SET meme = 0';
    await db.run(clearMemeFlagSql);
    const tids = await retrieveTournamentIds(db);
    let champId = 377; // tournaments were not persisted prior to champ 377
    let memeCount = 0;
    for (const tid of tids) {
        const tournamentChamp = await retrieveTournamentTeam(tid, "champion", db);
        const standardChamp = await retrieveChampTeam(champId, db);
        if (!checkIdenticalTeams(tournamentChamp, standardChamp)) {
            let newChampId = champId + 1;
            const newChamp = await retrieveChampTeam(newChampId, db);
            if (!checkIdenticalTeams(tournamentChamp, newChamp)) {
                if (newChamp.length == 0) {
                    console.log(`  INFO: ${tid} might be new/streaking champ, assuming non-meme until next champ ${newChampId} is available`);
                } else if (whitelist.includes(tid)) {
                    // console.log(`  INFO: ${tid} is whitelisted; not marking as meme`);
                } else {
                    const tournamentWinner = await retrieveTournamentWinner(tid, db);
                    ++memeCount;
                    const attr = await findMemeAttributes(tid, db);
                    util.log(`${new Date(tid).toISOString()}: https://fftbg.com/tournament/${tid} (${memeCount})`);
                    util.log(`    Characteristics: ${attr.join(', ')}`);
                    util.log(`    Defending champ: ${tournamentChamp.map(x => `${x.unit_name} the ${x.job_class}`).join(', ')}`);
                    util.log(`    Tourney winners: ${tournamentWinner ? tournamentWinner.map(x => `${x.unit_name} the ${x.job_class}`).join(', ') : '-'}`);
                    const memeSql = 'UPDATE tournaments SET meme = 1 WHERE tournament_id = ?';
                    await db.run(memeSql, tid);
                }
            } else {
                champId++;
            }
        }
    }
}

function outputHeader() {
    util.log("Meme types:");
    util.log("\t- Pokemon: Teams consist of a Chemist with Beastmaster and three monsters.");
    util.log("\t- CloneWars: All units are copies of the first unit on a team.");
    util.log("\t- BasicTraining: All units are Squires, and Squires can equip any type of weapon normally.");
    util.log("\t- BlueMagic: All units lack any primary skills, are more likely to get strong/rare rolls, and have a Blue Magic secondary - even Mimes.");
    util.log("\t- MemeDream: All teams consist of two Mimes with secondary skillsets and two units generated to be highly abuseable with Mimes.");
    util.log("\t- GobGob: All units are Goblin-family monsters.");
    util.log("\t- Halloween: All humans have Cursed Ring or are innate Undead, and only certain monsters are available. Also uses a custom Halloween-themed game patch with various changes.");
    util.log("\t- Birb: All units are Chocobo or Aevis family monsters.");
    util.log("\t- Algus: The loser of each match advances in the tournament instead of the winner. Betting is normal, and the Champion match is exempt from this.");
    util.log("\t- AprilFools: Several unit generation changes and uses a drastically modified game patch.");
    util.log("\t- Wick: All units have guns, and Mimes cannot be rolled.");
    util.log("\t- Preshow: Constructed team tournament governed by unique rules per season.");
    util.log("\t- BlueMage: All units are Calculators with Blue Magic. Deprecated: Replaced by BlueMagic.");
    util.log("\t- MissingNo: Each team is generated under a different meme rule. Deprecated.");
    util.log("\t- ToC: The top 8 teams of a season face off. Technically not a meme, as the champions are the reigning CoC (Champion of Champions) team, not the meme champions.");
    util.log("");
    util.log("");
}

(async () => {
    const db = await util.dbConnect();
    outputHeader();
    await markMemeTournaments(db);
    await db.close();
})();
