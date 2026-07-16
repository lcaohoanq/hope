import assert from "node:assert/strict";
import test from "node:test";
import { apiClient, externalHttpClient, getApiErrorMessage } from "@/lib/http";

test("configures separate internal and external HTTP clients", () => {
  assert.equal(apiClient.defaults.baseURL, "/api");
  assert.equal(apiClient.defaults.validateStatus?.(400), false);
  assert.equal(externalHttpClient.defaults.validateStatus?.(500), true);
});

test("extracts API error messages from Axios errors", () => {
  const error = {
    isAxiosError: true,
    response: {
      data: { error: "Request denied." },
    },
  };

  assert.equal(getApiErrorMessage(error, "Fallback"), "Request denied.");
  assert.equal(getApiErrorMessage({ isAxiosError: true }, "Fallback"), "Fallback");
  assert.equal(getApiErrorMessage(new Error("Local failure"), "Fallback"), "Local failure");
});
