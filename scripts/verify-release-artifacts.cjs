const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

function verifyReleaseArtifacts(manifestPath, artifactDirectory) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const installerName = manifest.installer?.artifactName;
  const checksumName = manifest.installer?.checksumFile;

  if (!installerName || !checksumName) {
    throw new Error("Release manifest must name an installer and checksum file");
  }
  if (path.basename(installerName) !== installerName || path.basename(checksumName) !== checksumName) {
    throw new Error("Release manifest filenames must not contain directory paths");
  }

  const installerPath = path.join(artifactDirectory, installerName);
  const checksumPath = path.join(artifactDirectory, checksumName);
  if (!fs.statSync(installerPath).isFile() || !fs.statSync(checksumPath).isFile()) {
    throw new Error("Release candidate installer or checksum file is missing");
  }

  const entries = fs.readFileSync(checksumPath, "utf8").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const verified = new Map();
  for (const entry of entries) {
    const match = /^([a-f\d]{64})\s{2}(.+)$/i.exec(entry);
    if (!match) throw new Error(`Invalid checksum entry: ${entry}`);
    const [, expectedDigest, fileName] = match;
    if (path.basename(fileName) !== fileName) throw new Error(`Unsafe checksum filename: ${fileName}`);
    if (fileName === checksumName) throw new Error("Checksum file must not checksum itself");
    if (verified.has(fileName)) throw new Error(`Duplicate checksum entry: ${fileName}`);
    const filePath = path.join(artifactDirectory, fileName);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      throw new Error(`Checksummed artifact is missing: ${fileName}`);
    }
    const actualDigest = crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
    if (actualDigest !== expectedDigest.toLowerCase()) {
      throw new Error(`Checksum entry does not match ${fileName}`);
    }
    verified.set(fileName, actualDigest);
  }

  if (!verified.has(installerName)) {
    throw new Error(`Checksum entry is missing for ${installerName}`);
  }
  if (manifest.provenanceFile) {
    if (!verified.has(manifest.provenanceFile)) {
      throw new Error(`Checksum entry is missing for ${manifest.provenanceFile}`);
    }
    const provenance = JSON.parse(fs.readFileSync(path.join(artifactDirectory, manifest.provenanceFile), "utf8"));
    if (provenance.appId !== manifest.appId || provenance.version !== manifest.version) {
      throw new Error("Build provenance does not match the release manifest");
    }
    if (!/^[a-f\d]{40}$/i.test(provenance.sourceCommit)) {
      throw new Error("Build provenance source commit is invalid");
    }
  }

  return { installerName, sha256: verified.get(installerName), verifiedFiles: verified.size };
}

if (require.main === module) {
  const [manifestPath, artifactDirectory] = process.argv.slice(2);
  if (!manifestPath || !artifactDirectory) {
    throw new Error("Usage: verify-release-artifacts <manifest> <artifact-directory>");
  }
  const result = verifyReleaseArtifacts(manifestPath, artifactDirectory);
  console.log(`Verified ${result.verifiedFiles} release files including ${result.installerName} (${result.sha256})`);
}

module.exports = { verifyReleaseArtifacts };
