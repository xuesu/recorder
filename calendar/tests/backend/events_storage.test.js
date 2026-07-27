const test = require("node:test");
const assert = require("node:assert");
const EventsStorage = require("../../backend/data/storage_local");
const scheduler = require("../../backend/data/scheduler_mini_recurring");
const { createDb } = require("../helpers/db");

function setup() {
	const db = createDb();
	const storage = new EventsStorage(db);
	return { db, storage };
}

function getTableNames(db) {
	return new Promise((resolve, reject) => db.all(
		"SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
		[],
		(err, rows) => (err ? reject(err) : resolve(rows.map((r) => r.name)))
	));
}

test("EventsStorage auto-creates myevents table on an empty db", async () => {
	const { db, storage } = setup();
	const tables = await getTableNames(db);
	assert.ok(tables.indexOf("myevents") !== -1, `expected myevents auto-created, got [${tables.join(", ")}]`);
	db.close();
});

test("EventsStorage insert -> getAll (Create + Read)", async () => {
	const { db, storage } = setup();
	const res = await storage.insert({
		name: "Test Event",
		start_date: "2024-01-01 10:00",
		end_date: "2024-01-01 11:00",
		etype: "PLAN",
	});
	assert.strictEqual(res.action, "inserted");
	assert.ok(res.tid);

	const all = await storage.getAll({});
	assert.ok(Array.isArray(all));
	assert.strictEqual(all.length, 1);
	assert.strictEqual(all[0].name, "Test Event");
	assert.strictEqual(all[0].text, "Test Event");
	assert.strictEqual(all[0].etype, "PLAN");
	assert.strictEqual(all[0].is_finished, "false");
	db.close();
});

test("EventsStorage update (Update)", async () => {
	const { db, storage } = setup();
	const ins = await storage.insert({
		name: "Before Update",
		start_date: "2024-01-01 10:00",
		end_date: "2024-01-01 11:00",
		etype: "PLAN",
	});
	const id = ins.tid;
	const upd = await storage.update(id, {
		text: "After Update",
		start_date: "2024-01-01 10:00",
		end_date: "2024-01-01 12:00",
		etype: "FACT",
		is_finished: true,
		score: 5,
	});
	assert.strictEqual(upd.action, "updated");
	assert.strictEqual(upd.item.name, "After Update");

	const all = await storage.getAll({});
	assert.strictEqual(all.length, 1);
	assert.strictEqual(all[0].name, "After Update");
	assert.strictEqual(all[0].etype, "FACT");
	assert.strictEqual(all[0].is_finished, "true");
	assert.strictEqual(all[0].score, 5);
	db.close();
});

test("EventsStorage delete (Delete)", async () => {
	const { db, storage } = setup();
	const ins = await storage.insert({
		name: "To Delete",
		start_date: "2024-01-01 10:00",
		end_date: "2024-01-01 11:00",
		etype: "PLAN",
	});
	const before = await storage.getAll({});
	assert.strictEqual(before.length, 1);

	const del = await storage.delete(ins.tid);
	assert.strictEqual(del.action, "deleted");

	const after = await storage.getAll({});
	assert.strictEqual(after.length, 0);
	db.close();
});

test("EventsStorage getOneByID", async () => {
	const { db, storage } = setup();
	const ins = await storage.insert({
		name: "Find Me",
		start_date: "2024-01-01 10:00",
		end_date: "2024-01-01 11:00",
		etype: "PLAN",
	});
	const got = await storage.getOneByID(ins.tid, "myevents");
	assert.strictEqual(got.action, "query");
	assert.strictEqual(got.data.name, "Find Me");

	const missing = await storage.getOneByID(99999, "myevents");
	assert.strictEqual(missing.action, "error");
	db.close();
});

test("EventsStorage updateDetails", async () => {
	const { db, storage } = setup();
	const ins = await storage.insert({
		name: "Details Target",
		start_date: "2024-01-01 10:00",
		end_date: "2024-01-01 11:00",
		etype: "PLAN",
	});
	const upd = await storage.updateDetails(ins.tid, "new details text");
	assert.strictEqual(upd.action, "updated");
	db.close();
});

test("EventsStorage full CRUD cycle", async () => {
	const { db, storage } = setup();
	const a = await storage.insert({ name: "A", start_date: "2024-01-01 10:00", end_date: "2024-01-01 11:00", etype: "PLAN" });
	await storage.insert({ name: "B", start_date: "2024-01-02 10:00", end_date: "2024-01-02 11:00", etype: "FACT", is_finished: true, score: 3 });
	let all = await storage.getAll({});
	assert.strictEqual(all.length, 2);
	await storage.update(a.tid, { text: "A2", start_date: "2024-01-01 10:00", end_date: "2024-01-01 11:00", etype: "PLAN" });
	all = await storage.getAll({});
	assert.strictEqual(all.find((e) => e.id == a.tid).name, "A2");
	await storage.delete(a.tid);
	all = await storage.getAll({});
	assert.strictEqual(all.length, 1);
	assert.strictEqual(all[0].name, "B");
	db.close();
});

// ==================== ETYPE BEHAVIOR TESTS ====================

test("etype PLAN preserves rec_pattern/rec_type and defaults is_finished=false", async () => {
	const { db, storage } = setup();
	const ins = await storage.insert({
		name: "Recurring Plan",
		start_date: "2024-01-01 10:00",
		end_date: "2024-04-01 11:00",
		etype: "PLAN",
		rec_type: "week_1___1#10",
		rec_pattern: "week_1___1",
		event_length: 3600,
	});
	const got = await storage.getOneByID(ins.tid, "myevents");
	assert.strictEqual(got.data.etype, "PLAN");
	assert.strictEqual(got.data.is_finished, "false");
	assert.strictEqual(got.data.rec_type, "week_1___1#10");
	assert.strictEqual(got.data.rec_pattern, "week_1___1");
	db.close();
});

test("etype PLAN with is_finished=true keeps rec and is_finished=true", async () => {
	const { db, storage } = setup();
	const ins = await storage.insert({
		name: "Done Plan",
		start_date: "2024-01-01 10:00",
		end_date: "2024-01-01 11:00",
		etype: "PLAN",
		is_finished: true,
		rec_type: "day_1#5",
		rec_pattern: "day_1",
		score: 7,
	});
	const got = await storage.getOneByID(ins.tid, "myevents");
	assert.strictEqual(got.data.etype, "PLAN");
	assert.strictEqual(got.data.is_finished, "true");
	assert.strictEqual(got.data.rec_type, "day_1#5");
	assert.strictEqual(got.data.score, 7);
	db.close();
});

test("etype FACT forces is_finished=true and clears rec_pattern/rec_type", async () => {
	const { db, storage } = setup();
	const ins = await storage.insert({
		name: "Fact",
		start_date: "2024-01-01 10:00",
		end_date: "2024-01-01 11:00",
		etype: "FACT",
		rec_type: "week_1___1#10",
		rec_pattern: "week_1___1",
	});
	const got = await storage.getOneByID(ins.tid, "myevents");
	assert.strictEqual(got.data.etype, "FACT");
	assert.strictEqual(got.data.is_finished, "true");
	// rec_pattern/rec_type are cleared by dhtml2db for non-PLAN
	assert.ok(!got.data.rec_type);
	assert.ok(!got.data.rec_pattern);
	db.close();
});

test("etype SPENT forces is_finished=true and clears rec_pattern/rec_type", async () => {
	const { db, storage } = setup();
	const ins = await storage.insert({
		name: "Spent",
		start_date: "2024-01-01 10:00",
		end_date: "2024-01-01 11:00",
		etype: "SPENT",
		rec_type: "day_1#3",
		rec_pattern: "day_1",
		score: -5,
	});
	const got = await storage.getOneByID(ins.tid, "myevents");
	assert.strictEqual(got.data.etype, "SPENT");
	assert.strictEqual(got.data.is_finished, "true");
	assert.ok(!got.data.rec_type);
	assert.ok(!got.data.rec_pattern);
	assert.strictEqual(got.data.score, -5);
	db.close();
});

test("etype FAILED_PLAN with is_finished=true is converted to PLAN and keeps rec", async () => {
	const { db, storage } = setup();
	const ins = await storage.insert({
		name: "Failed",
		start_date: "2024-01-01 10:00",
		end_date: "2024-04-01 11:00",
		etype: "FAILED_PLAN",
		is_finished: true,
		rec_type: "week_1___1#10",
		rec_pattern: "week_1___1",
	});
	const got = await storage.getOneByID(ins.tid, "myevents");
	// FAILED_PLAN + is_finished true -> etype becomes PLAN, is_finished stays true, rec preserved
	assert.strictEqual(got.data.etype, "PLAN");
	assert.strictEqual(got.data.is_finished, "true");
	assert.strictEqual(got.data.rec_type, "week_1___1#10");
	assert.strictEqual(got.data.rec_pattern, "week_1___1");
	db.close();
});

test("etype FAILED_PLAN with is_finished=false stays FAILED_PLAN and clears rec", async () => {
	const { db, storage } = setup();
	const ins = await storage.insert({
		name: "FailedUnfinished",
		start_date: "2024-01-01 10:00",
		end_date: "2024-01-01 11:00",
		etype: "FAILED_PLAN",
		is_finished: false,
		rec_type: "day_1#3",
		rec_pattern: "day_1",
	});
	const got = await storage.getOneByID(ins.tid, "myevents");
	// is_finished false + etype in [PLAN, FAILED_PLAN] -> first branch, stays FAILED_PLAN
	assert.strictEqual(got.data.etype, "FAILED_PLAN");
	assert.strictEqual(got.data.is_finished, "false");
	// then etype != "PLAN" -> rec cleared
	assert.ok(!got.data.rec_type);
	assert.ok(!got.data.rec_pattern);
	db.close();
});

test("etype SPENT with 白噪 in name and no score auto-calculates negative score", async () => {
	const { db, storage } = setup();
	const ins = await storage.insert({
		name: "白噪时间",
		start_date: "2024-01-01 10:00",
		end_date: "2024-01-01 11:00",
		etype: "SPENT",
	});
	const got = await storage.getOneByID(ins.tid, "myevents");
	assert.strictEqual(got.data.etype, "SPENT");
	// duration 1h = 3600000ms; /600000 = 6 ; score = -max(0, 6) = -6
	assert.strictEqual(got.data.score, -6);
	db.close();
});

test("update from PLAN to FACT clears rec_pattern/rec_type", async () => {
	const { db, storage } = setup();
	const ins = await storage.insert({
		name: "PlanToFact",
		start_date: "2024-01-01 10:00",
		end_date: "2024-01-01 11:00",
		etype: "PLAN",
		rec_type: "day_1#5",
		rec_pattern: "day_1",
	});
	await storage.update(ins.tid, {
		text: "PlanToFact",
		start_date: "2024-01-01 10:00",
		end_date: "2024-01-01 11:00",
		etype: "FACT",
		is_finished: true,
		score: 2,
	});
	const got = await storage.getOneByID(ins.tid, "myevents");
	assert.strictEqual(got.data.etype, "FACT");
	assert.strictEqual(got.data.is_finished, "true");
	assert.ok(!got.data.rec_type);
	assert.ok(!got.data.rec_pattern);
	db.close();
});

test("update FACT back to PLAN restores ability to hold rec_pattern/rec_type", async () => {
	const { db, storage } = setup();
	const ins = await storage.insert({
		name: "FactToPlan",
		start_date: "2024-01-01 10:00",
		end_date: "2024-01-01 11:00",
		etype: "FACT",
		is_finished: true,
		score: 1,
	});
	await storage.update(ins.tid, {
		text: "FactToPlan",
		start_date: "2024-01-01 10:00",
		end_date: "2024-04-01 11:00",
		etype: "PLAN",
		is_finished: false,
		rec_type: "week_1___1#4",
		rec_pattern: "week_1___1",
		event_length: 3600,
	});
	const got = await storage.getOneByID(ins.tid, "myevents");
	assert.strictEqual(got.data.etype, "PLAN");
	assert.strictEqual(got.data.is_finished, "false");
	assert.strictEqual(got.data.rec_type, "week_1___1#4");
	assert.strictEqual(got.data.rec_pattern, "week_1___1");
	db.close();
});

// ==================== ISO8601 WITH OFFSET TESTS ====================

test("insert with positive ISO8601 offset stores zoned format and round-trips", async () => {
	const { db, storage } = setup();
	const ins = await storage.insert({
		name: "ZonedPos",
		start_date: "2024-01-01 11:00",
		start_date_timezoneoffset: 120, // +02:00
		end_date: "2024-01-01 12:00",
		end_date_timezoneoffset: 120,
		etype: "PLAN",
	});
	// raw row should contain ISO8601 "T" marker
	const raw = await storage._query_all_sql();
	assert.strictEqual(raw.length, 1);
	assert.ok(raw[0].start_date.indexOf("T") !== -1, `expected T in ${raw[0].start_date}`);
	assert.ok(raw[0].start_date.indexOf("+02:00") !== -1, `expected +02:00 in ${raw[0].start_date}`);

	const got = await storage.getOneByID(ins.tid, "myevents");
	// offset preserved
	assert.strictEqual(got.data.start_date_timezoneoffset, 120);
	assert.strictEqual(got.data.end_date_timezoneoffset, 120);
	// absolute moment is TZ-independent: 2024-01-01T11:00:00+02:00 == UTC 09:00
	assert.strictEqual(got.data.start_date_dateobj.getTime(), Date.UTC(2024, 0, 1, 9, 0, 0));
	assert.strictEqual(got.data.end_date_dateobj.getTime(), Date.UTC(2024, 0, 1, 10, 0, 0));
	db.close();
});

test("insert with negative ISO8601 offset stores zoned format and round-trips", async () => {
	const { db, storage } = setup();
	const ins = await storage.insert({
		name: "ZonedNeg",
		start_date: "2024-01-01 11:00",
		start_date_timezoneoffset: -300, // -05:00
		end_date: "2024-01-01 12:00",
		end_date_timezoneoffset: -300,
		etype: "PLAN",
	});
	const raw = await storage._query_all_sql();
	assert.ok(raw[0].start_date.indexOf("T") !== -1);
	assert.ok(raw[0].start_date.indexOf("-05:00") !== -1);

	const got = await storage.getOneByID(ins.tid, "myevents");
	assert.strictEqual(got.data.start_date_timezoneoffset, -300);
	// 2024-01-01T11:00:00-05:00 == UTC 16:00
	assert.strictEqual(got.data.start_date_dateobj.getTime(), Date.UTC(2024, 0, 1, 16, 0, 0));
	db.close();
});

test("ISO8601 offset with non-zero minutes (e.g. +05:30) round-trips", async () => {
	const { db, storage } = setup();
	const ins = await storage.insert({
		name: "ZonedIndia",
		start_date: "2024-01-01 11:00",
		start_date_timezoneoffset: 330, // +05:30
		end_date: "2024-01-01 12:00",
		end_date_timezoneoffset: 330,
		etype: "PLAN",
	});
	const raw = await storage._query_all_sql();
	assert.ok(raw[0].start_date.indexOf("+05:30") !== -1, `expected +05:30 in ${raw[0].start_date}`);
	const got = await storage.getOneByID(ins.tid, "myevents");
	assert.strictEqual(got.data.start_date_timezoneoffset, 330);
	// 2024-01-01T11:00:00+05:30 == UTC 05:30
	assert.strictEqual(got.data.start_date_dateobj.getTime(), Date.UTC(2024, 0, 1, 5, 30, 0));
	db.close();
});

test("floating-time and ISO8601 events coexist and are distinguishable", async () => {
	const { db, storage } = setup();
	await storage.insert({
		name: "Floating",
		start_date: "2024-01-01 10:00",
		end_date: "2024-01-01 11:00",
		etype: "PLAN",
	});
	await storage.insert({
		name: "Zoned",
		start_date: "2024-01-01 10:00",
		start_date_timezoneoffset: 60, // +01:00
		end_date: "2024-01-01 11:00",
		end_date_timezoneoffset: 60,
		etype: "PLAN",
	});
	const raw = await storage._query_all_sql();
	const floatingRow = raw.find((r) => r.name === "Floating");
	const zonedRow = raw.find((r) => r.name === "Zoned");
	assert.ok(floatingRow.start_date.indexOf("T") === -1, "floating should not contain T");
	assert.ok(zonedRow.start_date.indexOf("T") !== -1, "zoned should contain T");

	const all = await storage.getAll({});
	const floatingEv = all.find((e) => e.name === "Floating");
	const zonedEv = all.find((e) => e.name === "Zoned");
	// floating events have no timezoneoffset field set
	assert.ok(floatingEv.start_date_timezoneoffset === undefined || floatingEv.start_date_timezoneoffset === "");
	assert.strictEqual(zonedEv.start_date_timezoneoffset, 60);
	// floating stored without "T", zoned stored with "T" (already asserted on raw rows above)
	db.close();
});

test("update with ISO8601 offset changes stored format to zoned", async () => {
	const { db, storage } = setup();
	const ins = await storage.insert({
		name: "ToZone",
		start_date: "2024-01-01 10:00",
		end_date: "2024-01-01 11:00",
		etype: "PLAN",
	});
	let raw = await storage._query_all_sql();
	assert.ok(raw[0].start_date.indexOf("T") === -1);

	await storage.update(ins.tid, {
		text: "ToZone",
		start_date: "2024-01-01 10:00",
		start_date_timezoneoffset: 120,
		end_date: "2024-01-01 11:00",
		end_date_timezoneoffset: 120,
		etype: "PLAN",
	});
	raw = await storage._query_all_sql();
	assert.ok(raw[0].start_date.indexOf("T") !== -1);
	assert.ok(raw[0].start_date.indexOf("+02:00") !== -1);

	const got = await storage.getOneByID(ins.tid, "myevents");
	assert.strictEqual(got.data.start_date_timezoneoffset, 120);
	assert.strictEqual(got.data.start_date_dateobj.getTime(), Date.UTC(2024, 0, 1, 8, 0, 0));
	db.close();
});

test("getAll from/to filtering works with ISO8601 zoned dates", async () => {
	const { db, storage } = setup();
	await storage.insert({
		name: "ZonedA",
		start_date: "2024-01-10 10:00",
		start_date_timezoneoffset: 120,
		end_date: "2024-01-10 11:00",
		end_date_timezoneoffset: 120,
		etype: "PLAN",
	});
	await storage.insert({
		name: "ZonedB",
		start_date: "2024-02-10 10:00",
		start_date_timezoneoffset: 120,
		end_date: "2024-02-10 11:00",
		end_date_timezoneoffset: 120,
		etype: "PLAN",
	});
	// window covering only January
	const jan = await storage.getAll({ from: "2024-01-01", to: "2024-02-01" });
	assert.strictEqual(jan.length, 1);
	assert.strictEqual(jan[0].name, "ZonedA");
	// window covering only February
	const feb = await storage.getAll({ from: "2024-02-01", to: "2024-03-01" });
	assert.strictEqual(feb.length, 1);
	assert.strictEqual(feb[0].name, "ZonedB");
	db.close();
});

// ==================== REC_PATTERN / REC_TYPE + SCHEDULER TESTS ====================

function makeSeries(overrides = {}) {
	return Object.assign({
		id: 1,
		text: "WeeklySeries",
		name: "WeeklySeries",
		start_date: "2024-01-01 10:00",
		end_date: "2024-04-01 11:00",
		start_date_dateobj: new Date(2024, 0, 1, 10, 0),
		end_date_dateobj: new Date(2024, 3, 1, 11, 0),
		rec_type: "week_1___1#10",
		rec_pattern: "week_1___1",
		event_length: 3600,
		etype: "PLAN",
		is_finished: "false",
	}, overrides);
}

test("scheduler.transpose_type builds transpose functions for day/week/month patterns", () => {
	scheduler.transpose_type("day_1");
	assert.strictEqual(typeof scheduler.date["transpose_day_1"], "function");
	assert.strictEqual(typeof scheduler.date["add_day_1"], "function");

	scheduler.transpose_type("week_1___1");
	assert.strictEqual(typeof scheduler.date["transpose_week_1___1"], "function");
	assert.strictEqual(typeof scheduler.date["add_week_1___1"], "function");

	scheduler.transpose_type("month_1");
	assert.strictEqual(typeof scheduler.date["transpose_month_1"], "function");
	assert.strictEqual(typeof scheduler.date["add_month_1"], "function");
});

test("scheduler.repeat_date generates weekly Monday occurrences", () => {
	const ev = makeSeries();
	scheduler._min_date = new Date(2024, 0, 1);
	scheduler._max_date = new Date(2024, 1, 15); // ~6.5 weeks
	const stack = [];
	scheduler.repeat_date(ev, stack);
	// Jan 1, 8, 15, 22, 29, Feb 5, 12 -> 7 occurrences
	assert.strictEqual(stack.length, 7);
	// every occurrence id has the "seriesId#timestamp" shape
	assert.ok(stack[0].id.indexOf("#") !== -1);
	assert.strictEqual(stack[0].event_pid, 1);
	// each occurrence is a Monday (getDay()===1)
	for (const occ of stack) {
		assert.strictEqual(occ.start_date_dateobj.getDay(), 1);
	}
	// first occurrence is the series start
	assert.strictEqual(stack[0].start_date_dateobj.getTime(), new Date(2024, 0, 1, 10, 0).getTime());
});

test("scheduler.repeat_date occurrences start at series start and span 1 hour", () => {
	const ev = makeSeries();
	scheduler._min_date = new Date(2024, 0, 1);
	scheduler._max_date = new Date(2024, 1, 15);
	const stack = [];
	scheduler.repeat_date(ev, stack);
	assert.strictEqual(stack[0].start_date_dateobj.getTime(), new Date(2024, 0, 1, 10, 0).getTime());
	assert.strictEqual(stack[0].end_date_dateobj.getTime(), new Date(2024, 0, 1, 11, 0).getTime());
	// second occurrence one week later
	assert.strictEqual(stack[1].start_date_dateobj.getTime(), new Date(2024, 0, 8, 10, 0).getTime());
});

test("scheduler.repeat_date daily pattern generates consecutive days", () => {
	const ev = makeSeries({
		rec_type: "day_1#5",
		rec_pattern: "day_1",
		start_date: "2024-01-01 08:00",
		start_date_dateobj: new Date(2024, 0, 1, 8, 0),
		end_date: "2024-01-10 09:00",
		end_date_dateobj: new Date(2024, 0, 10, 9, 0),
		event_length: 3600,
	});
	scheduler._min_date = new Date(2024, 0, 1);
	scheduler._max_date = new Date(2024, 0, 5);
	const stack = [];
	scheduler.repeat_date(ev, stack);
	// Jan 1,2,3,4 -> 4 occurrences (max_date Jan 5 excludes Jan 5 08:00 start? Jan5 < Jan5 is false)
	assert.ok(stack.length >= 3 && stack.length <= 4);
	assert.strictEqual(stack[0].start_date_dateobj.getDate(), 1);
	assert.strictEqual(stack[1].start_date_dateobj.getDate(), 2);
});

test("scheduler.mtrue_copy_series_event returns occurrence within range", () => {
	const ev = makeSeries();
	scheduler._min_date = new Date(2024, 0, 1);
	scheduler._max_date = new Date(2024, 1, 15);
	// date_provided = Jan 1 00:00, time_now = Jan 1 12:00 -> first occ (ends 11:00) matches
	const copy = scheduler.mtrue_copy_series_event(ev, new Date(2024, 0, 1, 0, 0), new Date(2024, 0, 1, 12, 0));
	assert.ok(copy !== null);
	assert.strictEqual(Number(copy.event_pid), 1);
	assert.strictEqual(copy.name, "WeeklySeries");
	assert.strictEqual(copy.id, null);
	assert.ok(copy.event_length !== undefined);
	// rec cleared on the materialized occurrence
	assert.ok(copy.rec_pattern === undefined);
	assert.ok(copy.rec_type === undefined);
});

test("scheduler.mtrue_copy_series_event returns null when no occurrence in range", () => {
	const ev = makeSeries();
	scheduler._min_date = new Date(2024, 0, 1);
	scheduler._max_date = new Date(2024, 1, 15);
	// date_provided in 2025, time_now in 2024 -> no occurrence ends within [2025, 2024]
	const copy = scheduler.mtrue_copy_series_event(ev, new Date(2025, 0, 1), new Date(2024, 0, 1, 0, 0));
	assert.strictEqual(copy, null);
});

// ==================== DUMMY COPY / OCCURRENCE MATERIALIALIZATION ====================

test("insert with id containing '#' materializes a series occurrence (insert_dummy_copy)", async () => {
	const { db, storage } = setup();
	const series = await storage.insert({
		name: "SeriesRoot",
		start_date: "2024-01-01 10:00",
		end_date: "2024-04-01 11:00",
		etype: "PLAN",
		rec_type: "week_1___1#10",
		rec_pattern: "week_1___1",
		event_length: 3600,
	});
	const seriesId = series.tid;

	const dummy = {
		id: `${seriesId}#1704067200`,
		text: "SeriesRoot",
		start_date: "2024-01-01 10:00",
		end_date: "2024-01-01 11:00",
		etype: "PLAN",
	};
	const res = await storage.insert(dummy);
	assert.strictEqual(res.action, "inserted");
	assert.ok(res.tid);
	assert.ok(res.tid !== seriesId, "occurrence should get a new id");

	const all = await storage.getAll({});
	assert.strictEqual(all.length, 2);
	const occurrence = all.find((e) => String(e.id) !== String(seriesId));
	assert.ok(occurrence, "occurrence row should exist");
	assert.strictEqual(Number(occurrence.event_pid), Number(seriesId));
	assert.ok(occurrence.event_length !== undefined && occurrence.event_length !== null);
	assert.ok(!occurrence.rec_type, "materialized occurrence should not have rec_type");
	db.close();
});

test("insert_dummy_copy is idempotent: second insert of same occurrence returns query", async () => {
	const { db, storage } = setup();
	const series = await storage.insert({
		name: "SeriesRoot2",
		start_date: "2024-01-01 10:00",
		end_date: "2024-04-01 11:00",
		etype: "PLAN",
		rec_type: "week_1___1#10",
		rec_pattern: "week_1___1",
		event_length: 3600,
	});
	const seriesId = series.tid;
	const dummy = {
		id: `${seriesId}#1704067200`,
		text: "SeriesRoot2",
		start_date: "2024-01-01 10:00",
		end_date: "2024-01-01 11:00",
		etype: "PLAN",
	};
	const first = await storage.insert(dummy);
	assert.strictEqual(first.action, "inserted");
	const second = await storage.insert(dummy);
	assert.strictEqual(second.action, "query");
	// still only 2 rows total (series + 1 occurrence)
	const all = await storage.getAll({});
	assert.strictEqual(all.length, 2);
	db.close();
});

test("delete on a series also deletes its materialized occurrences (event_pid cleanup)", async () => {
	const { db, storage } = setup();
	const series = await storage.insert({
		name: "SeriesForDelete",
		start_date: "2024-01-01 10:00",
		end_date: "2024-04-01 11:00",
		etype: "PLAN",
		rec_type: "week_1___1#10",
		rec_pattern: "week_1___1",
		event_length: 3600,
	});
	const seriesId = series.tid;
	await storage.insert({
		id: `${seriesId}#1704067200`,
		text: "SeriesForDelete",
		start_date: "2024-01-01 10:00",
		end_date: "2024-01-01 11:00",
		etype: "PLAN",
	});
	let all = await storage.getAll({});
	assert.strictEqual(all.length, 2);
	await storage.delete(seriesId);
	all = await storage.getAll({});
	assert.strictEqual(all.length, 0);
	db.close();
});

// ==================== updateFailedPlan LOGIC ====================

test("updateFailedPlan marks past unfinished PLAN as FAILED_PLAN", async () => {
	const { db, storage } = setup();
	const past = await storage.insert({
		name: "PastPlan",
		start_date: "2024-01-01 10:00",
		end_date: "2024-01-01 11:00",
		etype: "PLAN",
	});
	await storage.updateFailedPlan(new Date());
	const got = await storage.getOneByID(past.tid, "myevents");
	assert.strictEqual(got.data.etype, "FAILED_PLAN");
	assert.strictEqual(got.data.is_finished, "false");
	db.close();
});

test("updateFailedPlan leaves future PLAN unchanged", async () => {
	const { db, storage } = setup();
	const future = await storage.insert({
		name: "FuturePlan",
		start_date: "2099-01-01 10:00",
		end_date: "2099-01-01 11:00",
		etype: "PLAN",
	});
	await storage.updateFailedPlan(new Date());
	const got = await storage.getOneByID(future.tid, "myevents");
	assert.strictEqual(got.data.etype, "PLAN");
	assert.strictEqual(got.data.is_finished, "false");
	db.close();
});

test("updateFailedPlan leaves already-finished FACT untouched", async () => {
	const { db, storage } = setup();
	const fact = await storage.insert({
		name: "DoneFact",
		start_date: "2024-01-01 10:00",
		end_date: "2024-01-01 11:00",
		etype: "FACT",
		is_finished: true,
		score: 5,
	});
	await storage.updateFailedPlan(new Date());
	const got = await storage.getOneByID(fact.tid, "myevents");
	assert.strictEqual(got.data.etype, "FACT");
	assert.strictEqual(got.data.is_finished, "true");
	assert.strictEqual(got.data.score, 5);
	db.close();
});

// ==================== getStatistic with etypes ====================

test("getStatistic aggregates scoreNow and failedAll across etypes", async () => {
	const { db, storage } = setup();
	// finished FACT with score 10 -> counts toward scoreNow
	await storage.insert({
		name: "ScoredFact",
		start_date: "2024-01-01 08:00",
		end_date: "2024-01-01 09:00",
		etype: "FACT",
		is_finished: true,
		score: 10,
	});
	// unfinished PLAN in the past -> counts toward failedAll
	await storage.insert({
		name: "FailedPastPlan",
		start_date: "2024-01-01 10:00",
		end_date: "2024-01-01 11:00",
		etype: "PLAN",
	});
	// future PLAN -> not counted as failed
	await storage.insert({
		name: "FuturePlan",
		start_date: "2099-01-01 10:00",
		end_date: "2099-01-01 11:00",
		etype: "PLAN",
	});
	const stats = await storage.getStatistic({});
	assert.strictEqual(stats.scoreNow, 10);
	assert.ok(stats.failedAll >= 1, `expected failedAll >= 1, got ${stats.failedAll}`);
	db.close();
});
