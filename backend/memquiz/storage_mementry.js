require("date-format-lite"); // add date format
const fs = require('fs');
const csvparse = require('csv-parse');
const MySimpleStorage = require("../data/mysimplestorage");


class StorageMemEntry extends MySimpleStorage {
	constructor(db, params) {
		super(db, `
		CREATE TABLE IF NOT EXISTS "mymetadata" (
            "id"	INTEGER NOT NULL UNIQUE,
            "name"	TEXT NOT NULL,
            "text"	TEXT,
            PRIMARY KEY("id" AUTOINCREMENT)
        );
        CREATE TABLE "mementries" (
            "id"	INTEGER UNIQUE,
            "name"	TEXT NOT NULL DEFAULT 'Empty',
            "text"	TEXT,
            "details"	TEXT,
            "lecture_id"	INTEGER,
            "group_ids"	TEXT,
            "is_learning"	TEXT DEFAULT 'false',
            "time_create"	TEXT,
            "last_err_time"	TEXT,
            "leading_id"	INTEGER,
            "test_histogram"	TEXT,
            "difficulty"	REAL DEFAULT 1.0,
            "extra"	TEXT,
            FOREIGN KEY("lecture_id") REFERENCES "memlectures"("id"),
            PRIMARY KEY("id" AUTOINCREMENT)
        );
        CREATE TABLE IF NOT EXISTS "memgroups" (
            "id"	INTEGER UNIQUE,
            "name"	TEXT NOT NULL DEFAULT 'Empty',
            "text"	TEXT,
            "time_create"	INTEGER,
            "extra"	TEXT,
            PRIMARY KEY("id" AUTOINCREMENT)
        );
        CREATE TABLE IF NOT EXISTS "membooks" (
            "id"	INTEGER UNIQUE,
            "name"	TEXT NOT NULL DEFAULT "NewBook",
            "time_create"	TEXT,
            "group_ids"	TEXT,
            "extra"	TEXT,
            PRIMARY KEY("id" AUTOINCREMENT)
        );
        CREATE TABLE IF NOT EXISTS "memlectures" (
            "id"	INTEGER UNIQUE,
            "book_id"	INTEGER,
            "name"	TEXT NOT NULL DEFAULT 'NewLecture',
            "time_create"	TEXT,
            "group_ids"	TEXT,
            "extra"	TEXT,
            FOREIGN KEY("book_id") REFERENCES "membooks"("ID"),
            PRIMARY KEY("id" AUTOINCREMENT)
        );
        `, 
        {
			"mementries": ["id", "name", "text", "lecture_id", "group_ids", "is_learning", "time_create", "last_err_time", "leading_id", "test_histogram", "difficulty", "extra"],
			"memgroups": ["id", "name", "text", "time_create", "extra"],
			"membooks": ["id", "name", "text", "time_create", "group_ids", "extra"],
			"memlectures": ["id", "book_id", "name", "text", "time_create", "group_ids", "extra"],
		},
		{
			"mementry": "mementries",
			"memgroup": "memgroups",
			"membook": "membooks",
			"memlecture": "memlectures",
		},
		params);
	}
    
	async insert(table_name, data) {
		if(!(table_name in this.param_relations)){
			table_name = this.alias2table_name[table_name];
		}
        if("time_create" in this.param_relations[table_name])data.time_create = new Date();
		var item = this.dhtml2db(table_name, data);
		return this.insert_sql(table_name, item).then(
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

	dhtml2db(table_name, data) {
		var item = super.dhtml2db(table_name, data);
		var params_related = this.param_relations[table_name];
		for(var i = 0;i < params_related.length;i+=1){
			var param_name = params_related[i];
			if(data[param_name] == undefined)continue;
			if(param_name == "group_ids"){
                var param_value = data[param_name];
				if(typeof param_value != "string"){
					param_value = ";" + param_value.join(";") + ";";
				}
                item[param_name] = param_value;
			}
            else if(param_name == "test_histogram"){
                var param_value = data[param_name];
                item[param_name] = JSON.stringify(param_value);
            }
		}
		return item;
	}
    
	db2dhtml(item) {
		var serialized = super.db2dhtml(item);
		for (let param_name in serialized) {
			if(serialized[param_name] == undefined)continue;
			if(param_name == "group_ids"){
                let arr = serialized[param_name].split(";");
                let arrint = [];
                for(let i = 0;i < arr.length;i++){
                    if(arr[i].length > 0)arrint.push(parseInt(arr[i]));
                }
                serialized[param_name] = arrint;
			}
            else if(param_name == "test_histogram"){
                if(serialized[param_name].length == 0)serialized[param_name] = undefined;
                else serialized[param_name] = JSON.parse(serialized[param_name]);
            }
		}
		return serialized;
	}
    
	async getAllWithArgNorm(table_name, filter_params) {
		if(!(table_name in this.param_relations)){
			table_name = this.alias2table_name[table_name];
		}
        var extra_conditions = "";
        for(var param_name in filter_params){
            if(param_name == "group_ids has"){
                if(filter_params.parseInt(filter_params[param_name]) != null){
                    if(extra_conditions.length > 0){
                        extra_conditions += " AND ";
                    }
                    extra_conditions += " INSTR(\";" + filter_params[param_name] + ";\", group_ids) >= 0 ";
                }
            }
            else if(table_name == "mementries" && param_name == 'book_id'){
                if(filter_params.parseInt(filter_params[param_name]) != null){
                    if(extra_conditions.length > 0){
                        extra_conditions += " AND ";
                    }
                    extra_conditions += " lecture_id in (select id from memlectures where book_id == " + filter_params[param_name] + ") ";
                }
            }
            else if(param_name.endsWith("_id")){
                filter_params[param_name] = parseInt(param_name);
            }
        }
        if(extra_conditions.length == 0)extra_conditions = undefined;
		return this.getAll(table_name, filter_params, extra_conditions);
	}

    async importEntriesByCSV(fcontent, lecture_id){
        var header = null;
        var records = [];
        var promises = [];
        const parser = csvparse.parse({ delimiter: ',', trim: true })
          .on('data', (r) => {
            if(header == null){
                header = r;
            }else{
                var item = {"lecture_id": lecture_id};
                for(var i = 0;i < r.length;i+=1){
                    if(header[i].length > 0)item[header[i]] = r[i];
                }
                if(item.name != undefined && item.name.length > 0)records.push(item); 
            }       
          })
          .on('end', () => {
            for(var i = 0;i < records.length;i+=1){
                promises.push(this.insert("mementries", records[i]));
            }
          });
        parser.write(fcontent);
        parser.end();
		return Promise.all(promises).then((resp)=>{
			if(resp.action == "error"){
				return resp;
			}
			return {
				action: "imported",
			}
		}).catch((err) => {
			console.log('Error: ')
			console.error(err);
			return {
				action: "error",				
				err: err,
			}
		});
    }
}

module.exports = StorageMemEntry;
