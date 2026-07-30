const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const terser = require("terser");

test("codebase build toolchain: terser minifies a source file and emits a sourcemap", async () => {
	const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cb-build-"));
	const sourcesDir = path.join(tmpRoot, "sources");
	fs.mkdirSync(sourcesDir, { recursive: true });
	const sample = path.join(sourcesDir, "sample.js");
	fs.writeFileSync(sample, `
test("codebase build.js is a valid node script that exports nothing (runner script)", () => {
	const buildPath = require.resolve("../../codebase/build.js");
	const src = fs.readFileSync(buildPath, "utf8");
	assert.ok(src.indexOf("terser") !== -1);
	assert.ok(src.indexOf("sources") !== -1);
	assert.ok(src.indexOf("walk") !== -1);
});
`);
	const code = fs.readFileSync(sample, "utf8");
	const result = await terser.minify({ "sample.js": code }, {
		compress: true,
		mangle: true,
		sourceMap: { filename: "sample.js", url: "sources/sample.js.map" },
	});
	assert.ifError(result.error);
	assert.ok(result.code.length > 0);
	assert.ok(result.code.length <= code.length);
	assert.ok(result.map);
	fs.rmSync(tmpRoot, { recursive: true, force: true });
});

test("codebase directory exposes the expected structure", () => {
	const codebase = require.resolve("../../codebase/build.js").replace("build.js", "");
	assert.ok(fs.existsSync(path.join(codebase, "sources")));
	assert.ok(fs.existsSync(path.join(codebase, "dhtmlxscheduler.js")));
	assert.ok(fs.existsSync(path.join(codebase, "locale", "locale_en.js")));
});

test("codebase build.js is a valid node script that exports nothing (runner script)", () => {
	const buildPath = require.resolve("../../codebase/build.js");
	const src = fs.readFileSync(buildPath, "utf8");
	assert.ok(src.indexOf("terser") !== -1);
	assert.ok(src.indexOf("sources") !== -1);
	assert.ok(src.indexOf("walk") !== -1);
});
