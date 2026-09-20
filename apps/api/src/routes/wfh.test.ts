import assert from "node:assert/strict";
import test from "node:test";
import { wfhRoutes } from "./wfh";

test("all WFH endpoints reject signed-out requests before validation or database access", async () => {
  for (const [method, path] of [
    ["GET", "/wfh/settings"],
    ["PATCH", "/wfh/settings"],
    ["GET", "/wfh/check-ins?year=2026"],
    ["POST", "/wfh/check-ins"],
    ["DELETE", "/wfh/check-ins/2026-08-06"],
    ["GET", "/wfh/allowance?year=2026"],
    ["PATCH", "/wfh/allowance"],
    ["GET", "/wfh/stats?year=2026"],
  ]) {
    const response = await wfhRoutes.request(path, { method });
    assert.equal(response.status, 401, `${method} ${path}`);
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  }
});
