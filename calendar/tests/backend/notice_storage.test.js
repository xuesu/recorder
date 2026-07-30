const test = require("node:test");
const assert = require("node:assert");
const { createDb } = require("../helpers/db");
const StorageNotice = require("../../backend/data/storage_notice_local");

function setup() {
	const db = createDb();
	const storage = new StorageNotice(db);
	return { db, storage };
}

function getTableNames(db) {
	return new Promise((resolve, reject) => db.all(
		"SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
		[],
		(err, rows) => (err ? reject(err) : resolve(rows.map((r) => r.name)))
	));
}

test("StorageNotice auto-creates mynotices table on an empty db", async () => {
	const { db, storage } = await setup();
	const tables = await getTableNames(db);
	assert.ok(tables.indexOf("mynotices") !== -1, `expected mynotices auto-created, got [${tables.join(", ")}]`);
	db.close();
});

test("StorageNotice insert -> getAll (Create + Read)", async () => {
	const { db, storage } = await setup();
	const res = await storage.insert(
		{ date_show: "2024-01-01 00:00", date_hide: "2024-12-31 23:59", text: "Notice!", info_level: 1 },
		"notice"
	);
	assert.strictEqual(res.action, "inserted");
	assert.ok(res.tid);

	const all = await storage.getAll({}, undefined, "notice");
	assert.strictEqual(all.action, "query");
	assert.strictEqual(all.data.length, 1);
	assert.strictEqual(all.data[0].text, "Notice!");
	assert.strictEqual(all.data[0].info_level, 1);
	db.close();
});

test("StorageNotice update (Update)", async () => {
	const { db, storage } = await setup();
	const ins = await storage.insert(
		{ date_show: "2024-01-01 00:00", date_hide: "2024-12-31 23:59", text: "Old" },
		"notice"
	);
	const upd = await storage.update(
		ins.tid,
		{ date_show: "2024-01-01 00:00", date_hide: "2024-12-31 23:59", text: "New" },
		"notice"
	);
	assert.strictEqual(upd.action, "updated");
	const all = await storage.getAll({}, undefined, "notice");
	assert.strictEqual(all.data[0].text, "New");
	db.close();
});

test("StorageNotice delete (Delete)", async () => {
	const { db, storage } = await setup();
	const ins = await storage.insert(
		{ date_show: "2024-01-01 00:00", date_hide: "2024-12-31 23:59", text: "Bye" },
		"notice"
	);
	const del = await storage.delete(ins.tid, "notice");
	assert.strictEqual(del.action, "deleted");
	const all = await storage.getAll({}, undefined, "notice");
	assert.strictEqual(all.data.length, 0);
	db.close();
});

test("StorageNotice getOneByID", async () => {
	const { db, storage } = await setup();
	const ins = await storage.insert(
		{ date_show: "2024-01-01 00:00", date_hide: "2024-12-31 23:59", text: "Find" },
		"notice"
	);
	const got = await storage.getOneByID(ins.tid, "notice");
	assert.strictEqual(got.action, "query");
	assert.strictEqual(got.data.text, "Find");
	const missing = await storage.getOneByID(99999, "notice");
	assert.strictEqual(missing.action, "error");
	db.close();
});

test("StorageNotice getAll postprocess date_show=afternow filter", async () => {
	const { db, storage } = await setup();
	const past = new Date(Date.now() - 2 * 24 * 3600 * 1000);
	const future = new Date(Date.now() + 2 * 24 * 3600 * 1000);
	const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} 00:00`;
	await storage.insert({ date_show: fmt(past), date_hide: "9999-01-01 00:00", text: "pastNotice" }, "notice");
	await storage.insert({ date_show: fmt(future), date_hide: "9999-01-01 00:00", text: "futureNotice" }, "notice");
	const res = await storage.getAll({ date_show: "afternow" }, undefined, "notice");
	assert.strictEqual(res.action, "query");
	assert.strictEqual(res.data.length, 1);
	assert.strictEqual(res.data[0].text, "futureNotice");
	db.close();
});
