var note_format_parser = require("../../mmid_pack/mnote_parser");

function addTimeTo(start_time, add_year=0, add_month=0, add_day=0, add_hour=0, add_minute=0){
    var time0 = new Date(start_time);
    time0.setTime(start_time.getTime() + add_minute * 60 * 1000 + add_hour * 60 * 60 * 1000 + add_day * 24 * 60 * 60 * 1000);
    if(add_month != 0){
        var new_v = start_time.getMonth() + add_month;
        var new_v_t = 0;
        if(new_v < 0 || new_v > 11){
            new_v_t =  Math.floor(new_v / 12);
            console.log(new_v_t);
            new_v -= new_v_t * 12;
            add_year += new_v_t;
        }
        time0.setMonth(new_v);
    }
    if(add_year != 0){
        time0.setFullYear(start_time.getFullYear() + add_year);
    }
    return time0;
}

function getStartDateToday(){
    var date0 = new Date();
    date0.setHours(0);
    date0.setMinutes(0);
    date0.setSeconds(0);
    date0.setMilliseconds(1);
    return date0;
}

function getNoteEventInstanceName(type_str, date_txt_provided) {
    if(date_txt_provided != "example"){
        if(type_str == "monthplan"){
            let start_date = new Date(Date.parse(date_txt_provided));
            start_date.setDate(1);
            date_txt_provided = start_date.format("YYYY-MM-DD");
        }
        else if(type_str == "weekplan"){
            let start_date = new Date(Date.parse(date_txt_provided));
            start_date.setDate(start_date.getDate() - (start_date.getDay() + 6) % 7);
            date_txt_provided = start_date.format("YYYY-MM-DD");
        }
    }
    return type_str + "_" + date_txt_provided;
}

class StorageNoteExt {
	constructor(event_storage, note_storage, collection, params) {
        this._event_storage = event_storage;
        this._note_storage = note_storage;
		this._params = params || {};
		if (collection) {
			collection.forEach(item => {
				this.insert(item);
			});
		}
    }
	
    async getNoteEventExampleStr(type_str) {
		let rows = await this._note_storage.query_all_notes_by_title_sql(getNoteEventInstanceName(type_str, "example"), 'true').catch((err) => {
            console.log('Error: ');
            console.log(err.message);
            console.log(err.stack);
        });
		if (rows.length == 0) return undefined;
		return rows[0].content;
	}

    calcDailyCheckScore(todo_items){
        var score = 0;
        for(var i = 0;i < todo_items.length; i += 1){
            if(todo_items[i].score < 0){
                throw new Error("score of this todo item < 0!"); 
            }
            if(todo_items[i].status == "done"){
                score += todo_items[i].score;
            }else{
                score -= todo_items[i].score;
            }
        }
        return score;
    }


	async createNoteEventInstanceFromExample(type_str, date_txt_provided) {
		var details_str = await this.getNoteEventExampleStr(type_str);
        if(details_str == undefined)details_str = "## TODO\n";
		let start_date = new Date(Date.parse(date_txt_provided));
        start_date.setHours(0);
        var end_date = new Date(Date.parse(date_txt_provided));
        if(type_str.indexOf("daily") != -1){
            end_date.setHours(23);
            end_date.setMinutes(30);
        }
        else if(type_str.indexOf("week") != -1){
            start_date.setDate(start_date.getDate() - (start_date.getDay() + 6) % 7);
            end_date.setDate(start_date.getDate() - (start_date.getDay() + 6) % 7 + 6);
            end_date.setHours(23);
            end_date.setMinutes(30);
        }
        else if(type_str.indexOf("month") != -1){
            start_date.setDate(1);
            end_date = addTimeTo(start_date, 0, 1);
            end_date.setHours(23);
            end_date.setMinutes(30);
        }
        var todo_item = note_format_parser.parse_todo_tree(details_str);
        if(todo_item == undefined){
            return undefined;
        }
		var score = this.calcDailyCheckScore(todo_item.children);
		return {
			"name": getNoteEventInstanceName(type_str, start_date.format("YYYY-MM-DD")),
			"is_finished": "true",
			"details": details_str,
			"score": score,
			"etype": "FACT",
			"start_date": start_date.format("YYYY-MM-DD hh:mm"),
			"end_date": end_date.format("YYYY-MM-DD hh:mm"),
			"event_length": undefined,
			"event_pid": undefined,
			"rec_pattern": "",
			"rec_type": ""
		}
	}

	async getOneByName(type_str, date_txt_provided) {
		return this._event_storage.query_name_sql(getNoteEventInstanceName(type_str, date_txt_provided)).then((rows) => {
			if (rows.length == 0) return {
				action: "query"
			}
			return {
				action: "query",
                data: {
                    content: rows[0].details,
                    title: rows[0].name,
                    id: rows[0].id,
                }
			}
		}).catch((err) => {
			console.log('Error: ');
			console.log(err.message);
			console.log(err.stack);
		});
	}

	async create(type_str, date_txt_provided) {
		let query_res = await this.getOneByName(type_str, date_txt_provided).catch((err) => {
            console.log('Error: ');
            console.log(err.message);
            console.log(err.stack);
        });
		if (query_res.data == undefined) {
            var event_item = await this.createNoteEventInstanceFromExample(type_str, date_txt_provided);
            if(event_item == undefined){
                return {
                    "action": "error",
                    "message": "cannot create event from example!"
                };
            }
			await this._event_storage.insert_sql(event_item).catch((err) => {
					console.log('Error: ');
					console.log(err.message);
					console.log(err.stack);
				});
            return this.getOneByName(type_str, date_txt_provided)
		}else{
            return query_res;
        }
	}

	async update(type_str, date_txt_provided, postdata) {
        if (postdata.text == undefined) {
            return {
                "action": "error",
                "message": "details.text is empty"
            };
        }
        let name = getNoteEventInstanceName(type_str, date_txt_provided);
		let rows = await this._event_storage.query_name_sql(name).catch((err) => {
            console.log('Error: ');
            console.log(err.message);
            console.log(err.stack);
        });
		if (rows.length == 0) {
            return {
                "action": "error",
                "message": getNoteEventInstanceName(type_str, date_txt_provided) + " is not-exist!"
            };
		} 
		var item = rows[0];
		item.details = postdata.text;
        var todo_item = note_format_parser.parse_todo_tree(item.details);
        if(todo_item == undefined){
            return {
                "action": "error",
                "message": "cannot parse to-do tree"
            };
        }
		item.score = this.calcDailyCheckScore(todo_item.children);
        this._event_storage.update_sql(item);
		return this.getOneByName(type_str, date_txt_provided);
	}

	async delete(type_str, date_txt_provided) {
		return this._event_storage.delete_by_name_sql(getNoteEventInstanceName(type_str, date_txt_provided)).then((name) => {
			return {
				"action": "deleted",
                "message": "success!"
			};
		}).catch((err) => {
			console.log('Error: ');
			console.log(err.message);
			console.log(err.stack);
		});
	}
}

module.exports = StorageNoteExt;