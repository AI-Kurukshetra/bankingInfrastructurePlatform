import { createHash, randomBytes } from "crypto";

export type GeneratedApiKey = {
  /** Full raw key — shown to the user exactly once at creation. Never store this. */
  rawKey: string;
  /** SHA-256 hash of rawKey — stored in the database for verification. */
  keyHash: string;
  /** Short prefix shown in listings so users can identify keys without exposing secrets. */
  keyPrefix: string;
};

/**
 * Generates a new API key triple.
 * Store only `keyHash` and `keyPrefix` in the database.
 * Return `rawKey` to the user once and discard it.
 */
export function generateApiKey(): GeneratedApiKey {
  const secret = randomBytes(32).toString("hex");
  const rawKey = `fsk_live_${secret}`;
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  // Prefix: "fsk_live_" + first 8 hex chars, e.g. "fsk_live_a1b2c3d4"
  const keyPrefix = `fsk_live_${secret.slice(0, 8)}`;

  return { rawKey, keyHash, keyPrefix };
}

/**
 * Hashes an inbound raw key for comparison against stored hashes.
 * Use during API key authentication on incoming requests.
 */
export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}
