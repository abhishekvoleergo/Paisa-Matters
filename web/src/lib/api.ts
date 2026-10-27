import { AxiosRequestConfig, isAxiosError } from "axios";
import { apiClient, apiErrorMessage } from "@/lib/api/client";

export type UserProfile = {
  userId: string;
  fullName: string;
  email: string;
  roles: string[];
  upiId?: string | null;
};

type ApiError = Error & { status?: number };

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  try {
    const config: AxiosRequestConfig = {
      url: path.replace(/^\//, ""),
      method: init.method || "GET",
      data: init.body,
      headers: Object.fromEntries(new Headers(init.headers).entries()),
      signal: init.signal ?? undefined,
    };
    const response = await apiClient.request<T>(config);
    return response.data;
  } catch (cause) {
    const error = new Error(apiErrorMessage(cause, "Please check your details and try again.")) as ApiError;
    if (isAxiosError(cause)) error.status = cause.response?.status;
    throw error;
  }
}

export async function getCurrentUser(): Promise<UserProfile> {
  const result = await apiRequest<{ user: UserProfile }>("auth/me");
  return result.user;
}

export async function updateProfile(data: { fullName: string; upiId?: string | null }): Promise<UserProfile> {
  const result = await apiRequest<{ user: UserProfile; message?: string }>("auth/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return result.user;
}

export async function changePassword(data: { currentPassword: string; newPassword: string; confirmPassword?: string }): Promise<void> {
  await apiRequest<{ message?: string }>("auth/change-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
