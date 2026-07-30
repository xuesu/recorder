const test = require("node:test");
const assert = require("node:assert");
const { createDb } = require("../helpers/db");
const StorageMemEntry = require("../../backend/memquiz/storage_mementry");

async function setup() {
	const db = createDb();
	const storage = new StorageMemEntry(db);
	return { db, storage };
}

function getTableNames(db) {
	return new Promise((resolve, reject) => db.all(
		"SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
		[],
		(err, rows) => (err ? reject(err) : resolve(rows.map((r) => r.name)))
	));
}

test("StorageMemEntry auto-creates all tables on an empty db", async () => {
	const { db, storage } = await setup();
	const tables = await getTableNames(db);
	for (const t of ["mymetadata", "mementries", "memgroups", "membooks", "memlectures"]) {
		assert.ok(tables.indexOf(t) !== -1, `expected table ${t} to be auto-created, got [${tables.join(", ")}]`);
	}
	db.close();
});

test("StorageMemEntry mementries insert -> getAll (Create + Read)", async () => {
	const { db, storage } = await setup();
	const res = await storage.insert({ name: "Entry1", text: "question?", lecture_id: 1 }, "mementries");
	assert.strictEqual(res.action, "inserted");
	assert.ok(res.tid);

	const all = await storage.getAll({}, undefined, "mementries");
	assert.strictEqual(all.action, "query");
	assert.strictEqual(all.data.length, 1);
	assert.strictEqual(all.data[0].name, "Entry1");
	assert.strictEqual(all.data[0].text, "question?");
	assert.ok(Array.isArray(all.data[0].group_ids));
	assert.ok(all.data[0].time_create);
	db.close();
});

test("StorageMemEntry mementries update (Update)", async () => {
	const { db, storage } = await setup();
	const ins = await storage.insert({ name: "Entry1", text: "q" }, "mementries");
	const upd = await storage.update(ins.tid, { name: "Entry1-updated", text: "q2" }, "mementries");
	assert.strictEqual(upd.action, "updated");
	const all = await storage.getAll({}, undefined, "mementries");
	assert.strictEqual(all.data[0].name, "Entry1-updated");
	assert.strictEqual(all.data[0].text, "q2");
	db.close();
});

test("StorageMemEntry mementries delete (Delete)", async () => {
	const { db, storage } = await setup();
	const ins = await storage.insert({ name: "Entry1", text: "q" }, "mementries");
	const del = await storage.delete(ins.tid, "mementries");
	assert.strictEqual(del.action, "deleted");
	const all = await storage.getAll({}, undefined, "mementries");
	assert.strictEqual(all.data.length, 0);
	db.close();
});

test("StorageMemEntry mementries getOneByID", async () => {
	const { db, storage } = await setup();
	const ins = await storage.insert({ name: "Entry1", text: "q" }, "mementries");
	const got = await storage.getOneByID(ins.tid, "mementries");
	assert.strictEqual(got.action, "query");
	assert.strictEqual(got.data.name, "Entry1");
	const missing = await storage.getOneByID(99999, "mementries");
	assert.strictEqual(missing.action, "error");
	db.close();
});

test("StorageMemEntry group_ids array <-> string serialization", async () => {
	const { db, storage } = await setup();
	const ins = await storage.insert({ name: "G", text: "t", group_ids: [1, 2, 3] }, "mementries");
	const got = await storage.getOneByID(ins.tid, "mementries");
	assert.deepStrictEqual(got.data.group_ids, [1, 2, 3]);
	db.close();
});

test("StorageMemEntry test_histogram JSON serialization", async () => {
	const { db, storage } = await setup();
	const hist = [{ R: 1, TIME: 1700000000000, T: 2, F: 1 }];
	const ins = await storage.insert({ name: "H", text: "t", test_histogram: hist }, "mementries");
	const got = await storage.getOneByID(ins.tid, "mementries");
	assert.deepStrictEqual(got.data.test_histogram, hist);
	db.close();
});

test("StorageMemEntry memgroups CRUD", async () => {
	const { db, storage } = await setup();
	const ins = await storage.insert({ name: "Group1", text: "g" }, "memgroups");
	assert.strictEqual(ins.action, "inserted");
	let all = await storage.getAll({}, undefined, "memgroups");
	assert.strictEqual(all.data.length, 1);
	assert.strictEqual(all.data[0].name, "Group1");

	await storage.update(ins.tid, { name: "Group1-up" }, "memgroups");
	all = await storage.getAll({}, undefined, "memgroups");
	assert.strictEqual(all.data[0].name, "Group1-up");

	await storage.delete(ins.tid, "memgroups");
	all = await storage.getAll({}, undefined, "memgroups");
	assert.strictEqual(all.data.length, 0);
	db.close();
});

test("StorageMemEntry membooks CRUD", async () => {
	const { db, storage } = await setup();
	const ins = await storage.insert({ name: "Book1" }, "membooks");
	assert.strictEqual(ins.action, "inserted");
	let all = await storage.getAll({}, undefined, "membooks");
	assert.strictEqual(all.data.length, 1);

	await storage.update(ins.tid, { name: "Book1-up" }, "membooks");
	all = await storage.getAll({}, undefined, "membooks");
	assert.strictEqual(all.data[0].name, "Book1-up");

	await storage.delete(ins.tid, "membooks");
	all = await storage.getAll({}, undefined, "membooks");
	assert.strictEqual(all.data.length, 0);
	db.close();
});

test("StorageMemEntry memlectures CRUD", async () => {
	const { db, storage } = await setup();
	const ins = await storage.insert({ name: "Lec1", book_id: 1 }, "memlectures");
	assert.strictEqual(ins.action, "inserted");
	let all = await storage.getAll({}, undefined, "memlectures");
	assert.strictEqual(all.data.length, 1);
	assert.strictEqual(all.data[0].name, "Lec1");

	await storage.update(ins.tid, { name: "Lec1-up" }, "memlectures");
	all = await storage.getAll({}, undefined, "memlectures");
	assert.strictEqual(all.data[0].name, "Lec1-up");

	await storage.delete(ins.tid, "memlectures");
	all = await storage.getAll({}, undefined, "memlectures");
	assert.strictEqual(all.data.length, 0);
	db.close();
});
