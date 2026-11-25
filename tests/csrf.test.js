import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { verifyCsrfOrigin } from "../src/lib/csrf.js";

describe("CSRF Origin and Host validation", () => {
  it("allows requests where Origin matches Host", () => {
    const request = new Request("http://localhost:3000/api/enrollments", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "http://localhost:3000",
      },
    });

    const result = verifyCsrfOrigin(request);
    expect(result.ok).toBe(true);
    expect(result.response).toBeUndefined();
  });

  it("allows requests where Origin matches X-Forwarded-Host", () => {
    const request = new Request("https://learnhub.test/api/enrollments", {
      method: "POST",
      headers: {
        host: "internal-proxy:8080",
        "x-forwarded-host": "learnhub.test",
        origin: "https://learnhub.test",
      },
    });

    const result = verifyCsrfOrigin(request);
    expect(result.ok).toBe(true);
  });

  it("handles comma-separated X-Forwarded-Host gracefully", () => {
    const request = new Request("https://learnhub.test/api/enrollments", {
      method: "POST",
      headers: {
        "x-forwarded-host": "learnhub.test, proxy2.internal",
        origin: "https://learnhub.test",
      },
    });

    const result = verifyCsrfOrigin(request);
    expect(result.ok).toBe(true);
  });

  it("blocks cross-origin requests with mismatched Origin", async () => {
    const request = new Request("https://learnhub.test/api/enrollments", {
      method: "POST",
      headers: {
        host: "learnhub.test",
        origin: "https://attacker.evil",
      },
    });

    const result = verifyCsrfOrigin(request);
    expect(result.ok).toBe(false);
    expect(result.response.status).toBe(403);
    const body = await result.response.json();
    expect(body.error).toMatch(/cross-origin/i);
  });

  it("blocks requests with origin: null (sandboxed iframe)", async () => {
    const request = new Request("https://learnhub.test/api/enrollments", {
      method: "POST",
      headers: {
        host: "learnhub.test",
        origin: "null",
      },
    });

    const result = verifyCsrfOrigin(request);
    expect(result.ok).toBe(false);
    expect(result.response.status).toBe(403);
  });

  it("blocks requests with sec-fetch-site: cross-site", async () => {
    const request = new Request("https://learnhub.test/api/enrollments", {
      method: "POST",
      headers: {
        host: "learnhub.test",
        origin: "https://learnhub.test",
        "sec-fetch-site": "cross-site",
      },
    });

    const result = verifyCsrfOrigin(request);
    expect(result.ok).toBe(false);
    expect(result.response.status).toBe(403);
  });

  it("allows same-origin requests with Referer when Origin is omitted", () => {
    const request = new Request("https://learnhub.test/api/enrollments", {
      method: "POST",
      headers: {
        host: "learnhub.test",
        referer: "https://learnhub.test/courses/web-dev",
      },
    });

    const result = verifyCsrfOrigin(request);
    expect(result.ok).toBe(true);
  });

  it("blocks requests with cross-origin Referer when Origin is omitted", async () => {
    const request = new Request("https://learnhub.test/api/enrollments", {
      method: "POST",
      headers: {
        host: "learnhub.test",
        referer: "https://attacker.evil/phishing-page",
      },
    });

    const result = verifyCsrfOrigin(request);
    expect(result.ok).toBe(false);
    expect(result.response.status).toBe(403);
  });

  it("allows non-browser clients without Origin or Referer", () => {
    const request = new Request("https://learnhub.test/api/enrollments", {
      method: "POST",
      headers: {
        host: "learnhub.test",
      },
    });

    const result = verifyCsrfOrigin(request);
    expect(result.ok).toBe(true);
  });

  it("blocks cross-origin PUT requests", async () => {
    const request = new Request("https://learnhub.test/api/admin/courses/123", {
      method: "PUT",
      headers: {
        host: "learnhub.test",
        origin: "https://malicious-site.com",
      },
    });

    const result = verifyCsrfOrigin(request);
    expect(result.ok).toBe(false);
    expect(result.response.status).toBe(403);
  });

  it("blocks cross-origin PATCH requests", async () => {
    const request = new Request("https://learnhub.test/api/admin/users", {
      method: "PATCH",
      headers: {
        host: "learnhub.test",
        origin: "https://malicious-site.com",
      },
    });

    const result = verifyCsrfOrigin(request);
    expect(result.ok).toBe(false);
    expect(result.response.status).toBe(403);
  });

  it("blocks cross-origin DELETE requests", async () => {
    const request = new Request("https://learnhub.test/api/admin/courses/123", {
      method: "DELETE",
      headers: {
        host: "learnhub.test",
        origin: "https://malicious-site.com",
      },
    });

    const result = verifyCsrfOrigin(request);
    expect(result.ok).toBe(false);
    expect(result.response.status).toBe(403);
  });

  it("blocks cross-site requests attempting to exploit authenticated cookies via Sec-Fetch-Site", async () => {
    const request = new Request("https://learnhub.test/api/enrollments", {
      method: "POST",
      headers: {
        host: "learnhub.test",
        cookie: "learnhub_session=valid.session.token",
        "sec-fetch-site": "cross-site",
      },
    });

    const result = verifyCsrfOrigin(request);
    expect(result.ok).toBe(false);
    expect(result.response.status).toBe(403);
  });

  it("rejects malformed Origin URLs with status 400", async () => {
    const request = new Request("https://learnhub.test/api/enrollments", {
      method: "POST",
      headers: {
        host: "learnhub.test",
        origin: "://not-a-valid-url",
      },
    });

    const result = verifyCsrfOrigin(request);
    expect(result.ok).toBe(false);
    expect(result.response.status).toBe(400);
  });

  it("rejects malformed Referer URLs with status 400", async () => {
    const request = new Request("https://learnhub.test/api/enrollments", {
      method: "POST",
      headers: {
        host: "learnhub.test",
        referer: "://not-a-valid-referer",
      },
    });

    const result = verifyCsrfOrigin(request);
    expect(result.ok).toBe(false);
    expect(result.response.status).toBe(400);
  });

  it("rejects request if Host header is missing when Origin is provided", async () => {
    const request = new Request("https://learnhub.test/api/enrollments", {
      method: "POST",
      headers: {
        origin: "https://learnhub.test",
      },
    });

    const result = verifyCsrfOrigin(request);
    expect(result.ok).toBe(false);
    expect(result.response.status).toBe(400);
  });
});
