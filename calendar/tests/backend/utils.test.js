const test = require("node:test");
const assert = require("node:assert");
const MyUtils = require("../../backend/data/utils");

test("MyUtils.isDict", () => {
	assert.strictEqual(MyUtils.isDict({}), true);
	assert.strictEqual(MyUtils.isDict({ a: 1 }), true);
	assert.strictEqual(MyUtils.isDict(null), false);
	assert.strictEqual(MyUtils.isDict([1, 2]), false);
	assert.strictEqual(MyUtils.isDict(new Date()), false);
	assert.strictEqual(MyUtils.isDict("str"), false);
});

test("MyUtils.splitLine4CSV basic", () => {
	assert.deepStrictEqual(MyUtils.splitLine4CSV("a,b,c"), ["a", "b", "c"]);
	assert.deepStrictEqual(MyUtils.splitLine4CSV("a,,c"), ["a", "", "c"]);
	assert.deepStrictEqual(MyUtils.splitLine4CSV(""), [""]);
});

test("MyUtils.splitLine4CSV handles quotes", () => {
	assert.deepStrictEqual(MyUtils.splitLine4CSV('"a,b",c'), ['"a,b"', "c"]);
	assert.deepStrictEqual(MyUtils.splitLine4CSV('"a,b","c,d"'), ['"a,b"', '"c,d"']);
});

test("MyUtils.localDateToFloatingTime", () => {
	const d = new Date(2024, 0, 5, 9, 5);
	assert.strictEqual(MyUtils.localDateToFloatingTimeStr(d, true), "2024-01-05 09:05");
	assert.strictEqual(MyUtils.localDateToFloatingTimeStr(d, false), "2024-01-05");
});

test("MyUtils.localDateToFloatingTime accepts string", () => {
	assert.strictEqual(MyUtils.localDateToFloatingTimeStr("2024-06-07 08:30", true), "2024-06-07 08:30");
});

test("MyUtils.localDateFromFloatingTime", () => {
	const r = MyUtils.localDateFromFloatingTime("2024-01-05 09:05");
	assert.strictEqual(r.floating_date_str, "2024-01-05 09:05");
	assert.ok(r.date instanceof Date);
});

test("MyUtils.localDateToISO8601WithOffset round-trips with machine offset", () => {
	const d = new Date(2024, 0, 5, 9, 5, 0);
	const iso = MyUtils.localDateToISO8601WithOffset(d);
	const back = MyUtils.localDatefromISO8601WithOffset(iso);
	assert.strictEqual(back.timeshift, -d.getTimezoneOffset());
	assert.strictEqual(back.date.getTime(), d.getTime());
	assert.strictEqual(back.floating_date_str, MyUtils.localDateToFloatingTimeStr(d, true));
});

test("MyUtils.absDateToFloatingTime uses UTC", () => {
	const d = new Date(Date.UTC(2024, 0, 5, 9, 5));
	assert.strictEqual(MyUtils.absDateToFloatingTime(d, true), "2024-01-05 09:05");
	assert.strictEqual(MyUtils.absDateToFloatingTime(d, false), "2024-01-05");
});
