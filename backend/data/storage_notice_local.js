require("date-format-lite"); // add date format
const MySimpleStorage = require("./mysimplestorage");

class StorageNotice extends MySimpleStorage{
	constructor(db, params) {
		super(db, `
		CREATE TABLE IF NOT EXISTS "mynotices" (
			"id"	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
			"date_show"	TEXT NOT NULL,
			"date_hide"	TEXT NOT NULL,
			"info_level"	INTEGER DEFAULT 0,
			"text"	TEXT NOT NULL
		);`, 
		{
			"mynotices": ["id", "date_show", "date_hide", "info_level", "text"]
		}, 
		{
			"notice": "mynotices",
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
		for(const [param_name, param_value_set] of [["date_show", new Set(["beforenow", "afternow"])], ["date_hide", new Set(["beforenow", "afternow"])]]){
			if(param_name in filter_params && param_value_set.has(filter_params[param_name])){
				postprocess_filter_params[param_name] = filter_params[param_name];
				delete filter_params[param_name];
				need_postprocess = true;
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
	
	async hide_notice_by_id(notice_id){
		let res = await super.update_sql("mynotices", {"id": notice_id, "date_hide": new Date().format("YYYY-MM-DD hh:mm")});
		return res;
	}

}

module.exports = StorageNotice;
