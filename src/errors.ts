export const AUTHENTICATION_MESSAGE =
  "Hack Offer authentication failed. Log in to hack-offer.tech and update HACK_OFFER_TOKEN in .env.local.";

export class AuthenticationError extends Error {
  constructor() {
    super(AUTHENTICATION_MESSAGE);
    this.name = "AuthenticationError";
  }
}

export class EntitlementError extends Error {
  constructor() {
    super("The current Hack Offer account does not have access to the job board.");
    this.name = "EntitlementError";
  }
}

export class MissingTokenError extends Error {
  constructor() {
    super("HACK_OFFER_TOKEN is missing. Add it to .env.local.");
    this.name = "MissingTokenError";
  }
}

export class HackOfferApiError extends Error {
  constructor(status: number, path: string) {
    super(`Hack Offer request failed (${status}) for ${path}.`);
    this.name = "HackOfferApiError";
  }
}
