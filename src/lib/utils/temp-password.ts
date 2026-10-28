/** Browser-safe temporary password (hex). Not for hashing secrets server-side. */
export function generateTemporaryPassword(byteLength = 9): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
