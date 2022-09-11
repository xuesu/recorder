require("date-format-lite"); // add date format
const MySimpleStorage = require("./mysimplestorage");

class StorageNote extends MySimpleStorage{
	constructor(db, params) {
		super(db, `
		CREATE TABLE IF NOT EXISTS "mynotes" (
			"id"	INTEGER PRIMARY KEY AUTOINCREMENT,
			"title"	TEXT NOT NULL,
			"content"	TEXT NOT NULL,
			"date_create"	TEXT NOT NULL,
			"is_proj_note"	TEXT NOT NULL DEFAULT 'false', 
			"is_pinned"	TEXT NOT NULL DEFAULT 'false'
		);
		CREATE TABLE IF NOT EXISTS "mynotices" (
			"id"	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
			"date_show"	TEXT NOT NULL,
			"date_hide"	TEXT NOT NULL,
			"info_level"	INTEGER DEFAULT 0,
			"text"	TEXT NOT NULL
		);`, 
		{
			"mynotes": ["id", "title", "content", "date_create", "is_pinned", "is_proj_note"],
			"mynotices": ["id", "date_show", "date_hide", "info_level", "text"]
		}, 
		{
			"note": "mynotes",
			"notice": "mynotices",
		},
		params);
	}

	query_all_notes_by_title_sql(title, is_pinned){
		return new Promise((resolve, reject) => this._db.all(
			"SELECT * FROM mynotes where title = ? and is_pinned = ?", [title, is_pinned], (err, rows) => {
				if (err) {
					console.log('Error running query_all');
					console.log(err);
					reject(err)
				} else {
					resolve(rows)
				}
			}
		))
	}

	query_id_title_of_all_pinned_notes_sql() {
		return new Promise((resolve, reject) => this._db.all(
			`SELECT id,title FROM mynotes where is_pinned = 'true'`, [], (err, rows) => {
				if (err) {
					console.log('Error running query_id_title_of_all_pinned_notes_sql');
					console.log(err);
					reject(err)
				} else {
					resolve(rows)
				}
			}
		))
	}

	// get events from the table, use dynamic loading if parameters sent
	async getAllNoteTitleWithID(type_str) {
		if(type_str != "note"){
			throw new Error("Can only retrieve titles of note!");
		}
		return this.query_id_title_of_all_pinned_notes_sql().then((rows) => {
			return {
				data: rows
			};
		}).catch((err) => {
			console.log('Error: ');
			console.log(err);
		});
	}

}

module.exports = StorageNote;
