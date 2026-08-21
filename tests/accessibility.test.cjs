const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
test("accessibility controls support keyboard, contrast and text preferences",()=>{const root=path.join(__dirname,"..","src");const html=fs.readFileSync(path.join(root,"index.html"),"utf8");const css=fs.readFileSync(path.join(root,"styles.css"),"utf8");const script=fs.readFileSync(path.join(root,"accessibility.mjs"),"utf8");assert.match(html,/class="skip-link"/);assert.match(html,/<main id="main-content"/);assert.match(html,/id="accessibility-dialog"/);assert.match(css,/:focus-visible/);assert.match(css,/\.high-contrast/);assert.match(script,/localStorage/);assert.match(script,/button\.focus/);});

