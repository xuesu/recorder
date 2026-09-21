//This code is mainly from dhtmlx
require("date-format-lite"); // add date format
var xssFilters = require('xss-filters');
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
			collection.forEach(serialized => {
				this.insert(serialized);
			});
		}
	}

	_insert_sql(item) {
		return super._insert_sql(item, "myevents");
	}

	_update_sql(item) {
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
		return super._delete_all_sql({ "event_pid": event_pid }, undefined, "myevents");
	}

	_delete_by_name_sql(name) {
		return super._delete_all_sql({ "name": name }, undefined, "myevents");
	}

	_query_name_sql(name) {
		return super._query_all_sql({ "name": name }, undefined, "myevents");
	}

	_query_event_occur_exists_sql(event_pid, event_length) {
		return super._query_all_sql({ "event_pid": event_pid, "event_length": event_length }, undefined, "myevents");
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

	dhtml2db(serialized, _) {
		var item = super.dhtml2db(serialized, "myevents");
		item.name = xssFilters.inHTMLData(serialized.text);
		if ((item.is_finished == "false" || item.is_finished == false || item.is_finished == undefined) && ["PLAN", "FAILED_PLAN"].indexOf(item.etype) != -1) {
			item.is_finished = "false";
		} else {
			item.is_finished = "true";
			if (item.etype == "FAILED_PLAN") {
				item.etype = "PLAN";
			}
		}
		if (item.etype != "PLAN") {
			item["rec_pattern"] = item["rec_type"] = undefined;
		}
		// if(serialized.etype != "PLAN" && serialized.etype != "FAILED_PLAN"){
		// 	//we cleared the event_pid and event_length for FACT and SPENT
		// 	item.event_length = item.event_pid = undefined;
		// }
		if (item.details == undefined) item.details = "";
		for (let attribute_name of ["event_length", "event_pid", "score"]) {
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
			const events_serialized = [];
			for (var i = 0; i < rows.length; i++) {
				const row = rows[i];
				const event_serialized = this.db2dhtml(row);
				if (selectFrom && event_serialized.end_date_dateobj < selectFrom) {
					continue;
				} if (selectTo && event_serialized.start_date_dateobj > selectTo) {
					continue;
				} else {
					events_serialized.push(event_serialized);
				}
			}

			if (this._params.objectResult || this._params.collections) {
				var res = {
					data: events_serialized
				};
				if (this._params.collections) {
					res.collections = this._params.collections
				};
				return res;
			} else {
				return events_serialized;
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
				const event_serialized = this.db2dhtml(rows[i]);
				var is_planned = event_serialized.etype == "PLAN" || event_serialized.etype == "FAILED_PLAN";
				if (selectFrom && event_serialized.end_date_dateobj < selectFrom) {
					continue;
				} if (selectTo && event_serialized.start_date_dateobj > selectTo) {
					continue;
				}
				if (is_planned && event_serialized.end_date_dateobj <= date_now) {
					if (!event_serialized.is_finished || event_serialized.etype == "FAILED_PLAN") {
						failedAll += 1;
						if (event_serialized.end_date_dateobj > date_yesterday && event_serialized.end_date_dateobj < date_tomorrow) {
							failedToday += 1;
						}
					}
				}
				if (event_serialized.is_finished) {
					if (is_planned) { successAll = successAll + 1; }
					scoreNow += event_serialized.score;
					if (event_serialized.end_date_dateobj > date_yesterday && event_serialized.end_date_dateobj < date_tomorrow) {
						scoreToday += event_serialized.score;
						if (event_serialized.score < 0) spentToday += event_serialized.score;
						else earnedToday += event_serialized.score;
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
				"serverTimeZone": MyUtils.serverTimeZone,
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

	async insert_dummy_copy(serialized) {
		if (serialized.id != undefined && serialized.id.indexOf("#") != -1) {
			scheduler.recover_ev_from_dummy_copy(serialized);
		}
		var item = this.dhtml2db(serialized);
		var this2 = this;
		return await this._query_event_occur_exists_sql(item.event_pid, item.event_length).then(
			rows => {
				if (rows.length > 0) {
					return {
						action: "query",
						tid: rows[0].id.toString(),
						item: rows[0],
					};
				} else {
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
	async insert(serialized) {
		if ((serialized.id != undefined && String(serialized.id).indexOf("#") != -1) || serialized.event_pid != undefined) {
			return this.insert_dummy_copy(serialized);
		}
		return super.insert(serialized, "myevents");
	}

	// update event
	async update(id, serialized) {
		serialized.id = parseInt(id);
		var item = this.dhtml2db(serialized);
		var this2 = this;
		return this._update_sql(item).then((_) => {
			return {
				action: "updated",
				item: this2.db2dhtml(item),
			}
		}).catch((err) => {
			console.log('Error: ');
			console.error(err.message);
			console.error(err.stack);
			return {
				action: "error",
				message: "cannot update"
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
				const event_serialized = this.db2dhtml(rows[i]);
				if (event_serialized.end_date_dateobj < time_now) {
					event_serialized.etype = "FAILED_PLAN";
					promises.push(this.update(event_serialized.id, event_serialized));
				} else if (event_serialized.rec_type != undefined && event_serialized.rec_type.length > 0 && event_serialized.rec_type != 'none') {
					const event_occur_serialized = scheduler.generate_virtual_occurence_event_from_series_and_date(event_serialized, date_provided, time_now);
					if (event_occur_serialized != null) {
						promises.push(this._query_event_occur_exists_sql(event_occur_serialized.event_pid, event_occur_serialized.event_length).then((rows) => {
							if (rows.length == 0) {
								event_occur_serialized.etype = "FAILED_PLAN";
								return this.insert(event_occur_serialized);
							}
						}));
					}
				}
			}
		}).then((_) => {
			return Promise.all(promises).then((resp)=>{
				for(let subresp of resp){
					if(subresp?.action == "error")return subresp;
				}
				return {
					action: "update"
				};
			});
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
		var res = await this.updateFailedPlan(date_provided);
		if (res.action == "error")return res;
		date_txt_provided = MyUtils.localDateToFloatingTimeStr(date_provided, false);

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
		let need_insert = false, need_report_error = false;
		try{
			let res = {};
			if (rows.length == 0) {
				need_insert = true;
				res = await this._insert_sql(item);
			} else {
				item.id = rows[0].id;
				res = await this._update_sql(item);
			}
			if(res.action == "error"){
				need_report_error = true;
			}
		}catch(err){
			console.log('Error: ');
			console.error(err.message);
			console.error(err.stack);
			need_report_error = true;
		}
		if(need_report_error){
			if (need_insert) {
				return {
					action: "error",
					message: "cannot insert in refreshExpenses"
				}
			}else{
				return {
					action: "error",
					message: "cannot update in refreshExpenses"
				}
			}
		}
		return {
			action: "update",
		}
	}

	async updateDetails(eid, details_str) {
		eid = parseInt(eid);
		return this._update_details_sql_via_id(eid, details_str).then((eid, details_str) => {
			return {
				action: "updated",
				id: eid,
			}
		}).catch((err) => {
			console.log('Error: ');
			console.error(err.message);
			console.error(err.stack);
			return {
				action: "error",
				message: "cannot updateDetails"
			}
		});
	}
}

module.exports = EventsStorage;
