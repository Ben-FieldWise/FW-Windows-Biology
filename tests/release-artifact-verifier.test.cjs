const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { verifyReleaseArtifacts } = require("../scripts/verify-release-artifacts.cjs");

test("release verifier accepts the exact manifest installer and checksum", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "fieldwise-release-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const installerName = "FieldWise-Biology-Windows-0.7.0-rc.1-Setup.exe";
  const installer = Buffer.from("fieldwise release candidate");
  fs.writeFileSync(path.join(directory, installerName), installer);
  const digest = crypto.createHash("sha256").update(installer).digest("hex");
  fs.writeFileSync(path.join(directory, "SHA256SUMS.txt"), `${digest}  ${installerName}\n`);
  const manifestPath = path.join(directory, "release-candidate.json");
  fs.writeFileSync(manifestPath, JSON.stringify({ installer: { artifactName: installerName, checksumFile: "SHA256SUMS.txt" } }));

  assert.deepEqual(verifyReleaseArtifacts(manifestPath, directory), { installerName, sha256: digest, verifiedFiles: 1 });
});

test("release verifier rejects a checksum mismatch", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "fieldwise-release-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const installerName = "FieldWise-Biology-Windows-0.7.0-rc.1-Setup.exe";
  fs.writeFileSync(path.join(directory, installerName), "candidate");
  fs.writeFileSync(path.join(directory, "SHA256SUMS.txt"), `${"0".repeat(64)}  ${installerName}\n`);
  const manifestPath = path.join(directory, "release-candidate.json");
  fs.writeFileSync(manifestPath, JSON.stringify({ installer: { artifactName: installerName, checksumFile: "SHA256SUMS.txt" } }));

  assert.throws(() => verifyReleaseArtifacts(manifestPath, directory), /Checksum entry does not match/);
});

test("release verifier checks every listed artifact", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "fieldwise-release-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const installerName = require(path.join(__dirname, "..", "release-candidate.json")).installer.artifactName;
  const installer = Buffer.from("candidate");
  const metadata = Buffer.from("original metadata");
  fs.writeFileSync(path.join(directory, installerName), installer);
  fs.writeFileSync(path.join(directory, "latest.yml"), "tampered metadata");
  const installerDigest = crypto.createHash("sha256").update(installer).digest("hex");
  const metadataDigest = crypto.createHash("sha256").update(metadata).digest("hex");
  fs.writeFileSync(path.join(directory, "SHA256SUMS.txt"), `${installerDigest}  ${installerName}\n${metadataDigest}  latest.yml\n`);
  const manifestPath = path.join(directory, "release-candidate.json");
  fs.writeFileSync(manifestPath, JSON.stringify({ installer: { artifactName: installerName, checksumFile: "SHA256SUMS.txt" } }));

  assert.throws(() => verifyReleaseArtifacts(manifestPath, directory), /Checksum entry does not match latest.yml/);
});

test("release verifier rejects paths escaping the artifact directory", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "fieldwise-release-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const manifestPath = path.join(directory, "release-candidate.json");
  fs.writeFileSync(manifestPath, JSON.stringify({ installer: { artifactName: "../candidate.exe", checksumFile: "SHA256SUMS.txt" } }));

  assert.throws(() => verifyReleaseArtifacts(manifestPath, directory), /must not contain directory paths/);
});
