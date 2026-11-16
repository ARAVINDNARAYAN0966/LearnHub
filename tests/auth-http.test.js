import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parseAuthJsonBody } from "../src/lib/auth-http.js";

describe("bounded authentication request parsing", () => {
  it("parses a valid JSON object", async () => {
    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "student@example.test" }),
    });

    await expect(parseAuthJsonBody(request)).resolves.toEqual({
      body: { email: "student@example.test" },
      response: null,
    });
  });

  it("rejects oversized bodies without parsing them", async () => {
    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ value: "x".repeat(9000) }),
    });

    const result = await parseAuthJsonBody(request);

    expect(result.response.status).toBe(413);
    expect(await result.response.json()).toEqual({
      error: "Request body is too large.",
    });
  });
});
