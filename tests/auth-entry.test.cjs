const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "src", "index.html"), "utf8");
const preload = fs.readFileSync(path.join(root, "electron", "preload.cjs"), "utf8");
const gateway = fs.readFileSync(path.join(root, "electron", "subject-auth.cjs"), "utf8");

test("biology exposes the iOS teacher and student entry choices", () => {
  for (const field of ["teacher-form", "student-form", "email", "password", "classCode", "firstName", "yearLevel"]) {
    assert.match(html, new RegExp(field));
  }
  assert.match(preload, /teacherSignIn/);
  assert.match(preload, /studentJoin/);
  assert.match(preload, /signOut/);
});

test("biology packages only the client-safe Supabase identity", () => {
  assert.match(gateway, /https:\/\/[a-z]+\.supabase\.co/);
  assert.match(gateway, /sb_publishable_/);
  assert.doesNotMatch(gateway, /service_role|sb_secret_/);
});
