const { safeStorage } = require("electron");
const { createClient } = require("@supabase/supabase-js");
const { SecureStore } = require("./fieldwise-platform.cjs");

const SUPABASE_URL = "https://yhhvkvacykksopurzpmj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_eI8UPkGYeoO2-gobQI8lvQ_q7YN6_Zs";
const YEAR_LEVELS = Object.freeze(["Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]);
const clean = (value) => String(value || "").trim();
const valueFor = (row, camel, snake) => row?.[camel] ?? row?.[snake] ?? null;
function normalizeProfile(row) {
  if (!row) return null;
  return {
    id: clean(row.id).toLowerCase(),
    role: clean(row.role).toLowerCase(),
    schoolId: valueFor(row, "schoolId", "school_id"),
    displayName: valueFor(row, "displayName", "display_name") || "FieldWise user",
    classId: valueFor(row, "classId", "class_id")
  };
}
function normalizeClass(row) {
  if (!row) return null;
  return {
    id: row.id,
    schoolId: valueFor(row, "schoolId", "school_id"),
    yearLevel: valueFor(row, "yearLevel", "year_level"),
    active: row.active !== false
  };
}
class EncryptedSessionStorage extends SecureStore {
  constructor(directory, appId) { super(directory, safeStorage, `${appId}-supabase-session`); }
  async getItem(key) { return this.get(key); }
  async setItem(key, value) { return this.set(key, value); }
  async removeItem(key) { return this.remove(key); }
}
class SubjectAuthGateway {
  constructor(userDataPath, appId) {
    this.client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { storage:new EncryptedSessionStorage(userDataPath, appId), persistSession:true, autoRefreshToken:true, detectSessionInUrl:false }
    });
  }
  status() { return { configured:true, yearLevels:YEAR_LEVELS }; }
  async profileFor(userId) {
    const { data, error } = await this.client.from("users").select("*").eq("id", clean(userId).toLowerCase()).single();
    if (error) throw error;
    return normalizeProfile(data);
  }
  async session() {
    const { data, error } = await this.client.auth.getSession();
    if (error) throw error;
    if (!data.session) return { profile:null };
    try { return { profile:await this.profileFor(data.session.user.id) }; }
    catch { return { profile:null }; }
  }
  async teacherSignIn({ email, password }) {
    const { data, error } = await this.client.auth.signInWithPassword({ email:clean(email), password:String(password || "") });
    if (error) throw error;
    const profile = await this.profileFor(data.user.id);
    if (profile.role !== "teacher") throw new Error("Choose Student and join with your class code.");
    return profile;
  }
  async studentJoin({ classCode, firstName, yearLevel }) {
    const code = clean(classCode).toUpperCase();
    if (!code || !clean(firstName) || !YEAR_LEVELS.includes(yearLevel)) throw new Error("Class code, first name and year level are required.");
    const joined = await this.client.rpc("join_class_by_code", { code });
    if (joined.error) throw joined.error;
    const schoolClass = normalizeClass(joined.data?.[0]);
    if (!schoolClass?.active) throw new Error("That class code does not match an active class.");
    if (schoolClass.yearLevel && schoolClass.yearLevel !== yearLevel) throw new Error("That class code is for a different year level.");
    let session = (await this.client.auth.getSession()).data.session;
    if (!session) {
      const anonymous = await this.client.auth.signInAnonymously();
      if (anonymous.error) throw anonymous.error;
      session = anonymous.data.session;
    }
    const profile = { id:session.user.id.toLowerCase(), role:"student", schoolId:schoolClass.schoolId, displayName:clean(firstName), classId:schoolClass.id };
    const upsert = await this.client.from("users").upsert(profile);
    if (upsert.error) throw upsert.error;
    return normalizeProfile(profile);
  }
  async signOut() {
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
    return true;
  }
}
module.exports = { SubjectAuthGateway, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, YEAR_LEVELS, normalizeProfile, normalizeClass };
