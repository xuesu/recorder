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
			"notes": "mynotes",
			"notices": "mynotices",
		},
		params);
	}

	async getAll(table_name, filter_params, extra_conditions) {
		if(!(table_name in this.param_relations)){
			table_name = this.alias2table_name[table_name];
		}
		var postprocess_filter_params = {};
		var need_postprocess = false;
		if(table_name == "mynotices"){
			for(const [param_name, param_value_set] of [["date_show", new Set(["beforenow", "afternow"])], ["date_hide", new Set(["beforenow", "afternow"])]]){
				if(param_name in filter_params && param_value_set.has(filter_params[param_name])){
					postprocess_filter_params[param_name] = filter_params[param_name];
					delete filter_params[param_name];
					need_postprocess = true;
				}
			}
		}
		var res = await super.getAll(table_name, filter_params, extra_conditions);
		if(!need_postprocess || res.action == "error")return res;
		var postitems = [];
		for(var item of res.data){
			var is_filtered = false;
			for(var param_name in postprocess_filter_params){
				var param_con = postprocess_filter_params[param_name];
				var param_value = item[param_name];
				if(param_con == "beforenow"){
					if(param_value != undefined && new Date(param_value) > new Date())is_filtered = true;
				}
				else if(param_con == "afternow"){
					if(param_value != undefined && new Date(param_value) < new Date())is_filtered = true;
				}
				else{
					console.error("Cannot understand postprocess param", param_name, param_con);
					return {
						action: "error",
						error: "Cannot understand postprocess param" + param_name + param_con
					}
				}
				if(is_filtered)break;
			}
			if(!is_filtered)postitems.push(item);
		}
		return {
			data: postitems,
			action: "query"
		};
	}
	
	async insert(table_name, data) {
		if(!(table_name in this.param_relations)){
			table_name = this.alias2table_name[table_name];
		}
		if(table_name == "mynotes"){
			if(data["date_create"] == undefined || Object.prototype.toString.call(data["date_create"]) != "[object Date]"){
				data["date_create"] = new Date();
			}
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
