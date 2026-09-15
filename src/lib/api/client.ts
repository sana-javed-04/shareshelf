import { ApiError } from "./errors";
import { demoRequest } from "./demo-backend";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "");
export const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL as string | undefined;

/** True when no FastAPI backend is configured and the in-browser reference API is used. */
export const isDemoMode = !BASE_URL;

const TOKEN_KEY = "shareshelf.token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

async function httpRequest<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const token = getToken();
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Could not reach the server. Check your connection and try again.");
  }
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const detail = data?.detail;
    throw new ApiError(
      response.status,
      typeof detail === "string" ? detail : "Request failed. Please try again.",
    );
  }
  return data as T;
}

export const api = {
  request<T>(method: string, path: string, body?: Record<string, unknown>): Promise<T> {
    if (isDemoMode) return demoRequest<T>(method, path, body, getToken());
    return httpRequest<T>(method, path, body);
  },
  get<T>(path: string) {
    return api.request<T>("GET", path);
  },
  post<T>(path: string, body?: Record<string, unknown>) {
    return api.request<T>("POST", path, body);
  },
  put<T>(path: string, body?: Record<string, unknown>) {
    return api.request<T>("PUT", path, body);
  },
  patch<T>(path: string, body?: Record<string, unknown>) {
    return api.request<T>("PATCH", path, body);
  },
  delete<T>(path: string) {
    return api.request<T>("DELETE", path);
  },
};

export function buildQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    search.set(k, String(v));
  });
  const s = search.toString();
  return s ? `?${s}` : "";
}
