function callMethod(method) {
	return async (req, res) => {
		let result;
		try {
			result = await method(req, res);
		} catch (e) {
			console.error(e.message);
			console.error(e.stack);
			result = {
				action: "error",
				message: e.message
			}
		}
		res.setHeader('Content-Type', 'application/json');
		res.json(result);
	}
};

function getNoteType(url, remove_sec_num) {
	possible_type_str = url;
	while (possible_type_str.endsWith("/")) {
		possible_type_str = possible_type_str.slice(0, possible_type_str.length - 1);
	}
	while (possible_type_str.lastIndexOf("/") > 0 && (remove_sec_num > 0 || possible_type_str.startsWith("?", possible_type_str.lastIndexOf("/") + 1))) {
		possible_type_str = possible_type_str.slice(0, possible_type_str.lastIndexOf("/"));
		remove_sec_num -= 1;
	}
	possible_type_str = possible_type_str.slice(possible_type_str.lastIndexOf("/") + 1).toLowerCase();
	if (possible_type_str == "notes" || possible_type_str == "note" || possible_type_str == "note_titles" || possible_type_str == "notes_titles") return "note";
	if (possible_type_str == "notices" || possible_type_str == "notice") return "notice";
	if (possible_type_str == "dailycheck") return "dailycheck";
	if (possible_type_str == "weekplan") return "weekplan";
	if (possible_type_str == "monthplan") return "monthplan";
	throw new Error("unknown note type!");
}

function getMemQuizTableName(url, remove_sec_num) {
	possible_type_str = url;
	while (possible_type_str.endsWith("/")) {
		possible_type_str = possible_type_str.slice(0, possible_type_str.length - 1);
	}
	while (remove_sec_num > 0 || (possible_type_str.indexOf("/") != -1 && possible_type_str[possible_type_str.lastIndexOf("/") + 1] == '?')) {
		possible_type_str = possible_type_str.slice(0, possible_type_str.lastIndexOf("/"));
		remove_sec_num -= 1;
	}
	possible_type_str = possible_type_str.slice(possible_type_str.lastIndexOf("/") + 1).toLowerCase();
	if (possible_type_str == "mementry" || possible_type_str == "mementries") return "mementries";
	if (possible_type_str == "memgroup" || possible_type_str == "memgroups") return "memgroups";
	if (possible_type_str == "membook" || possible_type_str == "membooks") return "membooks";
	if (possible_type_str == "memlecture" || possible_type_str == "memlectures") return "memlectures";
	throw new Error("unknown memquiz type!");
}

module.exports = {
	setRoutes(app, prefix, storage) {
		app.get(`${prefix}`, callMethod((req) => {
			return storage.getAll(req.query);
		}));

		app.post(`${prefix}`, callMethod((req) => {
			return storage.insert(req.body);
		}));

		app.put(`${prefix}/:id`, callMethod((req) => {
			return storage.update(req.params.id, req.body);
		}));

		app.delete(`${prefix}/:id`, callMethod((req) => {
			return storage.delete(req.params.id);
		}));

		app.post(`${prefix}_details`, callMethod((req) => {
			return storage.updateDetails(req.body.id, req.body.details);
		}));
	},
	setNoteRoutes(app, prefix, storage) {
		app.get(`${prefix}/:id`, callMethod((req) => {
			type_str = getNoteType(req.url, 1);
			return storage.getOneByID(req.params.id, type_str);
		}));

		app.get(`${prefix}`, callMethod((req) => {
			type_str = getNoteType(req.url, 0);
			return storage.getAll(req.query, undefined, type_str);
		}));

		app.get(`${prefix}_titles`, callMethod((req) => {
			type_str = getNoteType(req.url, 0);
			return storage.getAllNoteTitleWithIDSorted(type_str);
		}));

		app.post(`${prefix}`, callMethod((req) => {
			type_str = getNoteType(req.url, 0);
			return storage.insert(req.body, type_str);
		}));

		app.put(`${prefix}/:id`, callMethod((req) => {
			type_str = getNoteType(req.url, 1);
			req.body.content = req.body.content.replace(/\t/g, "    ");
			return storage.update(req.params.id, req.body, type_str);
		}));

		app.delete(`${prefix}/:id`, callMethod((req) => {
			type_str = getNoteType(req.url, 1);
			return storage.delete(req.params.id, type_str);
		}));

	},
	setNoticeRoutes(app, prefix, storage) {
		app.get(`${prefix}/:id`, callMethod((req) => {
			type_str = getNoteType(req.url, 1);
			return storage.getOneByID(req.params.id, type_str);
		}));

		app.get(`${prefix}`, callMethod((req) => {
			type_str = getNoteType(req.url, 0);
			return storage.getAll(req.query, undefined, type_str);
		}));

		app.post(`${prefix}`, callMethod((req) => {
			type_str = getNoteType(req.url, 0);
			return storage.insert(req.body, type_str);
		}));

		app.put(`${prefix}/:id`, callMethod((req) => {
			type_str = getNoteType(req.url, 1);
			return storage.update(req.params.id, req.body, type_str);
		}));

		app.delete(`${prefix}/:id`, callMethod((req) => {
			type_str = getNoteType(req.url, 1);
			return storage.delete(req.params.id, type_str);
		}));

		app.post(`${prefix}_hide`, callMethod((req) => {
			return storage.hide_notice_by_id(req.body.id);
		}));
	},
	setNoteExtRoutes(app, prefix, storage) {
		app.get(`${prefix}/:date_txt_provided`, callMethod((req) => {
			type_str = getNoteType(req.url, 1);
			return storage.getOneByName(req.params.date_txt_provided, type_str);
		}));

		app.post(`${prefix}/:date_txt_provided`, callMethod((req) => {
			type_str = getNoteType(req.url, 1);
			if (req.body.text == undefined) {
				return storage.create(req.params.date_txt_provided, type_str);
			}
			else {
				return storage.update(req.params.date_txt_provided, req.body, type_str);
			}
		}));

		app.delete(`${prefix}/:date_txt_provided`, callMethod((req) => {
			type_str = getNoteType(req.url, 1);
			return storage.delete(req.params.date_txt_provided, type_str);
		}));
	},
	setStatsRoutes(app, prefix, storage) {
		app.get(`${prefix}`, callMethod((req) => {
			return storage.getStatistic(req.query);
		}));
	},
	setExpensesRoutes(app, prefix, storage) {
		app.get(`${prefix}/:date_txt_provided`, callMethod((req) => {
			return storage.refreshExpenses(req.params.date_txt_provided);
		}));
	},
	setMemQuizRoutes(app, prefix, storage) {
		app.get(`${prefix}/:id`, callMethod((req) => {
			type_str = getMemQuizTableName(req.url, 1);
			return storage.getOneByID(req.params.id, type_str);
		}));

		app.get(`${prefix}`, callMethod((req) => {
			type_str = getMemQuizTableName(req.url, 0);
			return storage.getAll(req.query, undefined, type_str);
		}));

		app.post(`${prefix}`, callMethod((req) => {
			type_str = getMemQuizTableName(req.url, 0);
			return storage.insert(req.body, type_str);
		}));

		app.put(`${prefix}/:id`, callMethod((req) => {
			type_str = getMemQuizTableName(req.url, 1);
			return storage.update(req.params.id, req.body, type_str);
		}));

		app.delete(`${prefix}/:id`, callMethod((req) => {
			type_str = getMemQuizTableName(req.url, 1);
			return storage.delete(req.params.id, type_str);
		}));
	},

	setMemQuizCSVImportRoutes(app, prefix, storage) {
		app.post(`${prefix}`, callMethod((req) => {
			return storage.importEntriesByCSV(req.body.fcontent, req.body.lecture_id);
		}));
	}
};