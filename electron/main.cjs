const { app, BrowserWindow, ipcMain, shell, dialog, safeStorage } = require("electron");
const path = require("path");
const fs = require("fs");
const packageMetadata = require("../package.json");
const { SubjectAuthGateway } = require("./subject-auth.cjs");
const { appIdentity, registerPlatformIpc, PlatformLogger, parseLaunchUrl } = require("./fieldwise-platform.cjs");
const { templates, newInvestigation, newSite, addMeasurement, investigationProgress, submissionReadiness, weatherSuitability, measurementsCsv, investigationReport, sanitizeTransferValue } = require("./biology-contracts.cjs");
const biologyRecords = require("./biology-records.cjs");
const crypto = require("crypto");

const allowedApps = new Set(["core", "biology", "history"]);
const appArgument = process.argv.find((value) => value.startsWith("--fieldwise-app="));
const requestedApp = appArgument?.split("=")[1] || packageMetadata.fieldwiseApp || "core";
const appId = allowedApps.has(requestedApp) ? requestedApp : "core";
const identity = appIdentity(appId);
let mainWindow;
let authGateway;
let launchContext=null;
let platformServices;

function buildBiologyEvidence(investigation){return[...(investigation.sites||[]).flatMap(site=>[...(site.measurements||[]).map(item=>({id:item.id,type:"measurement",title:`${site.name} · ${item.label}`,notes:`${item.rawValue} ${item.unit} · ${item.origin}`,capturedAt:item.recordedAt})),...(site.attachments||[]).map(item=>({id:item.id,type:"attachment",title:`${site.name} · ${item.name}`,notes:`${item.size} bytes`,capturedAt:item.importedAt}))]),...(investigation.biologyRecords||[]).map(item=>({id:item.id,type:`biology-${item.kind}`,title:item.siteName||item.specimen||item.observedName||item.traitName||item.participantAnonID||item.species||item.kind,notes:item.kind==="physiology"?"Anonymous, consent-valid, non-diagnostic educational record":`Structured ${item.kind} evidence`,capturedAt:item.dateRecorded||item.createdAt}))];}

app.setName(identity.title);
app.setAppUserModelId(identity.appUserModelId);

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 980,
    minHeight: 680,
    title: identity.title,
    icon: path.join(__dirname, "..", "build", "icon.png"),
    backgroundColor: "#f4f1e8",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.loadFile(path.join(__dirname, "..", "src", "index.html"), {
    query: { app: appId }
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) shell.openExternal(url);
    return { action: "deny" };
  });
  window.webContents.session.setPermissionRequestHandler((_webContents, permission, callback, details) => callback(["geolocation", "media"].includes(permission) && String(details.requestingUrl || "").startsWith("file://")));
  window.webContents.session.setPermissionCheckHandler((_webContents, permission, requestingOrigin) => ["geolocation", "media"].includes(permission) && String(requestingOrigin || "").startsWith("file://"));
  mainWindow=window;
}
function acceptLaunch(value){try{launchContext=parseLaunchUrl(value,"biology");mainWindow?.show();mainWindow?.focus();mainWindow?.webContents.send("biology:launch-context",launchContext);}catch{/* Ignore untrusted protocol input. */}}
app.setAsDefaultProtocolClient("fieldwise-biology");
if(!app.requestSingleInstanceLock())app.quit();else app.on("second-instance",(_event,argv)=>{const value=argv.find(item=>item.startsWith("fieldwise-biology:"));if(value)acceptLaunch(value);});
app.on("open-url",(event,url)=>{event.preventDefault();acceptLaunch(url);});
ipcMain.handle("biology:auth-status", () => authGateway.status());
ipcMain.handle("biology:auth-session", () => authGateway.session());
ipcMain.handle("biology:teacher-sign-in", (_event, values) => authGateway.teacherSignIn(values));
ipcMain.handle("biology:student-join", (_event, values) => authGateway.studentJoin(values));
ipcMain.handle("biology:sign-out", () => authGateway.signOut());

ipcMain.handle("biology:take-launch-context",()=>{const value=launchContext;launchContext=null;return value;});
ipcMain.handle("biology:templates",()=>templates);
ipcMain.handle("biology:new-investigation",(_event,templateId,context)=>newInvestigation(templateId,context));
ipcMain.handle("biology:new-site",(_event,number)=>newSite(number));
ipcMain.handle("biology:add-measurement",(_event,value)=>addMeasurement({},value));
ipcMain.handle("biology:record-catalog",()=>({samplingDesigns:biologyRecords.samplingDesigns,nativeStatuses:biologyRecords.nativeStatuses,physiologyProtocols:biologyRecords.physiologyProtocols}));
ipcMain.handle("biology:new-ecology-record",(_event,value)=>biologyRecords.createEcologyRecord(value));
ipcMain.handle("biology:new-microscopy-record",(_event,value)=>biologyRecords.createMicroscopyRecord(value));
ipcMain.handle("biology:new-taxonomy-record",(_event,value)=>biologyRecords.createTaxonomyRecord(value));
ipcMain.handle("biology:new-genetics-cross",(_event,value)=>biologyRecords.createGeneticsCross(value));
ipcMain.handle("biology:new-physiology-trial",(_event,value)=>biologyRecords.createPhysiologyTrial(value));
ipcMain.handle("biology:new-plant-trial",(_event,value)=>biologyRecords.createPlantTrial(value));
ipcMain.handle("biology:mark-recapture",(_event,first,second,recaptured)=>biologyRecords.markRecapture(first,second,recaptured));
ipcMain.handle("biology:plant-summary",(_event,value)=>biologyRecords.plantReplicateSummary(value));
ipcMain.handle("biology:portfolio-summary",(_event,value)=>biologyRecords.biologyPortfolioSummary(value));
ipcMain.handle("biology:progress",(_event,value)=>investigationProgress(value));
ipcMain.handle("biology:readiness",(_event,value)=>submissionReadiness(value));
ipcMain.handle("biology:measurements-csv",(_event,value)=>measurementsCsv(value));
ipcMain.handle("biology:report",(_event,value)=>investigationReport(value));
ipcMain.handle("biology:weather",async(_event,latitude,longitude)=>{const lat=Number(latitude),lon=Number(longitude);if(!Number.isFinite(lat)||lat< -90||lat>90||!Number.isFinite(lon)||lon< -180||lon>180)throw new Error("Valid coordinates are required.");const query=new URLSearchParams({latitude:String(lat),longitude:String(lon),current:"temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,visibility",timezone:"auto"});const response=await fetch(`https://api.open-meteo.com/v1/forecast?${query}`);if(!response.ok)throw new Error(`Weather service returned ${response.status}.`);const data=await response.json();return{current:data.current,units:data.current_units,suitability:weatherSuitability(data.current),source:"Open-Meteo"};});
ipcMain.handle("biology:submit-to-core",async(_event,investigation)=>{const readiness=submissionReadiness(investigation);if(!readiness.ready)throw new Error(readiness.blockers.join(" "));if(!safeStorage.isEncryptionAvailable())throw new Error("Secure Windows storage is unavailable.");const id=crypto.randomUUID(),createdAt=new Date().toISOString();const evidence=buildBiologyEvidence(investigation);const packageValue={version:1,id,sourceApp:"fieldwise-biology",activityId:investigation.activityId,classId:investigation.classId,studentId:investigation.studentId,schoolId:investigation.schoolId,title:investigation.title,status:"submitted",createdAt,evidence,investigation:sanitizeTransferValue(investigation)};const encrypted=safeStorage.encryptString(JSON.stringify(packageValue));const digest=crypto.createHash("sha256").update(encrypted).digest("hex");const directory=path.join(app.getPath("documents"),"FieldWise Education","Transfers");await fs.promises.mkdir(directory,{recursive:true});await fs.promises.writeFile(path.join(directory,`${id}.bin`),encrypted,{mode:0o600});const receipt={id,sourceApp:"fieldwise-biology",status:"queued",activityId:investigation.activityId,evidenceCount:evidence.length,createdAt,digest};await platformServices.store.set(`submission-${id}`,{receipt,investigation});await shell.openExternal(`fieldwise-core://submission/${id}?sourceApp=fieldwise-biology&status=queued&digest=${digest}`);return receipt;});

app.whenReady().then(() => {
  authGateway = new SubjectAuthGateway(app.getPath("userData"), "biology");
  platformServices=registerPlatformIpc({ ipcMain, app, safeStorage, dialog, BrowserWindow, appId });
  const logger = new PlatformLogger(app.getPath("userData"), appId);
  process.on("uncaughtException", (error) => logger.write("error", "uncaughtException", { message:error.message, stack:error.stack }));
  process.on("unhandledRejection", (error) => logger.write("error", "unhandledRejection", { message:error?.message || String(error), stack:error?.stack }));
  createWindow();
  const value=process.argv.find(item=>item.startsWith("fieldwise-biology:"));if(value)acceptLaunch(value);
});
app.on("window-all-closed", () => app.quit());
