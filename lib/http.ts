import axios from "axios";

type ApiErrorPayload = {
  error?: unknown;
};

export const apiClient = axios.create({
  baseURL: "/api",
  headers: {
    Accept: "application/json",
  },
});

export const externalHttpClient = axios.create({
  validateStatus: () => true,
});

export function getApiErrorData<T>(error: unknown) {
  return axios.isAxiosError<T>(error) ? error.response?.data : undefined;
}

export function getApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (!axios.isAxiosError<ApiErrorPayload>(error)) {
    return error instanceof Error ? error.message : fallbackMessage;
  }

  const responseMessage = error.response?.data?.error;

  return typeof responseMessage === "string" && responseMessage.length > 0
    ? responseMessage
    : fallbackMessage;
}
