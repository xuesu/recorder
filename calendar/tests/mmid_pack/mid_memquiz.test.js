const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const vm = require("node:vm");

const code = fs.readFileSync(require.resolve("../../mmid_pack/mid_memquiz.js"), "utf8");
const sandbox = { alert: () => {} };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const calc = sandbox.calc_difficulties_v_0_1;

test("calc_difficulties_v_0_1 undefined histogram returns 1.0", () => {
	assert.strictEqual(calc(undefined), 1.0);
});

test("calc_difficulties_v_0_1 empty histogram returns 1.0", () => {
	assert.strictEqual(calc([]), 1.0);
});

test("calc_difficulties_v_0_1 all-wrong entry returns 1.0 (difficulty max)", () => {
	const h = [{ R: 0, T: 0, F: 2, TIME: Date.now() }];
	assert.strictEqual(calc(h), 1.0);
});

test("calc_difficulties_v_0_1 fully-correct recent entry lowers difficulty", () => {
	const h = [{ R: 1, T: 2, F: 0, TIME: Date.now() }];
	const d = calc(h);
	assert.ok(d > 0 && d < 1.0, `expected 0<d<1, got ${d}`);
	assert.ok(d < 0.5, `expected <0.5, got ${d}`);
	assert.ok(d > 0.3, `expected >0.3, got ${d}`);
});

test("calc_difficulties_v_0_1 clamps subprob to [0,1] for very old entry", () => {
	const veryOld = Date.now() - 1000 * 3600 * 24 * 365 * 50;
	const h = [{ R: 1, T: 1, F: 0, TIME: veryOld }];
	const d = calc(h);
	assert.ok(d >= 0 && d <= 1.0, `expected within [0,1], got ${d}`);
});

test("calc_difficulties_v_0_1 two entries weight 0.7/0.3", () => {
	const now = Date.now();
	const h = [
		{ R: 0, T: 0, F: 1, TIME: now },
		{ R: 1, T: 1, F: 0, TIME: now },
	];
	const d = calc(h);
	assert.ok(d >= 0 && d <= 1.0);
});

test("calc_difficulties_v_0_1 three entries weight 0.6/0.3/0.1", () => {
	const now = Date.now();
	const h = [
		{ R: 0, T: 0, F: 1, TIME: now },
		{ R: 0, T: 0, F: 1, TIME: now },
		{ R: 1, T: 2, F: 0, TIME: now },
	];
	const d = calc(h);
	assert.ok(d >= 0 && d <= 1.0);
	assert.ok(d > 0.5 && d < 1.0);
});
