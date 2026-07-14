const fs = require("fs");
const path = require("path");
const terser = require("terser");

// Minify every .js under codebase/sources into the matching codebase location,
// reproducing the repo convention where each minified file references
// sources/<relpath>.js.map (relative to the codebase root).
const SOURCES = path.join(__dirname, "sources");
const CODEBASE = __dirname;

function walk(dir, rel, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, path.join(rel, entry.name), out);
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".js") &&
      !entry.name.endsWith(".js.map")
    ) {
      out.push({ abs: full, rel: path.join(rel, entry.name), base: entry.name });
    }
  }
  return out;
}

const files = walk(SOURCES, "", []);

(async () => {
  let ok = 0;
  for (const { abs, rel, base } of files) {
    const code = fs.readFileSync(abs, "utf8");
    const mapUrl = "sources/" + rel.split(path.sep).join("/") + ".map";
    const result = await terser.minify({ [base]: code }, {
      compress: true,
      mangle: true,
      sourceMap: { filename: base, url: mapUrl },
    });
    if (result.error) {
      console.error(`Error minifying ${rel}:`, result.error);
      process.exitCode = 1;
      continue;
    }
    const outFile = path.join(CODEBASE, rel);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, result.code);
    if (result.map) {
      fs.writeFileSync(path.join(SOURCES, rel + ".map"), result.map);
    }
    console.log(`Built ${rel}`);
    ok++;
  }
  console.log(`Done: ${ok} file(s) written under ${CODEBASE}`);
})();
