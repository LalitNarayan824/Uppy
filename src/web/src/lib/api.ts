const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export interface User {
  id: string;
  email: string;
}

export interface Monitor {
  id: string;
  userId: string;
  name: string;
  url: string;
  createdAt: string;
}

export interface Check {
  id: string;
  monitorId: string;
  statusCode: number | null;
  responseTimeMs: number | null;
  isFailure: boolean;
  checkedAt: string;
}

export interface Incident {
  id: string;
  monitorId: string;
  startedAt: string;
  resolvedAt: string | null;
  cause: string | null;
}

export interface UptimeStat {
  period: string;
  uptimePercent: number;
  totalChecks: number;
  failedChecks: number;
}

export function getToken(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null;
}

export function setToken(token: string) {
  localStorage.setItem("token", token);
}

export function clearToken() {
  localStorage.removeItem("token");
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Request failed (${res.status})`);
  }

  if (res.status === 204) return null as T;
  return res.json();
}

export const api = {
  auth: {
    register: (email: string, password: string) =>
      fetchApi<{ user: User }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    login: (email: string, password: string) =>
      fetchApi<{ token: string; user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    me: () => fetchApi<User>("/auth/me"),
  },
  monitors: {
    list: () => fetchApi<Monitor[]>("/monitors"),
    get: (id: string) => fetchApi<Monitor>(`/monitors/${id}`),
    create: (name: string, url: string) =>
      fetchApi<Monitor>("/monitors", {
        method: "POST",
        body: JSON.stringify({ name, url }),
      }),
    update: (id: string, name: string, url: string) =>
      fetchApi<Monitor>(`/monitors/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name, url }),
      }),
    delete: (id: string) => fetchApi<void>(`/monitors/${id}`, { method: "DELETE" }),
    checks: (id: string, limit = 100) =>
      fetchApi<Check[]>(`/monitors/${id}/checks?limit=${limit}`),
    incidents: (id: string, limit = 50) =>
      fetchApi<Incident[]>(`/monitors/${id}/incidents?limit=${limit}`),
    uptime: (id: string) => fetchApi<UptimeStat[]>(`/monitors/${id}/uptime`),
  },
};