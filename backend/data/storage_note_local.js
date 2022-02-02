require("date-format-lite"); // add date format
var xssFilters = require('xss-filters');
var sqlite3 = require('sqlite3').verbose();
var scheduler_mini = require('./scheduler_mini_recurring');

class StorageNote {
	constructor(db, collection, params) {
		this._db = db;
		this._db.run(`
		CREATE TABLE IF NOT EXISTS "mynotes" (
			"id"	INTEGER PRIMARY KEY AUTOINCREMENT,
			"title"	TEXT NOT NULL,
			"content"	TEXT NOT NULL,
			"date_create"	TEXT NOT NULL,
			"is_proj_note"	TEXT NOT NULL DEFAULT 'false', 
			"is_pinned"	TEXT NOT NULL DEFAULT 'false'
		);`);
		this._db.run(`
		CREATE TABLE IF NOT EXISTS "mynotices" (
			"id"	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
			"date_show"	TEXT NOT NULL,
			"date_hide"	TEXT NOT NULL,
			"info_level"	INTEGER DEFAULT 0,
			"text"	TEXT NOT NULL
		);`);
		this._params = params || {};
		this.param_relations = {
			"note": ["id", "title", "content", "date_create", "is_pinned", "is_proj_note"],
			"notice": ["id", "date_show", "date_hide", "info_level", "text"]
		};
		if (collection) {
			collection.forEach(item => {
				this.insert(item);
			});
		}
	}

	dhtml2db(type_str, data) {
		var params_related = this.param_relations[type_str];
		var item = {};
		for(var i = 0;i < params_related.length;i+=1){
			var param_name = params_related[i];
			var param_value = data[param_name];
			if(param_name.startsWith("is_")){
				if(typeof param_value != "string"){
					param_value = param_value.toString();
				}
				param_value = param_value.toLowerCase();
				if(param_value == "1" || param_value == "true"){
					param_value = "true";
				}else{
					param_value = "false";
				}
			}
			else if(param_name.startsWith("date_")){
				if(param_value == undefined){
					param_value = new Date().format("YYYY-MM-DD hh:mm");
				}else if(Object.prototype.toString.call(param_value) === "[object Date]"){
					param_value = param_value.format("YYYY-MM-DD hh:mm");
				}
			}
			item[param_name] = param_value;
		}
		return item;
	}
	
	db2dhtml(item) {
		var serialized = Object.assign({}, item);
		for (let i in serialized) {
			if (Object.prototype.toString.call(serialized[i]) === "[object Date]") {
				serialized[i] = serialized[i].format("YYYY-MM-DD hh:mm");
			} else if (typeof serialized[i] === "string") {
				serialized[i] = xssFilters.inHTMLData(serialized[i]);
			} else {
				if(serialized[i] == null)serialized[i] = "";
				else serialized[i] = serialized[i].toString();
			}
		}
		return serialized;
	}
	

	insert_sql(type_str, item) {
		var params_related_without_id = this.param_relations[type_str].slice(1);
		var item_arr = [];
		for(var i = 0;i < params_related_without_id.length; i+=1){
			item_arr.push(item[params_related_without_id[i]]);
		}
		return new Promise((resolve, reject) => this._db.run(
			"INSERT INTO my" + type_str  + "s (" + params_related_without_id.join(",") 
			+ " )VALUES ( " + "?,".repeat(params_related_without_id.length - 1) +  " ?)",
			item_arr,
			function (err) {
				if (err && err != null) {
					console.log('Error running insert_sql');
					console.log(err);
					reject(err)
				} else {
					item.id = this.lastID;
					resolve(item)
				}
			}
		))
	}

	update_sql(type_str, item) {
		var params_related_without_id = this.param_relations[type_str].slice(1);
		var item_arr = [];
		var set_str_parts = [];
		for(var i = 0;i < params_related_without_id.length; i+=1){
			if(i > 0)set_str_parts.push(" , ");
			set_str_parts.push(params_related_without_id[i] + " = ? ");
			item_arr.push(item[params_related_without_id[i]]);
		}
		item_arr.push(item.id);
		return new Promise((resolve, reject) => this._db.run(
			"UPDATE my" + type_str + "s SET " + set_str_parts.join('') + " WHERE id = ?",
			item_arr,
			(err) => {
				if (err) {
					console.log('Error running update_sql');
					console.log(err);
					reject(err)
				} else {
					resolve(item)
				}
			}
		))
	}

	delete_by_id_sql(type_str, id) {
		return new Promise((resolve, reject) => this._db.run(
			"DELETE FROM my" + type_str + "s WHERE id = ?",
			[id], (err) => {
				if (err) {
					console.log('Error running delete_by_id_sql');
					console.log(err);
					reject(err)
				} else {
					resolve(id)
				}
			}
		))
	}

	query_one_by_id_sql(type_str, id) {
		return new Promise((resolve, reject) => this._db.all(
			"SELECT * FROM my" + type_str + "s where id = ?", [id], (err, rows) => {
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


	query_all_sql(type_str) {
		return new Promise((resolve, reject) => this._db.all(
			"SELECT * FROM my" + type_str + "s", [], (err, rows) => {
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
	async getOneByID(type_str, id) {
		return this.query_one_by_id_sql(type_str, id).then((rows) => {
			if(rows.length == 0){
				return {
					"error": "Unable find " + type_str + " by id: " + id,
				};
			}else{
				return {
					"data": this.db2dhtml(rows[0]),
				};
			}
		}).catch((err) => {
			console.log('Error: ')
			console.log(JSON.stringify(err))
		});
	}

	// get events from the table, use dynamic loading if parameters sent
	async getAll(type_str) {
		return this.query_all_sql(type_str).then((rows) => {
			const result = [];
			var date_now = new Date();
			for (var i = 0; i < rows.length; i++) {
				const row = rows[i];
				if(type_str == "notice" && new Date(row.date_hide) < date_now){
					continue;
				}
				const event = this.db2dhtml(row);
				result.push(event);
			}
			var res = {
				data: result
			};
			return res;
		}).catch((err) => {
			console.log('Error: ');
			console.log(JSON.stringify(err));
		});
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
			console.log(JSON.stringify(err));
		});
	}


	// create new event
	async insert(type_str, data) {
		var item = this.dhtml2db(type_str, data);
		return this.insert_sql(type_str, item).then(
			function (item) {
				return {
					action: "inserted",
					tid: item.id.toString(),
				}
			}).catch((err) => {
				console.log('Error: ');
				console.log(err.message);
				console.log(err.stack);
				return {
					action: "error"
				}
			});
	}

	// update event
	async update(type_str, id, data) {
		data.id = parseInt(id);
		data = this.dhtml2db(type_str, data);
		var iserr = false;
		await this.update_sql(type_str, data).catch((err) => {
			console.log('Error: ')
			console.log(JSON.stringify(err));
			iserr = true;
		});
		if(iserr){
			return {
				action: "error",
			}
		}else {
			return {
				action: "updated"
			}
		}
	}

	// delete event
	async delete(type_str, id) {
		await this.delete_by_id_sql(type_str, parseInt(id));
		return {
			action: "deleted"
		}
	}

}

module.exports = StorageNote;
