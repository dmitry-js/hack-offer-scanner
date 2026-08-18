import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { HackOfferClient } from "./client.js";
import { collectVacancies, type ProgressEvent } from "./collect.js";
import {
  DETAIL_REQUEST_BUDGET,
  HACK_OFFER_BASE_URL,
  TARGET_COUNT,
  positiveInteger,
} from "./config.js";
import { loadHackOfferToken } from "./env.js";
import { filterAndRank, selectDiverseVacancies } from "./filter.js";
import { writeOutputs } from "./format.js";

function logProgress(event: ProgressEvent): void {
  switch (event.type) {
    case "page":
      console.log(`Page ${event.page}/${event.pages}: ${event.count}`);
      break;
    case "discovery":
      console.log(`\nDiscovery: ${event.raw} raw, ${event.unique} unique`);
      console.log(`Removed by cheap pre-filter: ${event.prefiltered}\n`);
      break;
    case "details":
      console.log(`Fetched details: ${event.completed}/${event.total}`);
      break;
    case "rejected":
      console.log(`Rejected vacancy ${event.id} (${event.title}): ${event.reason}`);
      break;
    case "warning":
      console.warn(event.message);
      break;
  }
}

function publicErrorMessage(error: unknown, token: string | null): string {
  const message = error instanceof Error ? error.message : "Hack Offer scan failed.";
  return token ? message.replaceAll(token, "[redacted]") : message;
}

export async function run(cwd = process.cwd()): Promise<void> {
  let token: string | null = null;
  try {
    token = await loadHackOfferToken(cwd);
    const detailBudget = positiveInteger(
      process.env.HACK_OFFER_DETAIL_REQUEST_BUDGET,
      DETAIL_REQUEST_BUDGET,
    );
    const targetCount = positiveInteger(process.env.HACK_OFFER_TARGET_COUNT, TARGET_COUNT);
    const client = new HackOfferClient({ token, baseUrl: HACK_OFFER_BASE_URL });

    console.log("Searching Hack Offer...\n");
    const collection = await collectVacancies(client, logProgress, detailBudget);
    const filtering = filterAndRank(collection.vacancies);
    for (const rejection of filtering.rejected) {
      logProgress({ type: "rejected", ...rejection });
    }
    const selected = selectDiverseVacancies(filtering.accepted, targetCount);
    const paths = await writeOutputs(selected, cwd);

    console.log(`\nRaw vacancies: ${collection.rawCount}`);
    console.log(`Unique vacancies: ${collection.uniqueCount}`);
    console.log(`Full vacancy pages fetched: ${collection.detailPagesFetched}`);
    if (collection.detailFailures > 0) console.log(`Detail fetch failures: ${collection.detailFailures}`);
    console.log(`After full filtering/scoring: ${filtering.accepted.length}`);
    console.log(`Final exported: ${selected.length}`);
    console.log("\nGenerated:");
    console.log(paths.markdownPath);
    console.log(paths.jsonPath);
  } catch (error) {
    console.error(publicErrorMessage(error, token));
    process.exitCode = 1;
  }
}

const entryPoint = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === entryPoint) await run();
