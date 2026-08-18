import assert from "node:assert/strict";
import test from "node:test";
import { HackOfferClient } from "../src/client.js";
import { collectVacancies, fetchAllListVacancies } from "../src/collect.js";
import { detailJob, listJob } from "./fixtures.js";

function page(jobs: object[], currentPage: number, pages: number): object {
  return {
    jobs,
    total: 4,
    page: currentPage,
    pageSize: 2,
    pages,
    category: "frontend",
    entitled: true,
  };
}

test("reads the page count from page one and fetches every remaining page", async () => {
  const requestedPages: string[] = [];
  const fetchImplementation = (async (input: string | URL | Request) => {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    const requestedPage = url.searchParams.get("page") ?? "";
    requestedPages.push(requestedPage);
    const jobs = requestedPage === "1" ? [listJob("1")] : [listJob(requestedPage)];
    return Response.json(page(jobs, Number(requestedPage), 3));
  }) as typeof fetch;
  const client = new HackOfferClient({ token: "secret", fetchImplementation, timeoutMs: 1_000 });

  const jobs = await fetchAllListVacancies(client);
  assert.deepEqual(requestedPages, ["1", "2", "3"]);
  assert.deepEqual(jobs.map((job) => job.id), ["1", "2", "3"]);
});

test("deduplicates list IDs, prefilters cheaply, ranks, and respects the detail budget", async () => {
  const detailIds: string[] = [];
  const fetchImplementation = (async (input: string | URL | Request) => {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    if (url.pathname === "/api/jobboard/list") {
      const requestedPage = Number(url.searchParams.get("page"));
      if (requestedPage === 1) {
        return Response.json(page([
          listJob("1", { title: "Frontend Developer", grade: "middle" }),
          listJob("2", { title: "Senior React Developer" }),
          listJob("bad", { title: "Junior Frontend Developer" }),
        ], 1, 2));
      }
      return Response.json(page([listJob("1"), listJob("3", { title: "Frontend Tech Lead" })], 2, 2));
    }
    const id = url.pathname.split("/").at(-1) as string;
    detailIds.push(id);
    return Response.json({ job: detailJob(id), entitled: true });
  }) as typeof fetch;
  const client = new HackOfferClient({ token: "secret", fetchImplementation, timeoutMs: 1_000 });

  const result = await collectVacancies(client, () => undefined, 2);
  assert.equal(result.rawCount, 5);
  assert.equal(result.uniqueCount, 4);
  assert.equal(result.prefilteredCount, 1);
  assert.equal(result.detailPagesFetched, 2);
  assert.deepEqual(detailIds, ["2", "3"]);
});
