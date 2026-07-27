const test = require("node:test");
const assert = require("node:assert");
const express = require("express");
const router = require("../../backend/router");

function mockStorage() {
	const items = new Map();
	let nextId = 1;
	const storage = {
		calls: [],
		async getAll() { storage.calls.push("getAll"); return Array.from(items.values()); },
		async insert(body) { storage.calls.push("insert"); const id = nextId++; body.id = id; items.set(id, body); return { action: "inserted", tid: String(id) }; },
		async update(id, body) { storage.calls.push("update"); body.id = parseInt(id); items.set(parseInt(id), body); return { action: "updated" }; },
		async delete(id) { storage.calls.push("delete"); items.delete(parseInt(id)); return { action: "deleted" }; },
		async updateDetails(id, details) { storage.calls.push("updateDetails"); return { action: "updated", id }; },
	};
	return storage;
}

function startServer(storage) {
	const app = express();
	app.use(express.json());
	router.setRoutes(app, "/events", storage);
	return new Promise((resolve) => {
		const server = app.listen(0, () => resolve(server));
	});
}

function close(server) {
	return new Promise((resolve) => server.close(resolve));
}

test("router GET /events -> storage.getAll", async () => {
	const storage = mockStorage();
	const server = await startServer(storage);
	const port = server.address().port;
	const res = await fetch(`http://127.0.0.1:${port}/events`);
	const body = await res.json();
	assert.ok(Array.isArray(body));
	assert.ok(storage.calls.includes("getAll"));
	await close(server);
});

test("router POST /events -> storage.insert", async () => {
	const storage = mockStorage();
	const server = await startServer(storage);
	const port = server.address().port;
	const res = await fetch(`http://127.0.0.1:${port}/events`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name: "Routed" }),
	});
	const body = await res.json();
	assert.strictEqual(body.action, "inserted");
	assert.ok(body.tid);
	assert.ok(storage.calls.includes("insert"));
	await close(server);
});

test("router PUT /events/:id -> storage.update", async () => {
	const storage = mockStorage();
	const server = await startServer(storage);
	const port = server.address().port;
	const ins = await storage.insert({ name: "X" });
	const res = await fetch(`http://127.0.0.1:${port}/events/${ins.tid}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name: "Y" }),
	});
	const body = await res.json();
	assert.strictEqual(body.action, "updated");
	assert.ok(storage.calls.includes("update"));
	await close(server);
});

test("router DELETE /events/:id -> storage.delete", async () => {
	const storage = mockStorage();
	const server = await startServer(storage);
	const port = server.address().port;
	const ins = await storage.insert({ name: "X" });
	const res = await fetch(`http://127.0.0.1:${port}/events/${ins.tid}`, { method: "DELETE" });
	const body = await res.json();
	assert.strictEqual(body.action, "deleted");
	assert.ok(storage.calls.includes("delete"));
	await close(server);
});

test("router POST /events_details -> storage.updateDetails", async () => {
	const storage = mockStorage();
	const server = await startServer(storage);
	const port = server.address().port;
	const res = await fetch(`http://127.0.0.1:${port}/events_details`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ id: 1, details: "d" }),
	});
	const body = await res.json();
	assert.strictEqual(body.action, "updated");
	assert.ok(storage.calls.includes("updateDetails"));
	await close(server);
});
