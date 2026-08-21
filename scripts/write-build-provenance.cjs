const fs = require("node:fs");
const path = require("node:path");

function createBuildProvenance(manifest, environment = process.env, now = new Date()) {
  const sourceCommit = environment.GITHUB_SHA;
  if (!/^[a-f\d]{40}$/i.test(sourceCommit || "")) {
    throw new Error("GITHUB_SHA must be a 40-character commit hash");
  }
  if (!environment.GITHUB_REPOSITORY || !environment.GITHUB_RUN_ID || !environment.GITHUB_RUN_ATTEMPT) {
    throw new Error("GitHub repository and run identity are required");
  }
  return {
    schemaVersion: 1,
    appId: manifest.appId,
    version: manifest.version,
    platform: manifest.platform,
    architecture: manifest.architecture,
    repository: environment.GITHUB_REPOSITORY,
    sourceCommit: sourceCommit.toLowerCase(),
    workflowRunId: environment.GITHUB_RUN_ID,
    workflowRunAttempt: environment.GITHUB_RUN_ATTEMPT,
    builtAt: now.toISOString()
  };
}

function writeBuildProvenance(manifestPath, outputPath, environment = process.env, now = new Date()) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const provenance = createBuildProvenance(manifest, environment, now);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(provenance, null, 2)}\n`);
  return provenance;
}

if (require.main === module) {
  const [manifestPath, outputPath] = process.argv.slice(2);
  if (!manifestPath || !outputPath) {
    throw new Error("Usage: write-build-provenance <manifest> <output>");
  }
  const provenance = writeBuildProvenance(manifestPath, outputPath);
  console.log(`Recorded provenance for ${provenance.appId} at ${provenance.sourceCommit}`);
}

module.exports = { createBuildProvenance, writeBuildProvenance };
