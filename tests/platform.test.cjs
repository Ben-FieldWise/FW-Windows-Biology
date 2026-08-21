const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { PLATFORM_VERSION, safeName, appIdentity, buildLaunchUrl, parseLaunchUrl, redact, requireRole, SecureStore, OfflineQueue, AttachmentStore, exportText, registerPlatformIpc } = require("../electron/fieldwise-platform.cjs");

const encryption = {
  isEncryptionAvailable: () => true,
  encryptString: (value) => Buffer.from(value, "utf8"),
  decryptString: (value) => Buffer.from(value).toString("utf8")
};
test("platform identities and deep links are allow-listed", () => {
  assert.equal(appIdentity("history").appUserModelId, "com.fieldwise.education.history");
  assert.equal(appIdentity("unknown").id, "core");
  const url = buildLaunchUrl("biology", { taskId:"task 1", classId:"class", studentId:"student", schoolId:"school", title:"River study" });
  assert.deepEqual(parseLaunchUrl(url, "biology"), { taskId:"task 1", classId:"class", studentId:"student", schoolId:"school", title:"River study" });
  assert.match(buildLaunchUrl("biology", { taskId:"task", classId:"class", studentId:"student", schoolId:"school" }), /^fieldwise-biology:/);
  assert.throws(()=>parseLaunchUrl("fieldwise-biology://activity/task?classId=class&studentId=student","biology"),/schoolId/);
  assert.throws(() => buildLaunchUrl("https", {}), /Unsupported/);
  assert.equal(requireRole({ id:"teacher", role:"teacher" }, ["teacher"]).id, "teacher");
  assert.throws(() => requireRole({ id:"student", role:"student" }, ["teacher"]), /not available/);
});
test("secure store writes versioned encrypted envelopes and removes records", async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "fieldwise-store-"));
  try {
    const store = new SecureStore(root, encryption, "test");
    await store.set("draft", { answer:42 });
    assert.deepEqual(await store.get("draft"), { answer:42 });
    const raw = JSON.parse((await fs.promises.readFile(store.file("draft"))).toString());
    assert.equal(raw.version, PLATFORM_VERSION);
    await store.remove("draft"); assert.equal(await store.get("draft"), null);
  } finally { await fs.promises.rm(root, { recursive:true, force:true }); }
});
test("platform IPC migrates legacy JSON into encrypted versioned storage", async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "fieldwise-migrate-")); const handlers = new Map();
  try {
    await fs.promises.writeFile(path.join(root, "old-draft.json"), JSON.stringify({ notes:"preserved" }));
    registerPlatformIpc({ ipcMain:{ handle:(name, handler) => handlers.set(name, handler) }, app:{ getPath:() => root }, safeStorage:encryption, dialog:{}, BrowserWindow:{}, appId:"biology" });
    assert.deepEqual(await handlers.get("fieldwise:load")(null, "old-draft"), { notes:"preserved" });
    assert.equal(await fs.promises.stat(path.join(root, "old-draft.json.migrated")).then(() => true), true);
    const encrypted = new SecureStore(root, encryption, "biology"); assert.deepEqual(await encrypted.get("old-draft"), { notes:"preserved" });
  } finally { await fs.promises.rm(root, { recursive:true, force:true }); }
});
test("offline queue retries failures without losing work", async () => {
  const memory = { value:null, async get(){ return this.value; }, async set(_key, value){ this.value=value; } };
  const queue = new OfflineQueue(memory);
  await queue.load(); await queue.enqueue({ id:"entry", notes:"offline" });
  assert.equal(queue.count(), 1);
  await queue.flush(async () => { throw new Error("offline"); });
  assert.equal(queue.count(), 1); assert.equal(queue.snapshot()[0].attempts, 1);
  await queue.flush(async () => true);
  assert.equal(queue.count(), 0);
});
test("offline queue keeps the newest version during a conflict", async () => {
  const memory = { value:null, async get(){ return this.value; }, async set(_key, value){ this.value=value; } };
  const queue = new OfflineQueue(memory); await queue.load();
  await queue.enqueue({ id:"same", notes:"new", updatedAt:"2026-08-20T02:00:00Z" });
  await queue.enqueue({ id:"same", notes:"old", updatedAt:"2026-08-20T01:00:00Z" });
  let uploaded; await queue.flush(async (value) => { uploaded=value; }); assert.equal(uploaded.notes, "new");
});
test("safe exports enforce formats, names and extensions", async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "fieldwise-export-"));
  try {
    let options; const dialog = { showSaveDialog:async (_owner, value) => { options=value; return { canceled:false, filePath:path.join(root, "result") }; } };
    const result = await exportText({ dialog, owner:null, document:{ format:"csv", suggestedName:"../../Results", content:"a,b" } });
    assert.equal(options.defaultPath, "Results.csv"); assert.equal(path.basename(result.filePath), "result.csv"); assert.equal(await fs.promises.readFile(result.filePath, "utf8"), "a,b");
    assert.throws(() => safeName(""), /required/); await assert.rejects(() => exportText({ dialog, document:{ format:"exe", content:"x" } }), /Unsupported/);
  } finally { await fs.promises.rm(root, { recursive:true, force:true }); }
});
test("camera captures enforce image formats, size limits and safe record paths", async()=>{
  const root=await fs.promises.mkdtemp(path.join(os.tmpdir(),"fieldwise-camera-"));
  try{const store=new AttachmentStore(root),capture=await store.saveCapture(Uint8Array.from([1,2,3]),"site/unsafe","image/jpeg","Field photo.jpg");assert.equal(capture.origin,"camera");assert.equal(capture.extension,".jpg");assert.deepEqual([...await fs.promises.readFile(capture.path)],[1,2,3]);await assert.rejects(()=>store.saveCapture([], "site","image/jpeg"),/between 1 byte/);await assert.rejects(()=>store.saveCapture([1], "site","image/svg+xml"),/Unsupported/);}finally{await fs.promises.rm(root,{recursive:true,force:true});}
});
test("logger redaction removes secrets recursively", () => {
  assert.deepEqual(redact({ password:"bad", nested:{ accessToken:"secret", safe:"yes" } }), { password:"[REDACTED]", nested:{ accessToken:"[REDACTED]", safe:"yes" } });
});
