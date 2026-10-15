import axios, { AxiosError } from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export function apiErrorMessage(error: unknown, fallback = "Please try again."): string {
  if (!axios.isAxiosError(error)) return error instanceof Error ? error.message : fallback;
  const candidate = error.response?.data as { message?: unknown; title?: unknown; detail?: unknown } | undefined;
  if (typeof candidate?.message === "string") return candidate.message;
  if (error.response?.status === 401) return "Your session has expired. Please sign in again.";
  if (error.response?.status === 403) return "This account does not have access to that action.";
  if (error.response && error.response.status >= 500) return "PaisaMatters is temporarily unavailable. Please try again.";
  if (typeof candidate?.detail === "string") return candidate.detail;
  if (typeof candidate?.title === "string") return candidate.title;
  if (error.code === AxiosError.ERR_NETWORK) return "We couldn’t reach PaisaMatters. Check that the API is running and try again.";
  return fallback;
}

export function apiStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}
