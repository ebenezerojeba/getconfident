/** Browser-side helpers for calling the app's JSON API. */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as {
      error?: { code?: string; message?: string; fieldErrors?: Record<string, string[]> };
    };
    return new ApiError(
      body.error?.message ?? "Something went wrong. Please try again.",
      res.status,
      body.error?.code ?? "UNKNOWN",
      body.error?.fieldErrors,
    );
  } catch {
    return new ApiError("Something went wrong. Please try again.", res.status, "UNKNOWN");
  }
}

export async function apiFetch<T>(
  url: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, headers, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: {
        ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Network error. Check your connection and try again.", 0, "NETWORK");
  }
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.assign(`/sign-in?next=${encodeURIComponent(window.location.pathname)}`);
  }
  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** multipart upload with progress (fetch has no upload progress events). */
export function uploadWithProgress(
  url: string,
  form: FormData,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve(xhr.response);
      const err = (xhr.response as { error?: { message?: string; code?: string } } | null)?.error;
      reject(
        new ApiError(
          err?.message ?? "Upload failed. Please try again.",
          xhr.status,
          err?.code ?? "UPLOAD",
        ),
      );
    };
    xhr.onerror = () => reject(new ApiError("Network error during upload.", 0, "NETWORK"));
    xhr.onabort = () => reject(new ApiError("Upload cancelled.", 0, "ABORTED"));
    signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(form);
  });
}
