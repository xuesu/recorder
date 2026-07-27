const test = require("node:test");
const assert = require("node:assert");
const StorageNote = require("../../backend/data/storage_note_local");
const { createDb } = require("../helpers/db");

function setup() {
	const db = createDb();
	const storage = new StorageNote(db);
	return { db, storage };
}

function getTableNames(db) {
	return new Promise((resolve, reject) => db.all(
		"SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
		[],
		(err, rows) => (err ? reject(err) : resolve(rows.map((r) => r.name)))
	));
}

test("StorageNote auto-creates mynotes table on an empty db", async () => {
	const { db, storage } = setup();
	const tables = await getTableNames(db);
	assert.ok(tables.indexOf("mynotes") !== -1, `expected mynotes auto-created, got [${tables.join(", ")}]`);
	db.close();
});

test("StorageNote insert -> getAll (Create + Read)", async () => {
	const { db, storage } = setup();
	const res = await storage.insert({ title: "My Note", content: "Hello world" }, "note");
	assert.strictEqual(res.action, "inserted");
	assert.ok(res.tid);

	const all = await storage.getAll({}, undefined, "note");
	assert.strictEqual(all.action, "query");
	assert.strictEqual(all.data.length, 1);
	assert.strictEqual(all.data[0].title, "My Note");
	assert.strictEqual(all.data[0].content, "Hello world");
	assert.ok(all.data[0].date_create);
	db.close();
});

test("StorageNote update (Update)", async () => {
	const { db, storage } = setup();
	const ins = await storage.insert({ title: "Old", content: "old body" }, "note");
	const upd = await storage.update(ins.tid, { title: "New", content: "new body" }, "note");
	assert.strictEqual(upd.action, "updated");

	const all = await storage.getAll({}, undefined, "note");
	assert.strictEqual(all.data[0].title, "New");
	assert.strictEqual(all.data[0].content, "new body");
	db.close();
});

test("StorageNote delete (Delete)", async () => {
	const { db, storage } = setup();
	const ins = await storage.insert({ title: "Gone", content: "bye" }, "note");
	const del = await storage.delete(ins.tid, "note");
	assert.strictEqual(del.action, "deleted");
	const all = await storage.getAll({}, undefined, "note");
	assert.strictEqual(all.data.length, 0);
	db.close();
});

test("StorageNote getOneByID", async () => {
	const { db, storage } = setup();
	const ins = await storage.insert({ title: "Find", content: "x" }, "note");
	const got = await storage.getOneByID(ins.tid, "note");
	assert.strictEqual(got.action, "query");
	assert.strictEqual(got.data.title, "Find");
	const missing = await storage.getOneByID(99999, "note");
	assert.strictEqual(missing.action, "error");
	db.close();
});

test("StorageNote getAllNoteTitleWithIDSorted only returns pinned", async () => {
	const { db, storage } = setup();
	await storage.insert({ title: "Unpinned", content: "x", pinned_level: -1 }, "note");
	await storage.insert({ title: "PinnedA", content: "x", pinned_level: 1 }, "note");
	await storage.insert({ title: "PinnedB", content: "x", pinned_level: 5 }, "note");
	const res = await storage.getAllNoteTitleWithIDSorted("note");
	assert.ok(Array.isArray(res.data));
	assert.strictEqual(res.data.length, 2);
	const titles = res.data.map((r) => r.title).sort();
	assert.deepStrictEqual(titles, ["PinnedA", "PinnedB"]);
	db.close();
});

test("StorageNote rejects title retrieval for non-note type", async () => {
	const { db, storage } = setup();
	await assert.rejects(() => storage.getAllNoteTitleWithIDSorted("notice"));
	db.close();
});
