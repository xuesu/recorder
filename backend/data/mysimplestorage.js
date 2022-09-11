require("date-format-lite"); // add date format
var xssFilters = require('xss-filters');
const MyUtils = require("./utils");


class MySimpleStorage {
	constructor(db, table_create_sql, param_relations, alias2table_name, params) {
		this._db = db;
		if(typeof table_create_sql != "string")throw new Error();
        this.table_create_sql = table_create_sql;
		this._db.run(table_create_sql);
		this._params = params || {};
		if(!MyUtils.isDict(param_relations))throw new Error();
		for(var tn in param_relations){
			if(typeof tn != "string"){throw new Error();}
			var v = param_relations[tn];
			if(!v instanceof Array){throw new Error();}
			for(var i = 0;i < v.length;i+=1){
				if(typeof v[i] != "string"){throw new Error();}
			}
		}
		this.param_relations = param_relations;
		for(var tn in alias2table_name){
			if(typeof tn != "string") throw new Error();
			var v = alias2table_name[tn];
			if(!v instanceof Array){throw new Error();}
			for(var i = 0;i < v.length;i+=1){
				if(typeof v[i] != "string"){throw new Error();}
			}
		}
		this.alias2table_name = alias2table_name;
	}

	
	dhtml2db(table_name, data) {
		var params_related = this.param_relations[table_name];
		var item = {};
		for(var i = 0;i < params_related.length;i+=1){
			var param_name = params_related[i];
			if(data[param_name] == undefined)continue;
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
			else if(param_name.startsWith("time_") || param_name.startsWith("date_")){
				if(param_value == undefined && param_name == "time_create"){
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
			} else if (typeof serialized[i] === "number") {
				serialized[i] = serialized[i];
			} else {
				if(serialized[i] == null)serialized[i] = "";
				else serialized[i] = serialized[i].toString();
			}
		}
		return serialized;
	}
	

	insert_sql(table_name, item) {
		var params_related_without_id = this.param_relations[table_name].slice(1);
		var item_arr = [];
		for(var i = 0;i < params_related_without_id.length; i+=1){
			item_arr.push(item[params_related_without_id[i]]);
		}
		return new Promise((resolve, reject) => this._db.run(
			"INSERT INTO " + table_name  + " (" + params_related_without_id.join(",") 
			+ " ) VALUES ( " + "?,".repeat(params_related_without_id.length - 1) +  " ?)",
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

	update_sql(table_name, item) {
		var params_related_without_id = this.param_relations[table_name].slice(1);
		var item_arr = [];
		var set_str_parts = [];
		for(var i = 0;i < params_related_without_id.length; i+=1){
			set_str_parts.push(params_related_without_id[i] + " = ? ");
			item_arr.push(item[params_related_without_id[i]]);
		}
		item_arr.push(item.id);
		return new Promise((resolve, reject) => this._db.run(
			"UPDATE " + table_name + " SET " + set_str_parts.join(', ') + " WHERE id = ?",
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

	delete_by_id_sql(table_name, id) {
		return new Promise((resolve, reject) => this._db.run(
			"DELETE FROM " + table_name + " WHERE id = ?",
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

	query_one_by_id_sql(table_name, id) {
		return new Promise((resolve, reject) => this._db.all(
			"SELECT * FROM " + table_name + " where id = ?", [id], (err, rows) => {
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


	query_all_sql(table_name, filter_params, extra_conditions) {
		var sql = "SELECT * FROM " + table_name;
		var sql_vs = [];
		var has_where = false;
		if(filter_params != undefined){
			var filtered_param_names = [];
			var filtered_vs = [];
			for(var filter_param_name in filter_params){
				if(this.param_relations[table_name].indexOf(filter_param_name) != -1){
					filtered_param_names.push(filter_param_name + "=?");
					filtered_vs.push(filter_params[filter_param_name]);
				}
			}
			if(filtered_param_names.length > 0){
				has_where = true;
				sql += " WHERE " + filtered_param_names.join(" AND ");
				sql_vs = filtered_vs;
			}
		}
		if(extra_conditions != undefined){
			if(!has_where){
				sql += " WHERE ";
				has_where = true;
			}
			sql += extra_conditions;
		}
		return new Promise((resolve, reject) => this._db.all(
			sql, sql_vs, (err, rows) => {
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
	
	async getOneByID(table_name, id) {
		if(!(table_name in this.param_relations)){
			table_name = this.alias2table_name[table_name];
		}
		return this.query_one_by_id_sql(table_name, id).then((rows) => {
			if(rows.length == 0){
				return {
					"error": "Unable find " + table_name + " by id: " + id,
				};
			}else{
				return {
					"data": this.db2dhtml(rows[0]),
				};
			}
		}).catch((err) => {
			console.log('Error: ')
			console.log(err)
		});
	}

	async getAll(table_name, filter_params, extra_conditions) {
		if(!(table_name in this.param_relations)){
			table_name = this.alias2table_name[table_name];
		}
		return this.query_all_sql(table_name, filter_params, extra_conditions).then((rows) => {
			const result = [];
			for (var i = 0; i < rows.length; i++) {
				const row = rows[i];
				const event = this.db2dhtml(row);
				result.push(event);
			}
			var res = {
				data: result
			};
			return res;
		}).catch((err) => {
			console.log('Error: ');
			console.log(err);
		});
	}

	async insert(table_name, data) {
		if(!(table_name in this.param_relations)){
			table_name = this.alias2table_name[table_name];
		}
		var item = this.dhtml2db(table_name, data);
		return this.insert_sql(table_name, item).then(
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

	async update(table_name, id, data) {
		if(!(table_name in this.param_relations)){
			table_name = this.alias2table_name[table_name];
		}
		var promises = [];
		if(data instanceof Array){
			for(var subdata of data){
				subdata.id = parseInt(subdata.id);
				subdata=this.dhtml2db(table_name, subdata);
				promises.push(this.update_sql(table_name, subdata));
			}
		}else{
			data.id = parseInt(id);
			data = this.dhtml2db(table_name, data);
			promises.push(this.update_sql(table_name, data));
		}
		return Promise.all(promises).catch((err) => {
			console.log('Error: ')
			console.log(err);
			return {
				action: "error",
			}
		}).then((resp)=>{
			return {
				action: "updated"
			}
		});
	}

	async delete(table_name, id) {
		if(!(table_name in this.param_relations)){
			table_name = this.alias2table_name[table_name];
		}
		await this.delete_by_id_sql(table_name, parseInt(id));
		return {
			action: "deleted"
		}
	}
}

module.exports = MySimpleStorage;
