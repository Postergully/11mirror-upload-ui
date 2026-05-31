import { CogneeInstance } from "../instances/types";
import { addFilesViaLibrarian, addUrlViaLibrarian } from "./addViaLibrarian";

function tenantOf(instance: CogneeInstance): string {
  // CogneeInstance carries tenant context on its headers; fall back to "default".
  return (instance as any).tenant ?? "default";
}

export default async function addData(
  dataset: { id?: string; name?: string },
  files: File[],
  instance: CogneeInstance,
): Promise<any> {
  const r = await addFilesViaLibrarian(dataset, files, tenantOf(instance));
  // Shape-compatible with old Cognee response (dataset_id, dataset_name).
  return { dataset_id: r.dataset_id, dataset_name: r.dataset_name };
}

export async function addUrlData(
  dataset: { id?: string; name?: string },
  url: string,
  instance: CogneeInstance,
): Promise<any> {
  const r = await addUrlViaLibrarian(dataset, url, tenantOf(instance));
  return { dataset_id: r.dataset_id, dataset_name: r.dataset_name };
}
