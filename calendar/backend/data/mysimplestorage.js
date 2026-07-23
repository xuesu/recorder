require("date-format-lite"); // add date format
var xssFilters = require('xss-filters');
const MyUtils = require("./utils");


class MySimpleStorage {
	constructor(db, table_create_sql, param_relations, alias2table_name, params) {
		this._db = db;
		if (typeof table_create_sql != "string") throw new Error();
		this.table_create_sql = table_create_sql;
		this._db.run(table_create_sql);
		this._params = params || {};
		if (!MyUtils.isDict(param_relations)) throw new Error();
		for (var tn in param_relations) {
			if (typeof tn != "string") { throw new Error(); }
			var v = param_relations[tn];
			if (!v instanceof Array) { throw new Error(); }
			for (var i = 0; i < v.length; i += 1) {
				if (typeof v[i] != "string") { throw new Error(); }
			}
		}
		this.param_relations = param_relations;
		for (var tn in alias2table_name) {
			if (typeof tn != "string") throw new Error();
			var v = alias2table_name[tn];
			if (!v instanceof Array) { throw new Error(); }
			for (var i = 0; i < v.length; i += 1) {
				if (typeof v[i] != "string") { throw new Error(); }
			}
		}
		this.alias2table_name = alias2table_name;
	}

	dhtml2db(data, table_name) {
		var params_related = this.param_relations[table_name];
		var item = {};
		for (var i = 0; i < params_related.length; i += 1) {
			var param_name = params_related[i];
			var param_value = data[param_name];
			if (param_value == undefined) continue;
			if (param_name.startsWith("is_")) {
				if (typeof param_value != "string") {
					param_value = param_value.toString();
				}
				param_value = param_value.toLowerCase();
				if (param_value == "1" || param_value == "true") {
					param_value = "true";
				} else {
					param_value = "false";
				}
			}
			else if (param_name.startsWith("time_") || param_name.startsWith("date_") || param_name.endsWith("_time") || param_name.endsWith("_date")) {
				if (typeof param_value == "string" && param_value.trim().length == 0) {
					param_value = undefined;
				}
				if (param_value == undefined && param_name == "time_create") {
					param_value = MyUtils.localDateToFloatingTime(new Date()); //we prefer floatingtime for we don't have urgent TOU scenes here
				} else {
					if (param_name + "_timezoneoffset" in data && data[param_name + "_timezoneoffset"] != undefined && data[param_name + "_timezoneoffset"] != null) {
						param_value = MyUtils.localDateToISO8601WithOffset(param_value, parseInt(data[param_name + "_timezoneoffset"]));
					}
					else {
						param_value = MyUtils.localDateToFloatingTime(param_value);
					}
				}
			}
			item[param_name] = param_value;
		}
		return item;
	}

	db2dhtml(item) {
		var serialized = Object.assign({}, item);
		for (let k in serialized) {
			if (Object.prototype.toString.call(serialized[k]) === "[object Date]") {
				throw new Error("shouldn't be able to have date from sqlite?");
			} else if (typeof serialized[k] === "string") {
				if (k.startsWith("time_") || k.startsWith("date_") || k.endsWith("_time") || k.endsWith("_date")) {
					if (serialized[k].indexOf("T") != -1) { //Date
						let tmpobj = MyUtils.localDatefromISO8601WithOffset(serialized[k]);
						serialized[k] = xssFilters.inHTMLData(tmpobj.floating_date_str);
						if (k + "_timezoneoffset" in serialized) {
							throw new Error("cannot happend from design! ");
						}
						if (k + "_dateobj" in serialized) {
							throw new Error("cannot happend from design! ");
						}
						serialized[k + "_timezoneoffset"] = tmpobj.timeshift;
						serialized[k + "_dateobj"] = tmpobj.date;
					} else {
						let tmpobj = MyUtils.localDateFromFloatingTime(serialized[k]);
						if (k + "_dateobj" in serialized) {
							throw new Error("cannot happend from design! ");
						}
						serialized[k] = tmpobj.date; // xssFilters.inHTMLData(tmpobj.floating_date_str);
						serialized[k + "_dateobj"] = tmpobj.date;
					}
				} else {
					serialized[k] = xssFilters.inHTMLData(serialized[k]);
				}
			} else if (typeof serialized[k] === "number") {
				serialized[k] = serialized[k];
			} else {
				if (serialized[k] == null) serialized[k] = "";
				else serialized[k] = serialized[k].toString();
			}
		}
		return serialized;
	}


	_insert_sql(item, table_name) {
		// console.log("mysimplestorage.js: _insert_sql", table_name, item);
		// console.log("this.param_relations[table_name]", table_name, this.param_relations[table_name]);
		var params_related_without_id = this.param_relations[table_name].slice(1);
		var item_arr = [];
		for (var param_name of params_related_without_id) {
			item_arr.push(item[param_name]);
		}
		return new Promise((resolve, reject) => this._db.run(
			"INSERT INTO " + table_name + " (" + params_related_without_id.join(",")
			+ " ) VALUES ( " + "?,".repeat(params_related_without_id.length - 1) + " ?)",
			item_arr,
			function (err) {
				if (err && err != null) {
					console.log('Error running insert_sql');
					console.error(err);
					reject(err)
				} else {
					item.id = this.lastID;
					resolve(item)
				}
			}
		))
	}

	_update_sql(item, table_name) {
		if (item.id == undefined) {
			return {
				action: "error",
				message: "Cannot find id!"
			};
		}
		var params_related_without_id = this.param_relations[table_name].slice(1);
		var item_arr = [];
		var set_str_parts = [];
		for (var param_name of params_related_without_id) {
			if (param_name in item) {
				set_str_parts.push(param_name + " = ? ");
				item_arr.push(item[param_name]);
			}
		}
		item_arr.push(item.id);
		return new Promise((resolve, reject) => this._db.run(
			"UPDATE " + table_name + " SET " + set_str_parts.join(', ') + " WHERE id = ?",
			item_arr,
			(err) => {
				if (err) {
					console.log('Error running update_sql');
					console.error(err);
					reject(err)
				} else {
					resolve(item)
				}
			}
		))
	}

	_update_column_from_id_sql(eid, column_name, column_value, table_name) {
		if (this.param_relations[table_name].indexOf(column_name) == -1) {
			throw new Error("wrong column name!");
		}

		return new Promise((resolve, reject) => this._db.run(
			"UPDATE " + table_name + " SET " + column_name + " = ? where id = ?",
			[column_value, eid],
			(err) => {
				if (err) {
					console.log('Error running _update_column_from_id_sql');
					console.error(err.message);
					console.error(err.stack);
					reject(err)
				} else {
					resolve(eid, column_value)
				}
			}
		))
	}

	_delete_by_id_sql(id, table_name) {
		return new Promise((resolve, reject) => this._db.run(
			"DELETE FROM " + table_name + " WHERE id = ?",
			[id], (err) => {
				if (err) {
					console.log('Error running delete_by_id_sql');
					console.error(err);
					reject(err)
				} else {
					resolve(id)
				}
			}
		))
	}

	_delete_all_sql(filter_params, extra_conditions, table_name) {
		var sql = "DELETE FROM " + table_name;
		var sql_vs = [];
		var has_where = false;
		if (filter_params != undefined) {
			var filtered_param_names = [];
			var filtered_vs = [];
			for (var filter_param_name in filter_params) {
				if (this.param_relations[table_name].indexOf(filter_param_name) != -1) {
					filtered_param_names.push(filter_param_name + "=?");
					filtered_vs.push(filter_params[filter_param_name]);
				}
			}
			if (filtered_param_names.length > 0) {
				has_where = true;
				sql += " WHERE " + filtered_param_names.join(" AND ");
				sql_vs = filtered_vs;
			}
		}
		if (extra_conditions != undefined) {
			if (!has_where) {
				sql += " WHERE ";
				has_where = true;
			}
			sql += extra_conditions;
		}
		return new Promise((resolve, reject) => this._db.run(
			sql, sql_vs, (err) => {
				if (err) {
					console.log('Error running delete_by_id_sql');
					console.error(err);
					reject(err)
				} else {
					resolve(id)
				}
			}
		))
	}

	_query_one_by_id_sql(id, table_name) {
		return new Promise((resolve, reject) => this._db.all(
			"SELECT * FROM " + table_name + " where id = ?", [id], (err, rows) => {
				if (err) {
					console.log('Error running _query_one_by_id_sql');
					console.error(err);
					reject(err)
				} else {
					resolve(rows)
				}
			}
		))
	}

	_query_all_sql(filter_params, extra_conditions, table_name) {
		var sql = "SELECT * FROM " + table_name;
		var sql_vs = [];
		var has_where = false;
		if (filter_params != undefined) {
			var filtered_param_names = [];
			var filtered_vs = [];
			for (var filter_param_name in filter_params) {
				if (this.param_relations[table_name].indexOf(filter_param_name) != -1) {
					filtered_param_names.push(filter_param_name + "=?");
					filtered_vs.push(filter_params[filter_param_name]);
				}
			}
			if (filtered_param_names.length > 0) {
				has_where = true;
				sql += " WHERE " + filtered_param_names.join(" AND ");
				sql_vs = filtered_vs;
			}
		}
		if (extra_conditions != undefined) {
			if (!has_where) {
				sql += " WHERE ";
				has_where = true;
			}
			sql += extra_conditions;
		}
		return new Promise((resolve, reject) => this._db.all(
			sql, sql_vs, (err, rows) => {
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

	async getOneByID(id, table_name) {
		if (!(table_name in this.param_relations)) {
			table_name = this.alias2table_name[table_name];
		}
		return this._query_one_by_id_sql(id, table_name).then((rows) => {
			if (rows.length == 0) {
				return {
					action: "error",
					message: "Unable find " + table_name + " by id: " + id,
				};
			} else {
				return {
					data: this.db2dhtml(rows[0]),
					action: "query"
				};
			}
		}).catch((err) => {
			console.log('Error: ')
			console.error(err);
			return {
				action: "error", //Should check the log for details rather than find it in the frontend
				message: "cannot getOneByID"
			}
		});
	}

	async getAll(filter_params, extra_conditions, table_name) {
		if (!(table_name in this.param_relations)) {
			table_name = this.alias2table_name[table_name];
		}
		return this._query_all_sql(filter_params, extra_conditions, table_name).then((rows) => {
			const result = [];
			for (var i = 0; i < rows.length; i++) {
				const row = rows[i];
				const event = this.db2dhtml(row);
				result.push(event);
			}
			return {
				data: result,
				action: "query"
			};
		}).catch((err) => {
			console.log('Error: ');
			console.error(err);
			return {
				action: "error"
			}
		});
	}

	async insert(data, table_name) {
		if (!(table_name in this.param_relations)) {
			table_name = this.alias2table_name[table_name];
		}
		var item = this.dhtml2db(data, table_name);
		return this._insert_sql(item, table_name).then(
			function (item) {
				return {
					action: "inserted",
					tid: item.id.toString(),
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

	async update(id, data, table_name) {
		if (!(table_name in this.param_relations)) {
			table_name = this.alias2table_name[table_name];
		}
		var promises = [];
		if (data instanceof Array) {
			for (var subdata of data) {
				subdata.id = parseInt(subdata.id);
				subdata = this.dhtml2db(subdata, table_name);
				promises.push(this._update_sql(subdata, table_name));
			}
		} else {
			data.id = parseInt(id);
			data = this.dhtml2db(data, table_name);
			promises.push(this._update_sql(data, table_name));
		}
		return Promise.all(promises).catch((err) => {
			console.log('Error: ')
			console.error(err);
			return {
				action: "error"
			};
		}).then((resp) => {
			if (resp.action == "error") {
				return resp;
			}
			return {
				action: "updated",
			}
		});
	}

	async delete(id, table_name) {
		if (!(table_name in this.param_relations)) {
			table_name = this.alias2table_name[table_name];
		}
		return this._delete_by_id_sql(parseInt(id), table_name).then(
			function (resp) {
				return {
					action: "deleted",
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
}

module.exports = MySimpleStorage;
