import assert from "node:assert/strict";
import test from "node:test";
import { HackOfferClient } from "../src/client.js";
import {
  AUTHENTICATION_MESSAGE,
  AuthenticationError,
  EntitlementError,
} from "../src/errors.js";
import { listJob } from "./fixtures.js";

function listResponse(overrides: Record<string, unknown> = {}): object {
  return {
    jobs: [listJob("1")],
    total: 1,
    page: 1,
    pageSize: 20,
    pages: 1,
    category: "frontend",
    entitled: true,
    ...overrides,
  };
}

test("sends the bearer authorization header and structured list filters", async () => {
  const token = "secret-jwt-value";
  let requestedUrl = "";
  let requestedHeaders = new Headers();
  const fetchImplementation = (async (input: string | URL | Request, init?: RequestInit) => {
    requestedUrl = new URL(typeof input === "string" || input instanceof URL ? input : input.url).href;
    requestedHeaders = new Headers(init?.headers);
    return Response.json(listResponse());
  }) as typeof fetch;

  const client = new HackOfferClient({
    token,
    baseUrl: "https://mock.hack-offer.test",
    fetchImplementation,
    timeoutMs: 1_000,
  });
  await client.listVacancies(2);

  assert.equal(requestedHeaders.get("authorization"), `Bearer ${token}`);
  assert.equal(requestedHeaders.get("accept"), "application/json");
  const url = new URL(requestedUrl);
  assert.equal(url.pathname, "/api/jobboard/list");
  assert.equal(url.searchParams.get("spec"), "frontend");
  assert.equal(url.searchParams.get("remote"), "hybrid,remote");
  assert.equal(url.searchParams.get("grade"), "senior,middle");
  assert.equal(url.searchParams.get("page"), "2");
});

test("turns both 401 and 403 into the concise authentication error", async (t) => {
  for (const status of [401, 403]) {
    await t.test(String(status), async () => {
      const fetchImplementation = (async () => new Response("denied", { status })) as typeof fetch;
      const client = new HackOfferClient({ token: "secret", fetchImplementation, timeoutMs: 1_000 });
      await assert.rejects(client.listVacancies(1), (error: unknown) => {
        assert.ok(error instanceof AuthenticationError);
        assert.equal(error.message, AUTHENTICATION_MESSAGE);
        assert.doesNotMatch(error.message, /secret/);
        return true;
      });
    });
  }
});

test("stops when the account is not entitled to the job board", async () => {
  const fetchImplementation = (async () => Response.json({ entitled: false })) as typeof fetch;
  const client = new HackOfferClient({ token: "secret", fetchImplementation, timeoutMs: 1_000 });
  await assert.rejects(client.listVacancies(1), EntitlementError);
  await assert.rejects(client.getVacancy("1"), EntitlementError);
});
