const { contextBridge, ipcRenderer } = require("electron");
// Sandboxed preloads may only require Electron and a small Node.js allow-list.
// Keep this bridge self-contained so packaged builds expose it reliably.
contextBridge.exposeInMainWorld("fieldwiseMigration", Object.freeze({ migrateInvestigation:value=>ipcRenderer.invoke("biology:migrate-investigation",value) }));
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

contextBridge.exposeInMainWorld("fieldwiseDesktop", { ...createPlatformBridge(ipcRenderer), biology:{ takeLaunchContext:()=>ipcRenderer.invoke("biology:take-launch-context"),onLaunchContext:(callback)=>ipcRenderer.on("biology:launch-context",(_event,value)=>callback(value)),templates:()=>ipcRenderer.invoke("biology:templates"),recordCatalog:()=>ipcRenderer.invoke("biology:record-catalog"),newInvestigation:(templateId,context)=>ipcRenderer.invoke("biology:new-investigation",templateId,context),newSite:(number)=>ipcRenderer.invoke("biology:new-site",number),addMeasurement:(value)=>ipcRenderer.invoke("biology:add-measurement",value),newEcologyRecord:value=>ipcRenderer.invoke("biology:new-ecology-record",value),newMicroscopyRecord:value=>ipcRenderer.invoke("biology:new-microscopy-record",value),newTaxonomyRecord:value=>ipcRenderer.invoke("biology:new-taxonomy-record",value),newGeneticsCross:value=>ipcRenderer.invoke("biology:new-genetics-cross",value),newPhysiologyTrial:value=>ipcRenderer.invoke("biology:new-physiology-trial",value),newPlantTrial:value=>ipcRenderer.invoke("biology:new-plant-trial",value),markRecapture:(first,second,recaptured)=>ipcRenderer.invoke("biology:mark-recapture",first,second,recaptured),plantSummary:value=>ipcRenderer.invoke("biology:plant-summary",value),portfolioSummary:value=>ipcRenderer.invoke("biology:portfolio-summary",value),progress:(value)=>ipcRenderer.invoke("biology:progress",value),readiness:(value)=>ipcRenderer.invoke("biology:readiness",value),measurementsCsv:value=>ipcRenderer.invoke("biology:measurements-csv",value),report:value=>ipcRenderer.invoke("biology:report",value),weather:(latitude,longitude)=>ipcRenderer.invoke("biology:weather",latitude,longitude),submitToCore:(value)=>ipcRenderer.invoke("biology:submit-to-core",value) } });
