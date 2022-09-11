
var sqlite3 = require('sqlite3').verbose();

const Storage = require("./storage_local");
const StorageNote = require("./storage_note_local");
const StorageNoteExt = require("./storage_note_ext_local");
const StorageMemQuiz = require("../memquiz/storage_mementry");

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
	var db2 = new sqlite3.Database('C:\\Users\\a\\OneDrive\\reading\\kb.db');
	var storageMemQuiz = new StorageMemQuiz(db2);
	router.setMemQuizRoutes(app, `${prefix}/mementries`, storageMemQuiz);
	router.setMemQuizRoutes(app, `${prefix}/memgroups`, storageMemQuiz);
	router.setMemQuizRoutes(app, `${prefix}/membooks`, storageMemQuiz);
	router.setMemQuizRoutes(app, `${prefix}/memlectures`, storageMemQuiz);
	router.setMemQuizCSVImportRoutes(app, `${prefix}/mementries_import_by_csv`, storageMemQuiz);
};

module.exports = (app, router) => {
	// add listeners to basic CRUD requests
	setRoutes("/backend", app, router);
	setRoutes("/scheduler/backend", app, router);
};