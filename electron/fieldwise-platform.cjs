const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PLATFORM_VERSION = 1;
const APP_IDS = Object.freeze(["core", "biology", "history"]);
const SUBJECT_IDS = Object.freeze(["biology", "history", "agriculture", "science", "biology"]);
const APP_TITLES = Object.freeze({ core:"FieldWise Core", biology:"FieldWise Biology", history:"FieldWise History" });
function safeName(value) {
  const name = String(value || "").replace(/[^a-z0-9_-]/gi, "_").slice(0, 100);
  if (!name) throw new Error("A storage key is required.");
  return name;
}
function appIdentity(requested) {
  const id = APP_IDS.includes(requested) ? requested : "core";
  return { id, title:APP_TITLES[id], protocol:`fieldwise-${id}:`, appUserModelId:`com.fieldwise.education.${id}` };
}
function buildLaunchUrl(subject, context = {}) {
  if (!SUBJECT_IDS.includes(subject)) throw new Error("Unsupported subject app.");
  for (const key of ["taskId", "classId", "studentId", "schoolId"]) if (!String(context[key] || "").trim()) throw new Error(`${key} is required.`);
  const params = new URLSearchParams({ classId:String(context.classId), studentId:String(context.studentId), schoolId:String(context.schoolId), title:String(context.title || "Activity"), returnToCore:"true" });
  return `fieldwise-${subject}://activity/${encodeURIComponent(String(context.taskId))}?${params}`;
}
function parseLaunchUrl(value, expectedApp) {
  const url = new URL(String(value));
  if (url.protocol !== `fieldwise-${expectedApp}:` || url.hostname !== "activity") throw new Error("Invalid FieldWise launch URL.");
  const taskId = decodeURIComponent(url.pathname.replace(/^\//, ""));
  const result = { taskId, classId:url.searchParams.get("classId"), studentId:url.searchParams.get("studentId"), schoolId:url.searchParams.get("schoolId"), title:url.searchParams.get("title") || "Activity" };
  for (const key of ["taskId", "classId", "studentId", "schoolId"]) if (!result[key]) throw new Error(`Launch URL is missing ${key}.`);
  return result;
}
function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, /token|password|secret|authorization|cookie/i.test(key) ? "[REDACTED]" : redact(item)]));
}
function requireRole(profile, allowedRoles) {
  if (!profile?.id || !allowedRoles.includes(profile.role)) throw new Error("This action is not available for the current role.");
  return profile;
}
class PlatformLogger {
  constructor(root, appId) { this.file = path.join(root, "logs", `${safeName(appId)}.jsonl`); }
  async write(level, message, context = {}) {
    await fs.promises.mkdir(path.dirname(this.file), { recursive:true });
    const row = JSON.stringify({ at:new Date().toISOString(), level, message:String(message), context:redact(context) });
    await fs.promises.appendFile(this.file, `${row}\n`, { encoding:"utf8", mode:0o600 });
  }
}
class SecureStore {
  constructor(root, encryption, namespace) { this.root = path.join(root, "secure-records", safeName(namespace)); this.encryption = encryption; }
  file(key) { return path.join(this.root, `${safeName(key)}.bin`); }
  async get(key) {
    try {
      const envelope = JSON.parse(this.encryption.decryptString(await fs.promises.readFile(this.file(key))));
      if (envelope.version !== PLATFORM_VERSION) throw new Error("Unsupported local data version.");
      return envelope.value;
    } catch (error) { if (error.code === "ENOENT") return null; throw error; }
  }
  async set(key, value) {
    if (!this.encryption.isEncryptionAvailable()) throw new Error("Secure Windows storage is unavailable.");
    const data = this.encryption.encryptString(JSON.stringify({ version:PLATFORM_VERSION, savedAt:new Date().toISOString(), value }));
    await fs.promises.mkdir(this.root, { recursive:true });
    const target = this.file(key); const temporary = `${target}.${crypto.randomUUID()}.tmp`;
    await fs.promises.writeFile(temporary, data, { mode:0o600 }); await fs.promises.rename(temporary, target);
    return true;
  }
  async remove(key) { try { await fs.promises.unlink(this.file(key)); } catch (error) { if (error.code !== "ENOENT") throw error; } }
}
class SecureStorageAdapter extends SecureStore {
  async getItem(key) { return this.get(key); }
  async setItem(key, value) { return this.set(key, value); }
  async removeItem(key) { return this.remove(key); }
}
class OfflineQueue {
  constructor(store, key = "offline-queue") { this.store = store; this.key = key; this.items = new Map(); }
  async load() { const rows = await this.store.get(this.key); this.items = new Map((Array.isArray(rows) ? rows : []).map((item) => [item.id, item])); }
  async persist() { await this.store.set(this.key, [...this.items.values()]); }
  async enqueue(payload, id = payload?.id || crypto.randomUUID()) {
    const previous = this.items.get(id); const now = new Date().toISOString();
    if (previous?.payload?.updatedAt && payload?.updatedAt && Date.parse(payload.updatedAt) < Date.parse(previous.payload.updatedAt)) return id;
    this.items.set(id, { id, payload, createdAt:previous?.createdAt || now, updatedAt:now, attempts:previous?.attempts || 0, lastError:null });
    await this.persist(); return id;
  }
  async flush(upload) {
    for (const item of [...this.items.values()]) {
      try { await upload(item.payload); this.items.delete(item.id); }
      catch (error) { item.attempts += 1; item.lastError=String(error?.message || error); item.updatedAt=new Date().toISOString(); }
      await this.persist();
    }
    return this.items.size;
  }
  count() { return this.items.size; }
  has(id) { return this.items.has(id); }
  snapshot() { return [...this.items.values()].map(({ payload, ...item }) => item); }
}
class AttachmentStore {
  constructor(root) { this.root = path.join(root, "attachments"); }
  async importFile(source, recordId) {
    const extension = path.extname(source).toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".webp", ".pdf", ".csv", ".txt"].includes(extension)) throw new Error("Unsupported attachment type.");
    const stat = await fs.promises.stat(source); if (stat.size > 25 * 1024 * 1024) throw new Error("Attachments must be 25 MB or smaller.");
    const directory = path.join(this.root, safeName(recordId)); await fs.promises.mkdir(directory, { recursive:true });
    const id = crypto.randomUUID(); const target = path.join(directory, `${id}${extension}`);
    await fs.promises.copyFile(source, target); return { id, name:path.basename(source), extension, size:stat.size, path:target, importedAt:new Date().toISOString() };
  }
  async saveCapture(bytes, recordId, mimeType="image/jpeg", name="Camera capture.jpg") {
    const formats={ "image/jpeg":".jpg", "image/png":".png", "image/webp":".webp" },extension=formats[mimeType];
    if(!extension)throw new Error("Unsupported camera image type.");
    const data=Buffer.from(bytes);if(!data.length||data.length>25*1024*1024)throw new Error("Camera captures must be between 1 byte and 25 MB.");
    const directory=path.join(this.root,safeName(recordId));await fs.promises.mkdir(directory,{recursive:true});
    const id=crypto.randomUUID(),target=path.join(directory,`${id}${extension}`);await fs.promises.writeFile(target,data,{mode:0o600});
    return{id,name:path.basename(String(name||"Camera capture.jpg")),extension,size:data.length,path:target,importedAt:new Date().toISOString(),origin:"camera"};
  }
}
const EXPORT_FORMATS = Object.freeze({ csv:{ extension:"csv", name:"CSV spreadsheet" }, json:{ extension:"json", name:"JSON data" }, txt:{ extension:"txt", name:"Text document" } });
async function exportText({ dialog, owner, document }) {
  const format = EXPORT_FORMATS[document?.format]; if (!format) throw new Error("Unsupported export format.");
  const content = String(document.content ?? ""); if (Buffer.byteLength(content, "utf8") > 10 * 1024 * 1024) throw new Error("Exports must be 10 MB or smaller.");
  const base = safeName(path.basename(String(document.suggestedName || "FieldWise_Export"), path.extname(String(document.suggestedName || ""))));
  const result = await dialog.showSaveDialog(owner, { title:"Export FieldWise document", defaultPath:`${base}.${format.extension}`, filters:[{ name:format.name, extensions:[format.extension] }] });
  if (result.canceled || !result.filePath) return { canceled:true };
  const target = result.filePath.toLowerCase().endsWith(`.${format.extension}`) ? result.filePath : `${result.filePath}.${format.extension}`;
  await fs.promises.writeFile(target, content, { encoding:"utf8", mode:0o600 }); return { canceled:false, filePath:target };
}
function registerPlatformIpc({ ipcMain, app, safeStorage, dialog, BrowserWindow, appId }) {
  const store = new SecureStore(app.getPath("userData"), safeStorage, appId);
  const attachments = new AttachmentStore(app.getPath("userData"));
  ipcMain.handle("fieldwise:platform-status", () => ({ version:PLATFORM_VERSION, appId, encryptionAvailable:safeStorage.isEncryptionAvailable() }));
  ipcMain.handle("fieldwise:load", async (_event, key) => {
    const value = await store.get(key); if (value !== null) return value;
    const legacy = path.join(app.getPath("userData"), `${safeName(key)}.json`);
    try { const migrated = JSON.parse(await fs.promises.readFile(legacy, "utf8")); await store.set(key, migrated); await fs.promises.rename(legacy, `${legacy}.migrated`); return migrated; }
    catch (error) { if (error.code === "ENOENT") return null; throw error; }
  });
  ipcMain.handle("fieldwise:save", (_event, key, value) => value === null ? store.remove(key) : store.set(key, value));
  ipcMain.handle("fieldwise:import-attachment", async (event, recordId) => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(owner, { title:"Attach evidence", properties:["openFile"], filters:[{ name:"Evidence", extensions:["jpg","jpeg","png","webp","pdf","csv","txt"] }] });
    if (result.canceled || !result.filePaths[0]) return { canceled:true };
    return { canceled:false, attachment:await attachments.importFile(result.filePaths[0], recordId) };
  });
  ipcMain.handle("fieldwise:save-capture",(_event,recordId,capture)=>attachments.saveCapture(capture?.bytes,recordId,capture?.mimeType,capture?.name));
  ipcMain.handle("fieldwise:export-text", (event, document) => exportText({ dialog, owner:BrowserWindow.fromWebContents(event.sender), document }));
  return { store, attachments };
}
function createPlatformBridge(ipcRenderer) {
  return Object.freeze({ platform:process.platform, status:() => ipcRenderer.invoke("fieldwise:platform-status"), load:(key) => ipcRenderer.invoke("fieldwise:load", key), save:(key, value) => ipcRenderer.invoke("fieldwise:save", key, value), importAttachment:(recordId) => ipcRenderer.invoke("fieldwise:import-attachment", recordId), saveCapture:(recordId,capture)=>ipcRenderer.invoke("fieldwise:save-capture",recordId,capture), exportText:(document) => ipcRenderer.invoke("fieldwise:export-text", document) });
}
module.exports = { PLATFORM_VERSION, APP_IDS, SUBJECT_IDS, APP_TITLES, safeName, appIdentity, buildLaunchUrl, parseLaunchUrl, redact, requireRole, PlatformLogger, SecureStore, SecureStorageAdapter, OfflineQueue, AttachmentStore, EXPORT_FORMATS, exportText, registerPlatformIpc, createPlatformBridge };
