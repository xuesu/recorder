const test = require("node:test");
const assert = require("node:assert");
const parser = require("../../mmid_pack/mnote_parser");

test("is_todo_line detects unchecked / checked / non-todo", () => {
	assert.strictEqual(parser.is_todo_line("- [ ] task"), 0);
	assert.strictEqual(parser.is_todo_line("-[ ]task"), 0);
	assert.strictEqual(parser.is_todo_line("- [x] task"), 1);
	assert.strictEqual(parser.is_todo_line("-[x]task"), 1);
	assert.strictEqual(parser.is_todo_line("regular text"), -1);
	assert.strictEqual(parser.is_todo_line("## TODO"), -1);
});

test("parse_todo_line parses status and text", () => {
	const item = parser.parse_todo_line("- [x] 5: Done task", [], []);
	assert.strictEqual(item.status, "done");
	assert.strictEqual(item.score, 5);
	assert.strictEqual(item.text, "Done task");
});

test("parse_todo_line unchecked defaults to doing", () => {
	const item = parser.parse_todo_line("- [ ] 3: Pending", [], []);
	assert.strictEqual(item.status, "doing");
	assert.strictEqual(item.score, 3);
});

test("parse_todo_line without prefix keeps default score -1", () => {
	const item = parser.parse_todo_line("- [x] no prefix here", [], []);
	assert.strictEqual(item.status, "done");
	assert.strictEqual(item.score, -1);
	assert.strictEqual(item.text, "no prefix here");
});

test("parse_todo_tree returns undefined without ## TODO section", () => {
	assert.strictEqual(parser.parse_todo_tree("just some text"), undefined);
});

test("parse_todo_tree builds nested children", () => {
	const txt = "## TODO\n- [ ] 5: Parent\n    - [x] 2: Child\n";
	const root = parser.parse_todo_tree(txt);
	assert.strictEqual(root.children.length, 1);
	assert.strictEqual(root.children[0].text, "Parent");
	assert.strictEqual(root.children[0].score, 5);
	assert.strictEqual(root.children[0].children.length, 1);
	assert.strictEqual(root.children[0].children[0].text, "Child");
	assert.strictEqual(root.children[0].children[0].status, "done");
});

test("parse_todo_tree stops at next ## section", () => {
	const txt = "## TODO\n- [ ] 1: A\n## Notes\n- [ ] 2: B\n";
	const root = parser.parse_todo_tree(txt);
	assert.strictEqual(root.children.length, 1);
	assert.strictEqual(root.children[0].text, "A");
});

test("mystr2date parses YYYYMMDD and YYYYMMDDHHmm", () => {
	const d = parser.mystr2date("20240115");
	assert.strictEqual(d.getFullYear(), 2024);
	assert.strictEqual(d.getMonth(), 0);
	assert.strictEqual(d.getDate(), 15);
	const d2 = parser.mystr2date("202401150930");
	assert.strictEqual(d2.getHours(), 9);
	assert.strictEqual(d2.getMinutes(), 30);
});

test("mystr2date rejects invalid input", () => {
	assert.strictEqual(parser.mystr2date("abc"), undefined);
	assert.strictEqual(parser.mystr2date("12345"), undefined);
	assert.strictEqual(parser.mystr2date("1234567890123"), undefined);
});

test("mystr2date handles 2-digit year (YYMMDD)", () => {
	const d = parser.mystr2date("240115");
	assert.strictEqual(d.getFullYear(), 2024);
	assert.strictEqual(d.getMonth(), 0);
	assert.strictEqual(d.getDate(), 15);
});

test("addTimeTo adds days/months/years/hours/minutes", () => {
	const base = new Date(2024, 0, 15, 10, 0);
	assert.strictEqual(parser.addTimeTo(base, 0, 0, 1).getDate(), 16);
	assert.strictEqual(parser.addTimeTo(base, 0, 1, 0).getMonth(), 1);
	assert.strictEqual(parser.addTimeTo(base, 1, 0, 0).getFullYear(), 2025);
	assert.strictEqual(parser.addTimeTo(base, 0, 0, 0, 2).getHours(), 12);
	assert.strictEqual(parser.addTimeTo(base, 0, 0, 0, 0, 30).getMinutes(), 30);
});

test("addTimeTo does not mutate input", () => {
	const base = new Date(2024, 0, 15, 10, 0);
	const before = base.valueOf();
	parser.addTimeTo(base, 0, 0, 5);
	assert.strictEqual(base.valueOf(), before);
});

test("refix_todo_format handles misaligned child indentation", () => {
	const txt = "## TODO\n- [ ] 1: A\n        - [ ] 2: B\n";
	const fixed = parser.refix_todo_format(txt);
	assert.ok(fixed.indexOf("- [ ] 1: A") !== -1);
	assert.ok(fixed.indexOf("- [ ] 2: B") !== -1);
});

test("refix_todo_format returns unchanged when no ## TODO", () => {
	const txt = "no todo here";
	assert.strictEqual(parser.refix_todo_format(txt), txt);
});
