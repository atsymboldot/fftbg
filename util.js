const fetch = require('node-fetch');
const sqlite3 = require('sqlite3');
const sqlite = require('sqlite');

const LOG_ENABLED = true;
const DATABASE_PATH = 'fftbg.db';
const FETCH_DELAY = 100; // milliseconds; delay to prevent request spamming

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function log(s) {
    if (LOG_ENABLED) {
        console.error(s);
    }
}

async function fetchJson(url) {
    await sleep(FETCH_DELAY);
    return (await fetch(url)).json();
}

async function dbConnect(path) {
    const effectivePath = path ? path : DATABASE_PATH;
    return sqlite.open({
        filename: effectivePath,
        driver: sqlite3.Database
    });
}

module.exports = {
    sleep,
    log,
    fetchJson,
    dbConnect,
};
