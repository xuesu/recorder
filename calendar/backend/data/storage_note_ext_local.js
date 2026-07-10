var note_format_parser = require("../../mmid_pack/mnote_parser");

function getNoteEventInstanceName(type_str, date_txt_provided) {
    if(date_txt_provided != "example"){
        if(type_str == "monthplan"){
            let start_date = new Date(Date.parse(date_txt_provided));
            start_date.setDate(1);
            date_txt_provided = start_date.format("YYYY-MM-DD");
        }
        else if(type_str == "weekplan"){
            let start_date = new Date(Date.parse(date_txt_provided));
            let dur = start_date.getDay() - 1;
            start_date = new Date(start_date.valueOf() - dur * 24 * 3600 * 1000);
            date_txt_provided = start_date.format("YYYY-MM-DD");
        }
    }
    return type_str + "_" + date_txt_provided;
}

class StorageNoteExt {
	constructor(event_storage, note_storage, params) {
        this._event_storage = event_storage;
        this._note_storage = note_storage;
		this._params = params || {};
    }
	
    async getNoteEventExampleStr(type_str) {
		let rows = await this._note_storage.query_all_notes_by_title_sql(getNoteEventInstanceName(type_str, "example"), 'true').catch((err) => {
            console.log('Error: ');
            console.error(err.message);
            console.error(err.stack);
        });
		if (rows == undefined || rows.length == 0) return undefined;
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
            let dur = start_date.getDay() - 1;
            start_date = new Date(start_date.valueOf() - dur * 24 * 3600 * 1000);
            end_date = new Date(start_date.valueOf() + 6 * 24 * 3600 * 1000);
            end_date.setHours(23);
            end_date.setMinutes(30);
        }
        else if(type_str.indexOf("month") != -1){
            start_date.setDate(1);
            end_date = note_format_parser.addTimeTo(start_date, 0, 1);
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
			console.error(err.message);
			console.error(err.stack);
            return {
                action: "error"
            }
		});
	}

	async create(type_str, date_txt_provided) {
		let query_res = await this.getOneByName(type_str, date_txt_provided).catch((err) => {
            console.log('Error: ');
            console.error(err.message);
            console.error(err.stack);
            return {
                action: "need process" 
            }
        });
		if (query_res.data == undefined) {
            var event_item = await this.createNoteEventInstanceFromExample(type_str, date_txt_provided);
            if(event_item == undefined){
                return {
                    action: "error",
                    error: "cannot create event from example!"
                };
            }
			let inserted_res = await this._event_storage.insert_sql(event_item).catch((err) => {
					console.log('Error: ');
					console.error(err.message);
					console.error(err.stack);
                    return {
                        action: "error",
                        error: "cannot insert event!"
                    }
				});
            if(inserted_res.action == "error")return inserted_res;
            else return await this.getOneByName(type_str, date_txt_provided);
		}else{
            return query_res;
        }
	}

	async update(type_str, date_txt_provided, postdata) {
        if (postdata.text == undefined) {
            return {
                action: "error",
                error: "details.text is empty"
            };
        }
        
		postdata.text = postdata.text.replace(/\t/g, "    ");
        let name = getNoteEventInstanceName(type_str, date_txt_provided);
		let rows = await this._event_storage.query_name_sql(name).catch((err) => {
            console.log('Error: ');
            console.error(err.message);
            console.error(err.stack);
        });
		if (rows.length == 0) {
            return {
                action: "error",
                error: getNoteEventInstanceName(type_str, date_txt_provided) + " is not-exist!"
            };
		} 
		var item = rows[0];
		item.details = postdata.text
        var todo_item = note_format_parser.parse_todo_tree(item.details);
        if(todo_item == undefined){
            return {
                action: "error",
                error: "cannot parse to-do tree"
            };
        }
		item.score = this.calcDailyCheckScore(todo_item.children);
        this._event_storage.update_sql(item);
		return await this.getOneByName(type_str, date_txt_provided);
	}

	async delete(type_str, date_txt_provided) {
		return this._event_storage.delete_by_name_sql(getNoteEventInstanceName(type_str, date_txt_provided)).then((name) => {
			return {
				action: "deleted",
			};
		}).catch((err) => {
			console.log('Error: ');
			console.error(err.message);
			console.error(err.stack);
            return {
                action: "error",
            };
		});
	}
}

module.exports = StorageNoteExt;