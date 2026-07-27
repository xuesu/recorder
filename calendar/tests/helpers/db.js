const sqlite3 = require("sqlite3").verbose();

function createDb() {
	return new sqlite3.Database(":memory:");
}

module.exports = { createDb };
