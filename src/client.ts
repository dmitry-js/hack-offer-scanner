import { LIST_FILTERS, REQUEST_TIMEOUT_MS } from "./config.js";
import {
  AuthenticationError,
  EntitlementError,
  HackOfferApiError,
} from "./errors.js";
import type {
  HackOfferDetailResponse,
  HackOfferListResponse,
} from "./types.js";

export type HackOfferClientOptions = {
  token: string;
  baseUrl?: string;
  fetchImplementation?: typeof fetch;
  timeoutMs?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export class HackOfferClient {
  readonly #token: string;
  readonly #baseUrl: string;
  readonly #fetch: typeof fetch;
  readonly #timeoutMs: number;

  constructor(options: HackOfferClientOptions) {
    if (!options.token.trim()) throw new AuthenticationError();
    this.#token = options.token.trim();
    this.#baseUrl = (options.baseUrl ?? "https://hack-offer.tech").replace(/\/$/, "");
    this.#fetch = options.fetchImplementation ?? fetch;
    this.#timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
  }

  async #request(path: string): Promise<unknown> {
    const response = await this.#fetch(new URL(path, this.#baseUrl), {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.#token}`,
      },
      signal: AbortSignal.timeout(this.#timeoutMs),
    });

    if (response.status === 401 || response.status === 403) {
      throw new AuthenticationError();
    }
    if (!response.ok) throw new HackOfferApiError(response.status, path);

    try {
      return await response.json();
    } catch {
      throw new HackOfferApiError(response.status, path);
    }
  }

  async listVacancies(page: number): Promise<HackOfferListResponse> {
    const parameters = new URLSearchParams({ ...LIST_FILTERS, page: String(page) });
    const path = `/api/jobboard/list?${parameters.toString()}`;
    const value = await this.#request(path);
    if (isRecord(value) && value.entitled === false) throw new EntitlementError();
    if (!isRecord(value) || !Array.isArray(value.jobs)) {
      throw new HackOfferApiError(200, "/api/jobboard/list");
    }
    return value as HackOfferListResponse;
  }

  async getVacancy(id: string): Promise<HackOfferDetailResponse> {
    const path = `/api/jobboard/vacancy/${encodeURIComponent(id)}`;
    const value = await this.#request(path);
    if (isRecord(value) && value.entitled === false) throw new EntitlementError();
    if (!isRecord(value) || !isRecord(value.job)) {
      throw new HackOfferApiError(200, path);
    }
    return value as HackOfferDetailResponse;
  }
}
