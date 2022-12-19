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
		);`, 
		{
			"mynotes": ["id", "title", "content", "date_create", "is_pinned", "is_proj_note"],
		}, 
		{
			"note": "mynotes",
			"notes": "mynotes",
		},
		params);
	}
	
	async insert(table_name, data) {
		if(!(table_name in this.param_relations)){
			table_name = this.alias2table_name[table_name];
		}
		if(data["date_create"] == undefined || Object.prototype.toString.call(data["date_create"]) != "[object Date]"){
			data["date_create"] = new Date();
		}
		return await super.insert(table_name, data);
	}

	query_all_notes_by_title_sql(title, is_pinned){
		return new Promise((resolve, reject) => this._db.all(
			"SELECT * FROM mynotes where title = ? and is_pinned = ?", [title, is_pinned], (err, rows) => {
				if (err) {
					console.log('Error running query_all');
					console.error(err);
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
					console.error(err);
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
			console.error(err);
			return {
				action: "error"
			}
		});
	}

}

module.exports = StorageNote;
