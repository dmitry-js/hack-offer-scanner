import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { MissingTokenError } from "./errors.js";

function unquote(value: string): string {
  if (value.length >= 2) {
    const first = value[0];
    const last = value.at(-1);
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1);
    }
  }
  return value;
}

export function parseEnvFile(contents: string): Readonly<Record<string, string>> {
  const values: Record<string, string> = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    const value = unquote(line.slice(separator + 1).trim());
    values[key] = value;
  }
  return values;
}

export async function loadHackOfferToken(
  cwd = process.cwd(),
  environment: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  const environmentToken = environment.HACK_OFFER_TOKEN?.trim();
  if (environmentToken) return environmentToken;

  let contents = "";
  try {
    contents = await readFile(resolve(cwd, ".env.local"), "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw error;
  }

  const token = parseEnvFile(contents).HACK_OFFER_TOKEN?.trim();
  if (!token) throw new MissingTokenError();
  return token;
}
