import test from "node:test";
import assert from "node:assert/strict";
import { appConfigs, resolveAppConfig } from "../src/config.mjs";

test("defines the Biology Windows identity", () => {
  assert.deepEqual(Object.keys(appConfigs).sort(), ["biology", "core", "history"]);
});

test("every app exposes five desktop navigation destinations", () => {
  for (const config of Object.values(appConfigs)) assert.equal(config.tabs.length, 5);
});

test("unknown app identifiers safely fall back to Core", () => {
  assert.equal(resolveAppConfig("unknown"), appConfigs.core);
});
