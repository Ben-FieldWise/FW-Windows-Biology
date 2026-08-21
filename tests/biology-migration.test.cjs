const test=require("node:test");
const assert=require("node:assert/strict");
const {migrateInvestigation}=require("../electron/biology-contracts.cjs");
test("legacy Biology investigations gain safe specialist defaults",()=>{const migrated=migrateInvestigation({id:"old",templateId:"microscopy",sites:[{id:"site",notes:"kept"}]});assert.equal(migrated.schemaVersion,2);assert.equal(migrated.sites[0].notes,"kept");assert.equal(migrated.safetyEthics.specimenApproved,false);assert.equal(migrated.plannedReplicates,1);assert.deepEqual(migrated.biologyRecords,[]);});

