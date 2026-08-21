const { contextBridge, ipcRenderer } = require("electron");
// Sandboxed preloads may only require Electron and a small Node.js allow-list.
// Keep this bridge self-contained so packaged builds expose it reliably.
const createPlatformBridge = () => Object.freeze({
  platform: process.platform,
  status: () => ipcRenderer.invoke("fieldwise:platform-status"),
  load: (key) => ipcRenderer.invoke("fieldwise:load", key),
  save: (key, value) => ipcRenderer.invoke("fieldwise:save", key, value),
  importAttachment: (recordId) => ipcRenderer.invoke("fieldwise:import-attachment", recordId),
  saveCapture: (recordId, capture) => ipcRenderer.invoke("fieldwise:save-capture", recordId, capture),
  exportText: (document) => ipcRenderer.invoke("fieldwise:export-text", document),
  auth: Object.freeze({
    status: () => ipcRenderer.invoke("biology:auth-status"),
    session: () => ipcRenderer.invoke("biology:auth-session"),
    teacherSignIn: (values) => ipcRenderer.invoke("biology:teacher-sign-in", values),
    studentJoin: (values) => ipcRenderer.invoke("biology:student-join", values),
    signOut: () => ipcRenderer.invoke("biology:sign-out")
  })
});

contextBridge.exposeInMainWorld("fieldwiseDesktop", { ...createPlatformBridge(ipcRenderer), biology:{ takeLaunchContext:()=>ipcRenderer.invoke("biology:take-launch-context"),onLaunchContext:(callback)=>ipcRenderer.on("biology:launch-context",(_event,value)=>callback(value)),templates:()=>ipcRenderer.invoke("biology:templates"),newInvestigation:(templateId,context)=>ipcRenderer.invoke("biology:new-investigation",templateId,context),newSite:(number)=>ipcRenderer.invoke("biology:new-site",number),addMeasurement:(value)=>ipcRenderer.invoke("biology:add-measurement",value),progress:(value)=>ipcRenderer.invoke("biology:progress",value),readiness:(value)=>ipcRenderer.invoke("biology:readiness",value),measurementsCsv:value=>ipcRenderer.invoke("biology:measurements-csv",value),report:value=>ipcRenderer.invoke("biology:report",value),weather:(latitude,longitude)=>ipcRenderer.invoke("biology:weather",latitude,longitude),submitToCore:(value)=>ipcRenderer.invoke("biology:submit-to-core",value) } });
