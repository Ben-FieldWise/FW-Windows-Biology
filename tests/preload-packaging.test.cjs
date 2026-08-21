const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "electron", "preload.cjs"), "utf8");

test("sandboxed preload is self-contained in packaged builds", () => {
  assert.doesNotMatch(source, /require\(["']\.\//);
  assert.match(source, /exposeInMainWorld\(["']fieldwiseDesktop["']/);
  assert.match(source, /fieldwise:platform-status/);
});
