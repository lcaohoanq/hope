import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "@hope/api-client";
import { externalHttpClient, getApiErrorMessage } from "@/lib/http";

test("external HTTP client accepts all status codes", () => {
  assert.equal(externalHttpClient.defaults.validateStatus?.(500), true);
});

test("extracts API error messages from ApiError instances", () => {
  const error = new ApiError("Request denied.", 400);
  assert.equal(getApiErrorMessage(error, "Fallback"), "Request denied.");
});

test("extracts error messages from plain Error instances", () => {
  assert.equal(getApiErrorMessage(new Error("Local failure"), "Fallback"), "Local failure");
});

test("returns fallback for unknown error shapes", () => {
  assert.equal(getApiErrorMessage({ unexpected: true }, "Fallback"), "Fallback");
  assert.equal(getApiErrorMessage(null, "Fallback"), "Fallback");
});
