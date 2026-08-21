const test = require("node:test");
const assert = require("node:assert/strict");
const manifest = require("../release-candidate.json");
const { createBuildProvenance } = require("../scripts/write-build-provenance.cjs");

test("build provenance binds the candidate to its source workflow", () => {
  const now = new Date("2026-08-21T01:02:03.000Z");
  const provenance = createBuildProvenance(manifest, {
    GITHUB_SHA: "ABCDEF0123456789ABCDEF0123456789ABCDEF01",
    GITHUB_REPOSITORY: "Ben-FieldWise/FW-Windows-Biology",
    GITHUB_RUN_ID: "123456",
    GITHUB_RUN_ATTEMPT: "2"
  }, now);

  assert.equal(provenance.appId, manifest.appId);
  assert.equal(provenance.version, manifest.version);
  assert.equal(provenance.sourceCommit, "abcdef0123456789abcdef0123456789abcdef01");
  assert.equal(provenance.workflowRunId, "123456");
  assert.equal(provenance.workflowRunAttempt, "2");
  assert.equal(provenance.builtAt, now.toISOString());
});

test("build provenance rejects an ambiguous source revision", () => {
  assert.throws(() => createBuildProvenance(manifest, {
    GITHUB_SHA: "main",
    GITHUB_REPOSITORY: "Ben-FieldWise/repository",
    GITHUB_RUN_ID: "123456",
    GITHUB_RUN_ATTEMPT: "1"
  }), /40-character commit hash/);
});
