//This code is mainly from dhtmlx
require("date-format-lite"); // add date format
var xssFilters = require('xss-filters');
var sqlite3 = require('sqlite3').verbose();
var fs = require('fs');
const utils = require("./utils");
const scheduler = require("./scheduler_mini_recurring");


class Storage {
	constructor(db, collection, params) {
		this._db = db;
		this._db.run(`
		CREATE TABLE IF NOT EXISTS "myevents" (
			"id"	INTEGER PRIMARY KEY AUTOINCREMENT,
			"name"	TEXT NOT NULL,
			"details"	TEXT NOT NULL DEFAULT "",
			"is_finished"	TEXT NOT NULL DEFAULT "false",
			"score"	INTEGER NOT NULL DEFAULT 0,
			"start_date"	TEXT,
			"end_date"	TEXT,
			"etype"	TEXT NOT NULL DEFAULT "PLAN",
			"event_length"	INTEGER,
			"event_pid"	INTEGER,
			"rec_pattern"	TEXT,
			"rec_type"	TEXT
		);`);
		this._params = params || {};
		if (collection) {
			collection.forEach(item => {
				this.insert(item);
			});
		}
	}

	insert_sql(item) {
		return new Promise((resolve, reject) => this._db.run(
			`INSERT INTO myevents (name, details, is_finished, etype, score, start_date, end_date, event_length, event_pid, rec_pattern, rec_type)
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[item.name, item.details, item.is_finished, item.etype, item.score, item.start_date, item.end_date,
			item.event_length, item.event_pid, item.rec_pattern, item.rec_type],
			function (err) {
				if (err && err != null) {
					console.log('Error running insert_sql');
					console.log('Error: ');
					console.error(err.message);
					console.error(err.stack);
					reject(err)
				} else {
					item.id = this.lastID;
					resolve(item)
				}
			}
		))
	}

	update_sql(item) {
		if (typeof item.score != "number") {
			if (item.score == undefined || item.score == "") item.score = 0;
			item.score = parseInt(item.score);
		}

		return new Promise((resolve, reject) => this._db.run( 
			`UPDATE myevents
			SET name = ?,
			details = ?,
			is_finished = ?,
			etype = ?,
			score = ?,
			start_date = ?,
			end_date = ?, 
			event_length = ?, 
			event_pid = ?, 
			rec_pattern = ?, 
			rec_type = ?
			WHERE id = ?`,
			[item.name, item.details, item.is_finished, item.etype, item.score, item.start_date, item.end_date,
			item.event_length, item.event_pid, item.rec_pattern, item.rec_type, item.id],
			(err) => {
				if (err) {
					console.log('Error running update_sql');
					console.error(err.message);
					console.error(err.stack);
					reject(err)
				} else {
					resolve(item)
				}
			}
		))
	}

	
	update_details_sql(eid, details) {
		return new Promise((resolve, reject) => this._db.run( 
			`UPDATE myevents
			SET details = ?
			WHERE id = ?`,
			[details, eid],
			(err) => {
				if (err) {
					console.log('Error running update_sql');
					console.error(err.message);
					console.error(err.stack);
					reject(err)
				} else {
					resolve(eid, details)
				}
			}
		))
	}

	delete_by_id_sql(id) {
		return new Promise((resolve, reject) => this._db.run(
			`DELETE FROM myevents WHERE id = ?`,
			[id], (err) => {
				if (err) {
					console.log('Error running delete_by_id_sql');
					console.error(err.message);
					console.error(err.stack);
					reject(err)
				} else {
					resolve(id)
				}
			}
		))
	}

	delete_by_event_pid_sql(event_pid) {
		return new Promise((resolve, reject) => this._db.run(
			`DELETE FROM myevents WHERE event_pid = ?`,
			[event_pid], (err) => {
				if (err) {
					console.log('Error running delete_by_event_pid_sql');
					console.error(err.message);
					console.error(err.stack);
					reject(err)
				} else {
					resolve(event_pid)
				}
			}
		))
	}

	delete_by_name_sql(name) {
		return new Promise((resolve, reject) => this._db.run(
			`DELETE FROM myevents WHERE name = ?`,
			[name], (err) => {
				if (err) {
					console.log('Error running delete_by_name_sql');
					console.error(err.message);
					console.error(err.stack);
					reject(err)
				} else {
					resolve(name)
				}
			}
		))
	}

	query_name_sql(name) {
		return new Promise((resolve, reject) => this._db.all(
			`SELECT * FROM myevents where name=?`, [name], (err, rows) => {
				if (err) {
					console.log('Error running query_name_sql')
					console.error(err)
					reject(err)
				} else {
					resolve(rows);
				}
			}
		))
	}

	query_event_occur_exists_sql(event_pid, event_length) {
		return new Promise((resolve, reject) => this._db.all(
			`SELECT * FROM myevents where event_pid=? and event_length=?`, [event_pid, event_length], (err, rows) => {
				if (err) {
					console.log('Error running query_event_occur_exists_sql')
					console.error(err)
					reject(err)
				} else {
					resolve(rows);
				}
			}
		))
	}

	query_all_sql() {
		return new Promise((resolve, reject) => this._db.all(
			`SELECT * FROM myevents`, [], (err, rows) => {
				if (err) {
					console.log('Error running query_all')
					console.error(err)
					reject(err)
				} else {
					resolve(rows)
				}
			}
		))
	}

	query_all_unfinished_plan_sql() {
		return new Promise((resolve, reject) => this._db.all(
			`SELECT * FROM myevents Where is_finished == "false" and etype == "PLAN"`, [], (err, rows) => {
				if (err) {
					console.log('Error running query_all_unfinished_plan_sql')
					console.error(err)
					reject(err)
				} else {
					resolve(rows)
				}
			}
		))
	}


	query_score_now() {
		return new Promise((resolve, reject) => this._db.get(
			`select sum(score) from myevents;`, [], (err, ans) => {
				if (err) {
					console.log('Error running query_all')
					console.error(err)
					reject(err)
				} else {
					resolve(ans)
				}
			}
		))
	}


	dhtml2db(data) {
		if (typeof data.is_finished != "string") {
			if(data.is_finished == undefined)data.is_finished = "false";
			else data.is_finished = data.is_finished.toString();
		}
		var item = {
			"id": data.id,
			"name": data.text,
			"details": data.details,
			"is_finished": data.is_finished,
			"etype": data.etype,
			"start_date": data.start_date,
			"end_date": data.end_date,
			"event_length": data.event_length,
			"event_pid": data.event_pid,
			"rec_pattern": data.rec_pattern,
			"rec_type": data.rec_type,
		}
		if (data.is_finished == "false" && data.etype == "PLAN") {
			item.is_finished = "false";
		} else {
			item.is_finished = "true";
			if (data.etype == "FAILED_PLAN") {
				data.etype = "PLAN";
			}
		}
		if(data.etype != "PLAN" && data.etype != "FAILED_PLAN"){
			item.event_length = item.event_pid = undefined;
		}
		if(item.details == undefined)item.details = "";
		if (!Number.isInteger(data.event_length)) {
			if (data.event_length == undefined || data.event_length.trim().length == 0) item.event_length = undefined;
			else item.event_length = parseInt(data.event_length);
		}
		if (!Number.isInteger(data.event_pid)) {
			if (data.event_pid == undefined || data.event_pid.trim().length == 0) item.event_pid = undefined;
			else item.event_pid = parseInt(data.event_pid);
		}
		if (!Number.isInteger(data.score)) {
			if (data.score == undefined || data.score.trim().length == 0) {
				item.score = 0;
				if(item.name.indexOf("白噪") != -1 && item.etype == "SPENT" && item.event_pid == undefined){
					item.score = -Math.max(0, (data.end_date.date() - data.start_date.date())/600000);
				}
			}
			else item.score = parseInt(data.score);
		}
		if (Object.prototype.toString.call(item.start_date) === "[object Date]") {
			item.start_date = item.start_date.format("YYYY-MM-DD hh:mm");
		} 
		if (Object.prototype.toString.call(item.end_date) === "[object Date]") {
			item.end_date = item.end_date.format("YYYY-MM-DD hh:mm");
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
				if (serialized[i] == null) serialized[i] = "";
				else serialized[i] = serialized[i].toString();
			}
		}
		serialized.text = item.name;
		serialized.start_date = new Date(item.start_date); //recover to [object Date]
		serialized.end_date = new Date(item.end_date);
		serialized.is_finished = item.is_finished == "true";
		return serialized;
	}

	// get events from the table, use dynamic loading if parameters sent
	async getAll(params) {
		let selectFrom;
		let selectTo;
		if (params.from) {
			selectFrom = params.from.date();
		}
		if (params.to) {
			selectTo = params.to.date();
		}
		return this.query_all_sql().then((rows) => {
			const result = [];
			for (var i = 0; i < rows.length; i++) {
				const row = rows[i];
				const event = this.db2dhtml(row);
				if (selectFrom && event.end_date.date() < selectFrom) {
					continue;
				} if (selectTo && event.start_date.date() > selectTo) {
					continue;
				} else {
					result.push(event);
				}
			}

			if (this._params.objectResult || this._params.collections) {
				var res = {
					data: result
				};
				if (this._params.collections) {
					res.collections = this._params.collections
				};
				return res;
			} else {
				return result;
			}

		}).catch((err) => {
			console.log('Error: ');
			console.error(err.message);
			console.error(err.stack);
		});
	}

	async getStatistic(params) {
		let selectFrom;
		let selectTo;
		if (params.from) {
			selectFrom = params.from.date();
		}
		if (params.to) {
			selectTo = params.to.date();
		}
		return this.query_all_sql().then((rows) => {
			var scoreNow = 0;
			var scoreToday = 0;
			var spentToday = 0;
			var earnedToday = 0;
			var failedToday = 0;
			var successToday = 0;
			var failedAll = 0;
			var successAll = 0;
			let date_now = new Date();
			var date_yesterday = new Date();
			date_yesterday.setDate(date_now.getDate());
			date_yesterday.setHours(0);
			date_yesterday.setMinutes(0);
			date_yesterday.setSeconds(0);
			date_yesterday.setMilliseconds(0);
			var date_tomorrow = new Date(date_yesterday.valueOf() + 24 * 3600 * 1000);
			for (var i = 0; i < rows.length; i++) {
				const row = rows[i];
				row.is_finished = row.is_finished == "true";
				const start_date = row.start_date.date();
				const end_date = row.end_date.date();
				var is_planned = row.etype == "PLAN" || row.etype == "FAILED_PLAN";
				if (selectFrom && end_date < selectFrom) {
					continue;
				} if (selectTo && start_date > selectTo) {
					continue;
				}
				if (is_planned && end_date <= date_now) {
					if (!row.is_finished || row.etype == "FAILED_PLAN") {
						failedAll += 1;
						if (end_date > date_yesterday && end_date < date_tomorrow) {
							failedToday += 1;
						}
					}
				}
				if (row.is_finished) {
					if (is_planned) { successAll = successAll + 1; }
					scoreNow += row.score;
					if (end_date > date_yesterday && end_date < date_tomorrow) {
						scoreToday += row.score;
						if (row.score < 0) spentToday += row.score;
						else earnedToday += row.score;
						if (is_planned) {
							successToday += 1;
						}
					}
				}
			}
			return {
				"scoreNow": scoreNow,
				"scoreToday": scoreToday,
				"spentToday": spentToday,
				"earnedToday": earnedToday,
				"failedToday": failedToday,
				"successToday": successToday,
				"failedAll": failedAll,
				"successAll": successAll,
			}
		}).catch((err) => {
			console.log('Error: ');
			console.error(err.message);
			console.error(err.stack);
			return {
				action: "error"
			}
		});

	}

	insert_dummy_copy(data){
		if(data.id != undefined && data.id.indexOf("#") != -1){
			scheduler.recover_ev_from_dummy_copy(data);
		}
		var this2 = this;
		return this.query_event_occur_exists_sql(data.event_pid, data.event_length).then(
			rows=>{
				if(rows.length > 0){
					return resolve({
						action: "query",
						tid: rows[0].id.toString(),
						item: rows[0],
					});
				}else{
					var item = this2.dhtml2db(data);
					return resolve(this2.insert_sql(item).then(
						(item)=> {
							return resolve({
								action: "inserted",
								tid: item.id.toString(),
								item: this2.db2dhtml(item),
							});
						},
						(err)=>{
							console.log("cannot query_event_occur_exists_sql using ", data.event_pid, data.event_length);
							reject(err);
						}
						)
					);
				}
			}
		);
	}

	// create new event
	async insert(data) {
		if(data.id != undefined && String(data.id).indexOf("#") != -1){
			return this.insert_dummy_copy(data);
		}
		var item = this.dhtml2db(data);
		var this2 = this;
		return this.insert_sql(item).then(
			function (item) {
				return {
					action: "inserted",
					tid: item.id.toString(),
					item: this2.db2dhtml(item),
				}
			}).catch((err) => {
				console.log('Error: ');
				console.error(err.message);
				console.error(err.stack);
				return {
					action: "error"
				}
			});
	}
	


	// update event
	async update(id, data) {
		data.id = parseInt(id);
		data.name = data.text;
		var item = this.dhtml2db(data);
		var this2= this;
		return this.update_sql(item).catch((err) => {
			console.log('Error: ');
			console.error(err.message);
			console.error(err.stack);
			return {
				action: "error",
			}
		}).then((_) => {
			return {
				action: "updated",
				item: this2.db2dhtml(item),
			}
		});
	}

	async updateFailedPlan(date_provided) {
		date_provided.setHours(0);
		date_provided.setMinutes(0);
		date_provided.setSeconds(0);
		date_provided.setMilliseconds(0);
		var date_a_week_ago = new Date(date_provided.valueOf() - 6 * 24 * 3600 * 1000);
		scheduler._min_date = date_a_week_ago;
		var date_a_day_after = new Date(date_provided.valueOf() + 24 * 3600 * 1000);
		scheduler._max_date = date_a_day_after;
		var time_now = Date.now();
		var promises = [];
		return this.query_all_unfinished_plan_sql().then((rows) => {
			for (var i = 0; i < rows.length; i++) {
				const row = rows[i];
				const event = this.db2dhtml(row);
				if (event.end_date.valueOf() < time_now) {
					event.etype = "FAILED_PLAN";
					promises.push(this.update(event.id, event));
				} else if(event.rec_type != undefined && event.rec_type.length > 0 && event.rec_type != 'none'){
					const event_occur = scheduler.mtrue_copy_series_event(event, date_provided, time_now);
					if(event_occur != null){
						promises.push(this.query_event_occur_exists_sql(event_occur.event_pid, event_occur.event_length).then((rows)=>{
							if(rows.length == 0){
								event_occur.etype = "FAILED_PLAN";
								this.insert(event_occur);
							}
						}));
					}
				}
			}

		}).then((_) => {
			return Promise.all(promises);
		}).catch((err) => {
			console.log('Error: ');
			console.error(err.message);
			console.error(err.stack);
		});
	}

	// delete event
	async delete(id) {
		await this.delete_by_id_sql(parseInt(id)).then((id) => this.delete_by_event_pid_sql(id));
		return {
			action: "deleted"
		}
	}

	getExpensesName(date_txt_provided) {
		return "EXPENSES_" + date_txt_provided;
	}

	async refreshExpenses(date_txt_provided) {
		var date_provided = new Date(Date.parse(date_txt_provided));
		await this.updateFailedPlan(date_provided);
		date_txt_provided = date_provided.format("YYYY-MM-DD");
		
		var buf = "";
		var fpath = "C:\\Users\\iris\\OneDrive\\Documents\\Account.csv";
		if(fs.existsSync(fpath)){
			buf = fs.readFileSync(fpath, { encoding: 'utf8' });
		} else {
			fpath = "C:\\Users\\a\\OneDrive\\Documents\\Account.csv";
			buf = fs.readFileSync(fpath, { encoding: 'utf8' });
		}
		const lines = buf.split(/\r?\n/);
		var item = {
			score: 0,
			details: "",
			name: this.getExpensesName(date_txt_provided),
			start_date: date_txt_provided + " 23:50",
			end_date: date_txt_provided + " 23:55",
			etype: "SPENT",
			is_finished: "true",
		};
		lines.forEach((line) => {
			var csv_cells = utils.splitLine4CSV(line);
			if (csv_cells.length < 6) {
				if (line) console.log(line);
			} else {
				//the file format is fixed by my hand
				if (csv_cells[2].trim() == date_txt_provided) {
					item.details += line + "\n";
					var amount = parseFloat(csv_cells[0]);
					if (csv_cells[5] == "必要") {
					} else if (csv_cells[5] == "需要") {
						item.score += amount / 10;
					} else if (csv_cells[5] == "不需要") {
						item.score += amount / 5;
					} else if (csv_cells[5] == "失误") {
						item.score += amount;
					} else if (csv_cells[5] == "浪费") {
						item.score += amount;
					}
				}
			}
		});
		item.score = Math.round(item.score);
		let rows = await this.query_name_sql(item.name);
		if (rows.length == 0) {
			await this.insert_sql(item).catch((err) => {
				console.log('Error: ');
				console.error(err.message);
				console.error(err.stack);
			});
		} else {
			item.id = rows[0].id;
			await this.update_sql(item).catch((err) => {
				console.log('Error: ');
				console.error(err.message);
				console.error(err.stack);
			});
		}
		return {
			action: "update",
		}
	}

	async updateDetails(eid, details_str){
		eid = parseInt(eid);
		return this.update_details_sql(eid, details_str).catch((err) => {
			console.log('Error: ');
			console.error(err.message);
			console.error(err.stack);
			return {
				action: "error",
			}
		}).then((eid, details_str) => {
			return {
				action: "updated",
				id: eid,
			}
		});
	}
}

module.exports = Storage;
