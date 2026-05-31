/**
 * Gateway base URL resolver. Checks NEXT_PUBLIC_LIBRARIAN_URL then falls
 * back to the current origin with port 8200 (works when dashboard runs
 * on the same host as the gateway).
 */
export function librarianBaseUrl(): string {
  const env = (globalThis as any).process?.env?.NEXT_PUBLIC_LIBRARIAN_URL;
  if (env) return env;
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:8200`;
  }
  return "http://localhost:8200";
}
