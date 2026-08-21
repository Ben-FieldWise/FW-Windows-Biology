const fs=require("node:fs");
const asar=require("@electron/asar");
function verifyPackagedApp(archivePath,expectedApp){
  if(!fs.existsSync(archivePath))throw new Error(`Packaged ASAR is missing: ${archivePath}`);
  const entries=new Set(asar.listPackage(archivePath));
  for(const file of ["/electron/main.cjs","/electron/preload.cjs","/src/index.html","/src/app.mjs","/src/accessibility.mjs","/package.json"]){
    if(!entries.has(file))throw new Error(`Packaged app is missing ${file}`);
  }
  const pkg=JSON.parse(asar.extractFile(archivePath,"package.json").toString("utf8"));
  if(pkg.fieldwiseApp!==expectedApp)throw new Error(`Packaged identity is ${pkg.fieldwiseApp}, expected ${expectedApp}`);
  if(pkg.main!=="electron/main.cjs")throw new Error("Packaged Electron entry point is invalid.");
  const main=asar.extractFile(archivePath,"electron/main.cjs").toString("utf8");
  const preload=asar.extractFile(archivePath,"electron/preload.cjs").toString("utf8");
  for(const token of [`${expectedApp}:migrate-investigation`,`${expectedApp}:submit-to-core`]){
    if(!main.includes(token))throw new Error(`Packaged main process is missing ${token}`);
  }
  if(!preload.includes(`${expectedApp}:migrate-investigation`))throw new Error("Packaged preload is missing the migration bridge.");
  if(!main.includes("fieldwise-core://submission/"))throw new Error("Packaged app is missing the Core return handoff.");
  return{appId:expectedApp,files:entries.size};
}
if(require.main===module){const [archivePath,expectedApp]=process.argv.slice(2);if(!archivePath||!expectedApp)throw new Error("Usage: verify-packaged-app <app.asar> <appId>");console.log(JSON.stringify(verifyPackagedApp(archivePath,expectedApp)));}
module.exports={verifyPackagedApp};

