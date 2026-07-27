const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const LOCALE_DIR = path.resolve(__dirname, "..", "..", "codebase", "locale");

function loadLocale(file) {
	const code = fs.readFileSync(path.join(LOCALE_DIR, file), "utf8");
	const Scheduler = {};
	Scheduler.plugin = function (fn) { fn(Scheduler); };
	const sandbox = { Scheduler };
	vm.createContext(sandbox);
	vm.runInContext(code, sandbox);
	return Scheduler.locale;
}

const SAMPLE_LOCALES = ["locale_en.js", "locale_cn.js", "locale_de.js", "locale_fr.js"];

for (const file of SAMPLE_LOCALES) {
	test(`locale ${file} defines a structured locale object`, () => {
		const locale = loadLocale(file);
		assert.ok(locale, `${file} did not define Scheduler.locale`);
		assert.ok(locale.date, `${file} missing date config`);
		assert.ok(Array.isArray(locale.date.month_full));
		assert.strictEqual(locale.date.month_full.length, 12);
		assert.ok(Array.isArray(locale.date.month_short));
		assert.strictEqual(locale.date.month_short.length, 12);
		assert.ok(Array.isArray(locale.date.day_full));
		assert.strictEqual(locale.date.day_full.length, 7);
		assert.ok(Array.isArray(locale.date.day_short));
		assert.strictEqual(locale.date.day_short.length, 7);
		assert.ok(locale.labels, `${file} missing labels config`);
		assert.ok(typeof locale.labels === "object" && Object.keys(locale.labels).length > 0);
	});
}

test("locale_en has expected english labels", () => {
	const locale = loadLocale("locale_en.js");
	assert.strictEqual(locale.labels.day_tab, "Day");
	assert.strictEqual(locale.labels.week_tab, "Week");
	assert.strictEqual(locale.labels.month_tab, "Month");
});

test("all locale files in the directory are parseable", () => {
	const files = fs.readdirSync(LOCALE_DIR).filter((f) => f.endsWith(".js"));
	assert.ok(files.length >= 20, `expected many locale files, got ${files.length}`);
	for (const file of files) {
		const locale = loadLocale(file);
		assert.ok(locale.date.month_full.length === 12, `${file} bad month_full`);
	}
});
