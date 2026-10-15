import createClient from "openapi-fetch";
import type { components, paths } from "./schema";

export type Schemas = components["schemas"];
export type Merchant = NonNullable<Schemas["UploadInitIn"]["merchant_hint"]>;
export type JobStatus = NonNullable<NonNullable<paths["/v1/admin/jobs"]["get"]["parameters"]["query"]>["status"]>;

const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: { field: string; message: string }[];
  readonly details: Record<string, unknown>;
  readonly requestId: string | null;

  constructor(status: number, body: Partial<Schemas["ErrorBody"]> | undefined) {
    super(body?.message ?? "Não foi possível contactar o servidor.");
    this.status = status;
    this.code = body?.code ?? "network_error";
    this.fieldErrors = body?.field_errors ?? [];
    this.details = (body?.details as Record<string, unknown> | undefined) ?? {};
    this.requestId = body?.request_id ?? null;
  }
}

export function readCookie(name: string): string | null {
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function withCsrf(request: Request): Request {
  if (!UNSAFE.has(request.method)) return request;
  const headers = new Headers(request.headers);
  const token = readCookie("biq_csrf");
  if (token) headers.set("X-CSRF-Token", token);
  return new Request(request, { headers });
}

let refreshing: Promise<boolean> | null = null;
let onSessionExpired: () => void = () => undefined;

export function setSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

async function refreshSession(): Promise<boolean> {
  // One refresh at a time: parallel 401s wait for the same rotation.
  const url = new URL("/v1/auth/refresh", window.location.origin);
  refreshing ??= fetch(withCsrf(new Request(url, { method: "POST", credentials: "same-origin" })))
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      setTimeout(() => {
        refreshing = null;
      }, 0);
    });
  return refreshing;
}

/** fetch with CSRF header and one transparent session refresh on 401. */
export async function sessionFetch(input: Request): Promise<Response> {
  const retry = input.clone();
  const response = await fetch(withCsrf(input));
  if (response.status !== 401 || new URL(input.url).pathname.startsWith("/v1/auth/")) return response;
  // The CSRF cookie lives as long as the refresh token: without it there is no session to refresh.
  if (!readCookie("biq_csrf")) return response;
  if (!(await refreshSession())) {
    onSessionExpired();
    return response;
  }
  return fetch(withCsrf(retry));
}

export const api = createClient<paths>({
  baseUrl: typeof window === "undefined" ? "http://localhost" : window.location.origin,
  fetch: sessionFetch,
  credentials: "same-origin",
});

/** Turn an openapi-fetch result into data or a thrown ApiError. */
export function unwrap<T>(result: { data?: T; error?: unknown; response: Response }): T {
  if (result.error !== undefined || !result.response.ok) {
    throw new ApiError(result.response.status, result.error as Partial<Schemas["ErrorBody"]> | undefined);
  }
  return result.data as T;
}
