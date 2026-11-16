import { beforeEach, describe, expect, it, vi } from "vitest";

const { AuthRateLimit, connectToDatabase } = vi.hoisted(() => ({
  AuthRateLimit: {
    init: vi.fn(),
    findOneAndUpdate: vi.fn(),
    collection: { createIndex: vi.fn() },
  },
  connectToDatabase: vi.fn(),
}));

vi.mock("../src/models/AuthRateLimit.js", () => ({
  default: AuthRateLimit,
}));
vi.mock("../src/lib/mongodb.js", () => ({ connectToDatabase }));
vi.mock("../src/lib/auth-http.js", () => ({
  authJson: (body, status = 200, headers = {}) =>
    Response.json(body, { status, headers }),
}));
vi.mock("server-only", () => ({}));

import {
  authRateLimitResponse,
  consumeAuthRateLimit,
  getAuthClientAddress,
} from "../src/lib/auth-rate-limit.js";

function rateLimitQuery(count) {
  const query = {
    select: vi.fn(() => query),
    lean: vi.fn().mockResolvedValue({ count }),
  };
  return query;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SESSION_SECRET", "test-session-secret");
  connectToDatabase.mockResolvedValue(undefined);
  AuthRateLimit.init.mockResolvedValue(undefined);
  AuthRateLimit.collection.createIndex.mockResolvedValue("expiresAt_1");
});

describe("MongoDB-backed authentication rate limits", () => {
  it("increments a shared fixed-window counter and allows only the configured limit", async () => {
    AuthRateLimit.findOneAndUpdate
      .mockReturnValueOnce(rateLimitQuery(1))
      .mockReturnValueOnce(rateLimitQuery(2))
      .mockReturnValueOnce(rateLimitQuery(3));
    const policy = { scope: "login", limit: 2, windowMs: 60_000 };

    const first = await consumeAuthRateLimit(
      policy,
      "email:student@example.test",
      120_000,
    );
    const second = await consumeAuthRateLimit(
      policy,
      "email:student@example.test",
      120_001,
    );
    const third = await consumeAuthRateLimit(
      policy,
      "email:student@example.test",
      120_002,
    );

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    const firstId = AuthRateLimit.findOneAndUpdate.mock.calls[0][0]._id;
    const secondId = AuthRateLimit.findOneAndUpdate.mock.calls[1][0]._id;
    expect(firstId).toBe(secondId);
    expect(firstId).not.toContain("student@example.test");
    expect(AuthRateLimit.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: firstId },
      {
        $inc: { count: 1 },
        $setOnInsert: { expiresAt: new Date(240_000) },
      },
      { upsert: true, new: true, setDefaultsOnInsert: false },
    );
    expect(AuthRateLimit.collection.createIndex).toHaveBeenCalledOnce();
    expect(AuthRateLimit.collection.createIndex).toHaveBeenCalledWith(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 },
    );
  });

  it("returns HTTP 429 with a retry interval when the limit is exceeded", async () => {
    const response = authRateLimitResponse({ retryAfterSeconds: 37 });

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("37");
  });

  it("uses the sanitized forwarded client IP and ignores x-real-ip", () => {
    const forwardedRequest = new Request("http://localhost", {
      headers: {
        "x-real-ip": "198.51.100.9",
        "x-forwarded-for": "203.0.113.5, 10.0.0.1",
      },
    });
    const invalidRequest = new Request("http://localhost", {
      headers: {
        "x-real-ip": "203.0.113.6",
        "x-forwarded-for": "not-an-ip, 10.0.0.1",
      },
    });
    const realIpOnlyRequest = new Request("http://localhost", {
      headers: { "x-real-ip": "203.0.113.7" },
    });

    expect(getAuthClientAddress(forwardedRequest)).toBe("203.0.113.5");
    expect(getAuthClientAddress(invalidRequest)).toBe("unknown");
    expect(getAuthClientAddress(realIpOnlyRequest)).toBe("unknown");
  });

  it("retries a concurrent first-write collision", async () => {
    AuthRateLimit.findOneAndUpdate
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          lean: vi
            .fn()
            .mockRejectedValue(
              Object.assign(new Error("duplicate key"), { code: 11000 }),
            ),
        })),
      })
      .mockReturnValueOnce(rateLimitQuery(1));

    const result = await consumeAuthRateLimit(
      { scope: "register", limit: 5, windowMs: 60_000 },
      "ip:203.0.113.5",
      120_000,
    );

    expect(result.allowed).toBe(true);
    expect(AuthRateLimit.findOneAndUpdate).toHaveBeenCalledTimes(2);
  });
});
