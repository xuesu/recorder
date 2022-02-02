
var sqlite3 = require('sqlite3').verbose();

const Storage = require("./storage_local");
const StorageNote = require("./storage_note_local");
const StorageNoteExt = require("./storage_note_ext_local");

var setRoutes = (prefix, app, router) => {
	var db = new sqlite3.Database('recorder.db');
	var storage = new Storage(db);
	router.setRoutes(app, `${prefix}/events`, storage);
	router.setStatsRoutes(app, `${prefix}/events_stats`, storage);
	router.setExpensesRoutes(app, `${prefix}/expenses`, storage);
	var storageNote = new StorageNote(db);
	router.setNoteRoutes(app, `${prefix}/notes`, storageNote);
	router.setNoteRoutes(app, `${prefix}/notices`, storageNote);
	var storageNoteExt = new StorageNoteExt(storage, storageNote);
	router.setNoteExtRoutes(app, `${prefix}/monthplan`, storageNoteExt);
	router.setNoteExtRoutes(app, `${prefix}/weekplan`, storageNoteExt);
	router.setNoteExtRoutes(app, `${prefix}/dailycheck`, storageNoteExt);
};

module.exports = (app, router) => {
	// add listeners to basic CRUD requests
	setRoutes("/backend", app, router);
	setRoutes("/scheduler/backend", app, router);
};