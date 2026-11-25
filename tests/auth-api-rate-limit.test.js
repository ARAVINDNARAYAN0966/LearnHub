import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  bcrypt,
  User,
  assertSessionConfiguration,
  issueSession,
  connectToDatabase,
  consumeAuthRateLimit,
  resetAuthRateLimit,
  authRateLimitResponse,
  logAuthFailure,
} = vi.hoisted(() => ({
  bcrypt: { hash: vi.fn(), compare: vi.fn() },
  User: {
    init: vi.fn(),
    create: vi.fn(),
    findOne: vi.fn(),
  },
  assertSessionConfiguration: vi.fn(),
  issueSession: vi.fn(),
  connectToDatabase: vi.fn(),
  consumeAuthRateLimit: vi.fn(),
  resetAuthRateLimit: vi.fn(),
  authRateLimitResponse: vi.fn(),
  logAuthFailure: vi.fn(),
}));

vi.mock("bcryptjs", () => ({ default: bcrypt }));
vi.mock("../src/models/User.js", () => ({ default: User }));
vi.mock("../src/lib/auth.js", () => ({
  assertSessionConfiguration,
  issueSession,
}));
vi.mock("../src/lib/mongodb.js", () => ({ connectToDatabase }));
vi.mock("../src/lib/auth-rate-limit.js", () => ({
  AUTH_RATE_LIMITS: {
    registrationIp: { scope: "registration-ip", limit: 5, windowMs: 3600000 },
    loginIp: { scope: "login-ip", limit: 20, windowMs: 900000 },
    loginAccount: { scope: "login-account", limit: 10, windowMs: 900000 },
  },
  authRateLimitResponse,
  consumeAuthRateLimit,
  resetAuthRateLimit,
  getAuthClientAddress: vi.fn(() => "203.0.113.5"),
}));
vi.mock("../src/lib/auth-http.js", () => ({
  authJson: (body, status = 200, headers = {}) =>
    Response.json(body, {
      status,
      headers: { "Cache-Control": "no-store", ...headers },
    }),
  logAuthFailure,
  parseAuthJsonBody: async (request) => {
    try {
      const body = await request.json();
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return {
          response: Response.json({ error: "Invalid request body." }, { status: 400 }),
        };
      }
      return { body, response: null };
    } catch {
      return {
        response: Response.json({ error: "Invalid request body." }, { status: 400 }),
      };
    }
  },
}));
vi.mock("server-only", () => ({}));

import { POST as login } from "../src/app/api/auth/login/route.js";
import { POST as register } from "../src/app/api/auth/register/route.js";

function jsonRequest(path, body) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validRegistration = {
  name: "Portfolio Student",
  email: "student@example.test",
  username: "",
  password: "StrongPassword1!",
};

beforeEach(() => {
  vi.clearAllMocks();
  assertSessionConfiguration.mockReturnValue(undefined);
  issueSession.mockResolvedValue(undefined);
  connectToDatabase.mockResolvedValue(undefined);
  User.init.mockResolvedValue(undefined);
  User.create.mockResolvedValue({});
  bcrypt.hash.mockResolvedValue("stored-hash");
  bcrypt.compare.mockResolvedValue(false);
  User.findOne.mockReturnValue({
    select: vi.fn().mockResolvedValue(null),
  });
  consumeAuthRateLimit.mockResolvedValue({
    allowed: true,
    retryAfterSeconds: 60,
  });
  resetAuthRateLimit.mockResolvedValue(undefined);
  authRateLimitResponse.mockImplementation((result) =>
    Response.json(
      { error: "Too many authentication attempts. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(result.retryAfterSeconds) },
      },
    ),
  );
});

describe("authentication rate-limit endpoints", () => {
  it("rejects login before checking credentials when the IP limit is exceeded", async () => {
    consumeAuthRateLimit.mockResolvedValueOnce({
      allowed: false,
      retryAfterSeconds: 90,
    });

    const response = await login(
      jsonRequest("/api/auth/login", {
        email: "student@example.test",
        password: "wrong",
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("90");
    expect(User.findOne).not.toHaveBeenCalled();
    expect(authRateLimitResponse).toHaveBeenCalledOnce();
  });

  it("applies a second limit to the normalized login email", async () => {
    consumeAuthRateLimit
      .mockResolvedValueOnce({ allowed: true, retryAfterSeconds: 30 })
      .mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 45 });

    const response = await login(
      jsonRequest("/api/auth/login", {
        email: "Student@Example.Test",
        password: "wrong",
      }),
    );

    expect(response.status).toBe(429);
    expect(consumeAuthRateLimit).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ scope: "login-account" }),
      "email:student@example.test",
    );
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it("rejects registration before creating an account when the IP limit is exceeded", async () => {
    consumeAuthRateLimit.mockResolvedValueOnce({
      allowed: false,
      retryAfterSeconds: 120,
    });

    const response = await register(
      jsonRequest("/api/auth/register", validRegistration),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("120");
    expect(User.create).not.toHaveBeenCalled();
  });

  it("returns the same registration response for a new and an existing email", async () => {
    User.create
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(
        Object.assign(new Error("duplicate key"), { code: 11000 }),
      );

    const newAccountResponse = await register(
      jsonRequest("/api/auth/register", validRegistration),
    );
    const existingAccountResponse = await register(
      jsonRequest("/api/auth/register", validRegistration),
    );

    expect(newAccountResponse.status).toBe(202);
    expect(existingAccountResponse.status).toBe(202);
    expect(await newAccountResponse.json()).toEqual(
      await existingAccountResponse.json(),
    );
    expect(issueSession).not.toHaveBeenCalled();
  });

  it("resets the login-account counter on successful authentication", async () => {
    bcrypt.compare.mockResolvedValue(true);
    User.findOne.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: "user-123",
        name: "Student",
        email: "student@example.test",
        passwordHash: "stored-hash",
        role: "student",
      }),
    });

    const response = await login(
      jsonRequest("/api/auth/login", {
        email: "Student@Example.Test",
        password: "correct-password",
      }),
    );

    expect(response.status).toBe(200);
    expect(issueSession).toHaveBeenCalledWith("user-123", false);
    expect(resetAuthRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "login-account" }),
      "email:student@example.test",
    );
  });

  it("does not reset the rate limit counter on failed login credentials", async () => {
    bcrypt.compare.mockResolvedValue(false);
    User.findOne.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: "user-123",
        name: "Student",
        email: "student@example.test",
        passwordHash: "stored-hash",
        role: "student",
      }),
    });

    const response = await login(
      jsonRequest("/api/auth/login", {
        email: "student@example.test",
        password: "wrong-password",
      }),
    );

    expect(response.status).toBe(401);
    expect(issueSession).not.toHaveBeenCalled();
    expect(resetAuthRateLimit).not.toHaveBeenCalled();
  });

  it("still completes successful login even if rate limit reset fails", async () => {
    bcrypt.compare.mockResolvedValue(true);
    User.findOne.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: "user-123",
        name: "Student",
        email: "student@example.test",
        passwordHash: "stored-hash",
        role: "student",
      }),
    });
    resetAuthRateLimit.mockRejectedValue(new Error("Mongo network glitch"));

    const response = await login(
      jsonRequest("/api/auth/login", {
        email: "student@example.test",
        password: "correct-password",
      }),
    );

    expect(response.status).toBe(200);
    expect(issueSession).toHaveBeenCalledWith("user-123", false);
    expect(logAuthFailure).toHaveBeenCalledWith(
      "Login rate limit reset",
      expect.any(Error),
    );
  });
});
