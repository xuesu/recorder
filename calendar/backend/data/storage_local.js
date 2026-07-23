//This code is mainly from dhtmlx
require("date-format-lite"); // add date format
var xssFilters = require('xss-filters');
var sqlite3 = require('sqlite3').verbose();
var fs = require('fs');
const path = require("path");
const scheduler = require("./scheduler_mini_recurring");
const MySimpleStorage = require("./mysimplestorage");
const MyUtils = require("./utils");


class EventsStorage extends MySimpleStorage {
	constructor(db, collection, params) {
		super(db, `
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
		);`,
			{
				"myevents": ["id", "name", "details", "is_finished", "score", "start_date", "end_date", "etype", "event_length", "event_pid", "rec_pattern", "rec_type"],
			},
			{
			},
			params);
		if (collection) {
			collection.forEach(item => {
				this.insert(item);
			});
		}
	}

	_insert_sql(item){
		// console.log("storagelocal.js: _update_sql", item);
		return super._insert_sql(item, "myevents");
	}

	_update_sql(item) {
		console.log("storagelocal.js: _update_sql", item);
		if (typeof item.score != "number") {
			if (item.score == undefined || item.score == "") item.score = 0;
			item.score = parseInt(item.score);//or throw Error directly?
		}
		return super._update_sql(item, "myevents");
	}

	_update_details_sql_via_id(eid, details_str) {
		return super._update_column_from_id_sql(eid, "details", details_str, "myevents");
	}

	_delete_by_id_sql(eid) {
		return super._delete_by_id_sql(eid, "myevents");
	}

	_delete_by_event_pid_sql(event_pid) {
		return super._delete_all_sql({"event_pid": event_pid}, "myevents");
	}

	_delete_by_name_sql(name) {
		return super._delete_all_sql({"name": name}, "myevents");
	}

	_query_name_sql(name) {
		return super._query_all_sql({"name": name}, undefined, "myevents");
	}

	_query_event_occur_exists_sql(event_pid, event_length) {
		return super._query_all_sql({"event_pid": event_pid, "event_length": event_length}, undefined, "myevents");
	}

	_query_all_sql() {
		return super._query_all_sql(undefined, undefined, "myevents");
	}

	_query_all_unfinished_plan_sql() {
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

	_query_score_now() {
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

	dhtml2db(data, _) {
		var item = super.dhtml2db(data, "myevents");
		console.log("storagelocal.js: dhtml2db", item);
		if ((item.is_finished == "false" || item.is_finished == false || item.is_finished == undefined) && ["PLAN", "FAILED_PLAN"].indexOf(item.etype) != -1) {
			item.is_finished = "false";
		} else {
			item.is_finished = "true";
			if (item.etype == "FAILED_PLAN") {
				item.etype = "PLAN";
			}
		}
		console.log("storagelocal.js: dhtml2db2", item);
		if (item.etype != "PLAN"){
			item["rec_pattern"] = item["rec_type"] = undefined;
		}
		// if(data.etype != "PLAN" && data.etype != "FAILED_PLAN"){
		// 	//we cleared the event_pid and event_length for FACT and SPENT
		// 	item.event_length = item.event_pid = undefined;
		// }
		if (item.details == undefined) item.details = "";
		for (let attribute_name in ["event_length", "event_pid", "score"]) {
			if (!Number.isInteger(item[attribute_name])) {
				if (item[attribute_name] == undefined || (typeof item[attribute_name] === "string" && item[attribute_name].trim().length == 0)) item[attribute_name] = undefined;
				else item[attribute_name] = parseInt(item[attribute_name]);
			}
		}
		if (item.score == undefined) {
			item.score = 0;
			if (item.name.indexOf("白噪") != -1 && item.etype == "SPENT") {
				item.score = -Math.max(0, (new Date(item.end_date).getTime() - new Date(item.start_date).getTime()) / 600000);
			}
		}

		return item;
	}

	db2dhtml(item) {
		var serialized = super.db2dhtml(item);
		serialized.text = xssFilters.inHTMLData(item.name);
		return serialized;
	}

	// get events from the table, use dynamic loading if parameters sent
	async getAll(params) {
		let selectFrom;
		let selectTo;
		if (params.from) {
			selectFrom = new Date(params.from);
		}
		if (params.to) {
			selectTo = new Date(params.to);
		}
		return this._query_all_sql().then((rows) => {
			const result = [];
			for (var i = 0; i < rows.length; i++) {
				const row = rows[i];
				const event = this.db2dhtml(row);
				if (selectFrom && event.end_date_dateobj < selectFrom) {
					continue;
				} if (selectTo && event.start_date_dateobj > selectTo) {
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
			return {
				action: "error",
				message: "Cannot getAll!"
			}
		});
	}

	async getStatistic(params) {
		//TODO: add timezoneshift
		let selectFrom;
		let selectTo;
		if (params.from) {
			selectFrom = new Date(params.from);
		}
		if (params.to) {
			selectTo = new Date(params.to);
		}
		return this._query_all_sql().then((rows) => {
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
				const event = this.db2dhtml(rows[i]);
				var is_planned = event.etype == "PLAN" || event.etype == "FAILED_PLAN";
				if (selectFrom && event.end_date_dateobj < selectFrom) {
					continue;
				} if (selectTo && event.start_date_dateobj > selectTo) {
					continue;
				}
				if (is_planned && event.end_date_dateobj <= date_now) {
					if (event.is_finished != "true" || event.etype == "FAILED_PLAN") {
						failedAll += 1;
						if (event.end_date_dateobj > date_yesterday && event.end_date_dateobj < date_tomorrow) {
							failedToday += 1;
						}
					}
				}
				if (event.is_finished == "true") {
					if (is_planned) { successAll = successAll + 1; }
					scoreNow += event.score;
					if (event.end_date_dateobj > date_yesterday && event.end_date_dateobj < date_tomorrow) {
						scoreToday += event.score;
						if (event.score < 0) spentToday += event.score;
						else earnedToday += event.score;
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
				action: "error",
				message: "Cannot getStatistic!"
			}
		});

	}

	async insert_dummy_copy(data) {
		if (data.id != undefined && data.id.indexOf("#") != -1) {
			scheduler.recover_ev_from_dummy_copy(data);
		}
		var this2 = this;
		return await this._query_event_occur_exists_sql(data.event_pid, data.event_length).then(
			rows => {
				if (rows.length > 0) {
					return {
						action: "query",
						tid: rows[0].id.toString(),
						item: rows[0],
					};
				} else {
					var item = this2.dhtml2db(data);
					return this2._insert_sql(item).then(
						(item) => {
							return {
								action: "inserted",
								tid: item.id.toString(),
								item: this2.db2dhtml(item),
							};
						}
					);
				}
			}
		);
	}

	// create new event
	async insert(data) {
		console.log("children storage_local.insert");
		if (data.id != undefined && String(data.id).indexOf("#") != -1) {
			return this.insert_dummy_copy(data);
		}
		return super.insert(data, "myevents");
	}

	// update event
	async update(id, data) {
		console.log("children storage_local.update");
		data.id = parseInt(id);
		data.name = xssFilters.inHTMLData(data.text);
		var item = this.dhtml2db(data);
		var this2 = this;
		return this._update_sql(item).catch((err) => {
			console.log('Error: ');
			console.error(err.message);
			console.error(err.stack);
			return {
				action: "error",
				message: "cannot update"
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
		return this._query_all_unfinished_plan_sql().then((rows) => {
			for (var i = 0; i < rows.length; i++) {
				const event = this.db2dhtml(rows[i]);
				if (event.end_date_dateobj < time_now) {
					event.etype = "FAILED_PLAN";
					promises.push(this.update(event.id, event));
				} else if (event.rec_type != undefined && event.rec_type.length > 0 && event.rec_type != 'none') {
					const event_occur = scheduler.mtrue_copy_series_event(event, date_provided, time_now);
					if (event_occur != null) {
						promises.push(this._query_event_occur_exists_sql(event_occur.event_pid, event_occur.event_length).then((rows) => {
							if (rows.length == 0) {
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
			return {
				action: "error",
				message: "cannot updateFailedPlan"
			}
		});
	}

	// delete event
	async delete(id) {
		await this._delete_by_id_sql(parseInt(id)).then((id) => this._delete_by_event_pid_sql(id));
		return {
			action: "deleted"
		}
	}

	static getExpensesName(date_txt_provided) {
		return "EXPENSES_" + date_txt_provided;
	}

	async refreshExpenses(date_txt_provided) {
		var date_provided = new Date(Date.parse(date_txt_provided));
		await this.updateFailedPlan(date_provided);
		date_txt_provided = MyUtils.localDateToFloatingTime(date_provided, false);

		var buf = "";
		var fpath = path.join(process.env["OneDriveConsumer"], "Account.csv");
		if (fs.existsSync(fpath)) {
			buf = fs.readFileSync(fpath, { encoding: 'utf8' });
		} else {
			return {
				action: "error",
				message: "cannot find account.csv"
			}
		}
		const lines = buf.split(/\r?\n/);
		var item = {
			score: 0,
			details: "",
			name: EventsStorage.getExpensesName(date_txt_provided),
			start_date: date_txt_provided + " 23:50",
			end_date: date_txt_provided + " 23:55",
			etype: "SPENT",
			is_finished: "true",
		};
		lines.forEach((line) => {
			var csv_cells = MyUtils.splitLine4CSV(line);
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
		let rows = await this._query_name_sql(item.name);
		if (rows.length == 0) {
			await this._insert_sql(item).catch((err) => {
				console.log('Error: ');
				console.error(err.message);
				console.error(err.stack);
				return {
					action: "error",
					message: "cannot insert in refreshExpenses"
				}
			});
		} else {
			item.id = rows[0].id;
			await this._update_sql(item).catch((err) => {
				console.log('Error: ');
				console.error(err.message);
				console.error(err.stack);
				return {
					action: "error",
					message: "cannot update in refreshExpenses"
				}
			});
		}
		return {
			action: "update",
		}
	}

	async updateDetails(eid, details_str) {
		eid = parseInt(eid);
		return this._update_details_sql_via_id(eid, details_str).catch((err) => {
			console.log('Error: ');
			console.error(err.message);
			console.error(err.stack);
			return {
				action: "error",
				message: "cannot updateDetails"
			}
		}).then((eid, details_str) => {
			return {
				action: "updated",
				id: eid,
			}
		});
	}
}

module.exports = EventsStorage;
