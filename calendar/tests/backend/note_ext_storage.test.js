const test = require("node:test");
const assert = require("node:assert");
const EventsStorage = require("../../backend/data/storage_local");
const StorageNote = require("../../backend/data/storage_note_local");
const StorageNoteExt = require("../../backend/data/storage_note_ext_local");
const { createDb } = require("../helpers/db");

function setup() {
	const db = createDb();
	const eventStorage = new EventsStorage(db);
	const noteStorage = new StorageNote(db);
	const noteExt = new StorageNoteExt(eventStorage, noteStorage);
	return { db, eventStorage, noteStorage, noteExt };
}

test("StorageNoteExt create -> getOneByName (Create + Read) for dailycheck", async () => {
	const { db, noteExt } = setup();
	const created = await noteExt.create("2024-01-15", "dailycheck");
	assert.strictEqual(created.action, "query");
	assert.ok(created.data);
	assert.ok(created.data.id);
	assert.strictEqual(created.data.title, "dailycheck_2024-01-15");

	const got = await noteExt.getOneByName("2024-01-15", "dailycheck");
	assert.strictEqual(got.action, "query");
	assert.strictEqual(got.data.title, "dailycheck_2024-01-15");
	db.close();
});

test("StorageNoteExt update (Update) for dailycheck", async () => {
	const { db, noteExt } = setup();
	await noteExt.create("2024-01-16", "dailycheck");
	const updated = await noteExt.update(
		"2024-01-16",
		{ text: "## TODO\n- [x] 5: TaskOne\n" },
		"dailycheck"
	);
	assert.strictEqual(updated.action, "query");
	assert.ok(updated.data.content.indexOf("TaskOne") !== -1);

	const got = await noteExt.getOneByName("2024-01-16", "dailycheck");
	assert.ok(got.data.content.indexOf("TaskOne") !== -1);
	db.close();
});

test("StorageNoteExt delete (Delete) for dailycheck", async () => {
	const { db, noteExt, eventStorage } = setup();
	await noteExt.create("2024-01-17", "dailycheck");
	const before = await noteExt.getOneByName("2024-01-17", "dailycheck");
	assert.ok(before.data);

	const del = await noteExt.delete("2024-01-17", "dailycheck");
	assert.strictEqual(del.action, "deleted");

	const after = await noteExt.getOneByName("2024-01-17", "dailycheck");
	assert.strictEqual(after.data, undefined);
	db.close();
});

test("StorageNoteExt create is idempotent (no duplicate on second create)", async () => {
	const { db, noteExt, eventStorage } = setup();
	await noteExt.create("2024-02-01", "dailycheck");
	await noteExt.create("2024-02-01", "dailycheck");
	const all = await eventStorage.getAll({});
	const matches = all.filter((e) => e.name === "dailycheck_2024-02-01");
	assert.strictEqual(matches.length, 1);
	db.close();
});

test("StorageNoteExt update on non-existent returns error", async () => {
	const { db, noteExt } = setup();
	const res = await noteExt.update("2024-03-01", { text: "## TODO\n- [x] 5: X\n" }, "dailycheck");
	assert.strictEqual(res.action, "error");
	db.close();
});

test("StorageNoteExt create returns a query error without inserting", async () => {
	let insertCalled = false;
	const eventStorage = {
		_insert_sql: async () => {
			insertCalled = true;
		}
	};
	const noteExt = new StorageNoteExt(eventStorage, {});
	noteExt.getOneByName = async () => ({ action: "error" });

	const res = await noteExt.create("2024-03-02", "dailycheck");
	assert.strictEqual(res.action, "error");
	assert.strictEqual(insertCalled, false);
});

test("StorageNoteExt update returns an error when its initial query rejects", async () => {
	const eventStorage = {
		_query_name_sql: async () => {
			throw new Error("query failed");
		},
		_update_sql: async () => {
			throw new Error("update should not run");
		}
	};
	const noteExt = new StorageNoteExt(eventStorage, {});

	const res = await noteExt.update(
		"2024-03-03",
		{ text: "## TODO\n- [x] 5: X\n" },
		"dailycheck"
	);
	assert.strictEqual(res.action, "error");
	assert.strictEqual(res.message, "cannot query note event before update");
});

test("StorageNoteExt getNoteEventInstanceName naming for weekplan/monthplan", async () => {
	const { db, noteExt } = setup();
	// 2024-01-17 is a Wednesday; weekplan snaps to Monday 2024-01-15
	const created = await noteExt.create("2024-01-17", "weekplan");
	assert.strictEqual(created.action, "query");
	assert.strictEqual(created.data.title, "weekplan_2024-01-15");

	// monthplan snaps to the 1st of the month
	const createdM = await noteExt.create("2024-01-20", "monthplan");
	assert.strictEqual(createdM.data.title, "monthplan_2024-01-01");
	db.close();
});
