/**
 * Librarian client — talks to upload.prod.11mirror.com backend.
 *
 * Auth model: cognee-frontend authenticates via HTTP-only cookies set by
 * POST /api/v1/auth/login (see LocalSignInForm.tsx, credentials: "include").
 * There is NO JWT in localStorage. We forward cookies via credentials: "include".
 *
 * If a future deployment chooses to mint a Bearer token and stash it in
 * localStorage under "auth_token", we honor that as a fallback.
 */

const LIBRARIAN_URL = process.env.NEXT_PUBLIC_LIBRARIAN_URL || "/api";

function authHeader(): HeadersInit {
  // Cognee-frontend uses cookie auth. We still check localStorage as a
  // future-proof escape hatch for token-based deployments.
  if (typeof window === "undefined") return {};
  const t = localStorage.getItem("auth_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export async function uploadFile(file: File, datasetName = "default") {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("dataset_name", datasetName);
  const r = await fetch(`${LIBRARIAN_URL}/api/upload`, {
    method: "POST",
    body: fd,
    headers: authHeader(),
    credentials: "include",
  });
  if (!r.ok) throw new Error(`upload failed: ${r.status}`);
  return (await r.json()) as { job_id: string; status: string };
}

export async function getJob(jobId: string) {
  const r = await fetch(`${LIBRARIAN_URL}/api/jobs/${jobId}`, {
    headers: authHeader(),
    credentials: "include",
  });
  if (!r.ok) throw new Error(`job fetch failed: ${r.status}`);
  return r.json();
}

export async function listFbrainPages(limit = 50) {
  const r = await fetch(`${LIBRARIAN_URL}/api/fbrain/pages?limit=${limit}`, {
    headers: authHeader(),
    credentials: "include",
  });
  if (!r.ok) throw new Error(`list_pages failed: ${r.status}`);
  return r.json();
}
