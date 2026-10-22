import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { getHealth, verifyPurchase } from "./api.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("health service requests the real health endpoint", async () => {
  globalThis.fetch = async (path, options) => {
    assert.equal(path, "/api/health");
    assert.equal(options.method, "GET");
    return Response.json({ status: "ok", requestId: "health-id" });
  };

  assert.deepEqual(await getHealth(), { status: "ok", requestId: "health-id" });
});

test("verification service sends the backend request contract unchanged", async () => {
  const payload = {
    intent: "Buy two tickets under ₹2,000",
    budget: 2000,
    order: { quantity: 2, unitPrice: 900, fees: 500, currency: "INR" },
  };
  const apiResult = { decision: "BLOCK", total: 2300, requestId: "request-id" };
  globalThis.fetch = async (path, options) => {
    assert.equal(path, "/api/verify");
    assert.equal(options.method, "POST");
    assert.equal(options.headers["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(options.body), payload);
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json(apiResult);
  };

  assert.deepEqual(await verifyPurchase(payload), apiResult);
});

test("verification service reports backend validation details", async () => {
  globalThis.fetch = async () =>
    Response.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: "Request validation failed.",
          details: [{ field: "order.currency", message: "Only INR is supported." }],
        },
      },
      { status: 400 }
    );

  await assert.rejects(
    verifyPurchase({}),
    { message: "Only INR is supported." }
  );
});

test("verification service surfaces network and unreadable response errors", async (t) => {
  await t.test("network unavailable", async () => {
    globalThis.fetch = async () => {
      throw new TypeError("fetch failed");
    };
    await assert.rejects(verifyPurchase({}), /Cannot reach the backend/);
  });

  await t.test("invalid response body", async () => {
    globalThis.fetch = async () =>
      new Response("not-json", { headers: { "Content-Type": "text/plain" } });
    await assert.rejects(verifyPurchase({}), /unreadable response/);
  });
});

test("verification service reports a request timeout", async () => {
  globalThis.fetch = async (_path, options) =>
    new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => {
        const error = new Error("Aborted");
        error.name = "AbortError";
        reject(error);
      });
    });

  const originalTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (callback) => originalTimeout(callback, 5);
  try {
    await assert.rejects(
      verifyPurchase({}),
      /did not respond within 8 seconds/
    );
  } finally {
    globalThis.setTimeout = originalTimeout;
  }
});
