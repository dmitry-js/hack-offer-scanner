import assert from "node:assert/strict";
import test from "node:test";
import { loadHackOfferToken, parseEnvFile } from "../src/env.js";
import { MissingTokenError } from "../src/errors.js";

test("parses an env-local token without logging or transforming it", () => {
  const token = "ey.example.jwt";
  assert.equal(parseEnvFile(`# local only\nHACK_OFFER_TOKEN='${token}'\n`).HACK_OFFER_TOKEN, token);
});

test("reports a missing token concisely", async () => {
  await assert.rejects(
    loadHackOfferToken("/path/that/does/not/exist", {}),
    (error: unknown) => {
      assert.ok(error instanceof MissingTokenError);
      assert.equal(error.message, "HACK_OFFER_TOKEN is missing. Add it to .env.local.");
      return true;
    },
  );
});
