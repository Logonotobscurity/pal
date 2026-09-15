/**
 * Idempotency Key Generation
 * 
 * Implements PAL_ARCHITECTURE.md §33: Idempotency
 * 
 * Every external action must have a deterministic idempotency key.
 * Never use random UUIDs as the only protection against duplicate execution.
 */

/**
 * Generate deterministic idempotency key
 * 
 * SHA256(workspaceId + proposalId + version)
 * 
 * @param workspaceId Workspace identifier
 * @param proposalId Proposal identifier
 * @param version Proposal version for optimistic locking
 * @returns 64-character hex string (SHA256 hash)
 */
export async function generateIdempotencyKey(
  workspaceId: string,
  proposalId: string,
  version: number,
): Promise<string> {
  const input = `${workspaceId}${proposalId}${version}`;
  
  // Use Web Crypto API for browser/edge compatibility
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  
  return hashHex;
}

/**
 * Validate idempotency key format
 * 
 * Must be 64-character hex string (SHA256)
 */
export function isValidIdempotencyKey(key: string): boolean {
  return /^[a-f0-9]{64}$/.test(key);
}

