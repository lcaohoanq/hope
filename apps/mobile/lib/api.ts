import { type ApiClient, createApiClient, getErrorMessage } from "@hope/api-client";
import { getApiUrl } from "@/lib/env";

export { getErrorMessage };

export function getMobileApiClient(token?: string | null): ApiClient {
  return createApiClient(getApiUrl(), token);
}
