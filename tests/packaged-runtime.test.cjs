const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {normalizePackagePath}=require("../scripts/verify-packaged-app.cjs");
test("packaged paths normalize on Windows and POSIX runners",()=>{assert.equal(normalizePackagePath(String.raw`\electron\main.cjs`),"/electron/main.cjs");assert.equal(normalizePackagePath("src/app.mjs"),"/src/app.mjs");});
test("Windows CI smoke-checks the packaged runtime contract",()=>{const root=path.join(__dirname,"..");const workflow=fs.readFileSync(path.join(root,".github","workflows","windows-build.yml"),"utf8");const verifier=fs.readFileSync(path.join(root,"scripts","verify-packaged-app.cjs"),"utf8");assert.match(workflow,/verify-packaged-app\.cjs/);assert.match(workflow,/win-unpacked\/resources\/app\.asar/);assert.match(verifier,/migrate-investigation/);assert.match(verifier,/submit-to-core/);assert.match(verifier,/fieldwise-core:\/\/submission\//);assert.match(verifier,/accessibility\.mjs/);});
