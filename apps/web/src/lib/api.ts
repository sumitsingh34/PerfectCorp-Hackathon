/**
 * Generic client for the Deno proxy that mirrors YouCam V2 (file → task → poll).
 * The proxy holds the bearer token; this module never sees the API key.
 */

const BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") || "";

if (!BASE && import.meta.env.MODE !== "test") {
  // Surface this loudly during dev — without the proxy URL nothing works.
  console.warn("[api] VITE_API_BASE is not set");
}

export type FileMeta = {
  content_type: string;
  file_name: string;
  file_size: number;
};

export type UploadResponse = {
  file_id: string;
  upload_url: string;
  // YouCam returns the headers the client must echo on the S3 PUT.
  headers?: Record<string, string>;
};

export type TaskCreateResponse = {
  task_id: string;
};

export type TaskStatus<TResult = unknown> = {
  status: "pending" | "running" | "success" | "error";
  result?: TResult;
  error?: unknown;
  /** Server-reported progress 0–100 if available. */
  progress?: number;
};

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}

function describeTaskError(err: unknown): string {
  if (err == null) return "";
  if (typeof err === "string") return err.slice(0, 200);
  if (typeof err === "object") {
    const e = err as Record<string, unknown>;
    for (const k of ["error_message", "message", "error", "reason", "detail", "error_code", "error_id"]) {
      const v = e[k];
      if (typeof v === "string" && v) return v.slice(0, 200);
    }
    try { return JSON.stringify(e).slice(0, 200); } catch { return ""; }
  }
  return String(err).slice(0, 200);
}

async function jsonFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    let body: unknown;
    try { body = await res.json(); } catch { body = await res.text(); }
    const detail = (() => {
      if (typeof body === "string") return body.slice(0, 200);
      if (body && typeof body === "object") {
        const b = body as Record<string, unknown>;
        const msg = b.error ?? b.message ?? b.error_message ?? b.detail;
        if (typeof msg === "string") return msg;
        try { return JSON.stringify(b).slice(0, 200); } catch { return ""; }
      }
      return "";
    })();
    const message = detail
      ? `${res.status} ${res.statusText} — ${detail}`
      : `${res.status} ${res.statusText}`;
    console.error("[api]", input, "→", res.status, body);
    throw new ApiError(res.status, message, body);
  }
  return res.json() as Promise<T>;
}

/** Step 1: ask the proxy for a presigned upload URL for the given feature. */
export function requestUpload(feature: string, files: FileMeta[]): Promise<{ files: UploadResponse[] }> {
  return jsonFetch(`${BASE}/api/upload/${feature}`, {
    method: "POST",
    body: JSON.stringify({ files }),
  });
}

/** Step 2: PUT the bytes directly to S3 (browser → S3, no proxy bandwidth). */
export async function uploadBlob(target: UploadResponse, blob: Blob): Promise<void> {
  const res = await fetch(target.upload_url, {
    method: "PUT",
    headers: { "Content-Type": blob.type, ...(target.headers || {}) },
    body: blob,
  });
  if (!res.ok) throw new ApiError(res.status, `S3 upload failed: ${res.status}`);
}

/** Step 3: create a task referencing the uploaded file. */
export function createTask<TBody extends object>(feature: string, body: TBody): Promise<TaskCreateResponse> {
  return jsonFetch(`${BASE}/api/task/${feature}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Step 4: poll until success/error with capped exponential backoff. */
export async function pollTask<TResult = unknown>(
  feature: string,
  taskId: string,
  opts: { signal?: AbortSignal; onProgress?: (p: number) => void; timeoutMs?: number } = {},
): Promise<TResult> {
  const start = Date.now();
  const timeout = opts.timeoutMs ?? 90_000;
  let delay = 1000;
  while (true) {
    if (opts.signal?.aborted) throw new Error("polling aborted");
    if (Date.now() - start > timeout) throw new Error("polling timed out");

    const status = await jsonFetch<TaskStatus<TResult>>(`${BASE}/api/task/${feature}/${taskId}`);
    if (status.progress != null) opts.onProgress?.(status.progress);

    if (status.status === "success") return status.result as TResult;
    if (status.status === "error") {
      const detail = describeTaskError(status.error);
      throw new ApiError(
        500,
        detail ? `${feature} task failed — ${detail}` : `${feature} task failed`,
        status.error,
      );
    }

    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 1.6, 8000);
  }
}

/** Wrap any thrown error with the feature name so we know which call failed. */
async function tagged<T>(feature: string, step: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiError) {
      throw new ApiError(err.status, `${feature}/${step}: ${err.message}`, err.body);
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`${feature}/${step}: ${msg}`);
  }
}

/** End-to-end helper: upload a single blob and run a task on it. */
export async function runFeature<TBody extends object, TResult = unknown>(
  feature: string,
  blob: Blob,
  fileName: string,
  buildBody: (fileId: string) => TBody,
  opts: { onProgress?: (label: string, p: number) => void; signal?: AbortSignal } = {},
): Promise<TResult> {
  opts.onProgress?.("uploading", 5);
  const { files } = await tagged(feature, "upload", () =>
    requestUpload(feature, [{ content_type: blob.type, file_name: fileName, file_size: blob.size }]),
  );
  const target = files[0];
  await tagged(feature, "s3-put", () => uploadBlob(target, blob));

  opts.onProgress?.("queued", 20);
  const { task_id } = await tagged(feature, "task-create", () =>
    createTask(feature, buildBody(target.file_id)),
  );

  opts.onProgress?.("processing", 30);
  return tagged(feature, "poll", () =>
    pollTask<TResult>(feature, task_id, {
      signal: opts.signal,
      onProgress: (p) => opts.onProgress?.("processing", 30 + Math.round(p * 0.65)),
    }),
  );
}
