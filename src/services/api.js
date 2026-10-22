const REQUEST_TIMEOUT_MS = 8_000;

async function request(path, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(path, { ...options, signal: controller.signal });
    let body;
    try {
      body = await response.json();
    } catch {
      throw new Error("The API returned an unreadable response.");
    }
    if (!response.ok) {
      const details = body.error?.details
        ?.map((detail) => detail.message)
        .filter(Boolean)
        .join(" ");
      throw new Error(details || body.error?.message || "The API request failed.");
    }
    return body;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("The verification API did not respond within 8 seconds.");
    }
    if (error instanceof TypeError) {
      throw new Error("Cannot reach the backend. Check that the API server is running.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function getHealth() {
  return request("/api/health", { method: "GET" });
}

export function verifyPurchase(payload) {
  return request("/api/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
