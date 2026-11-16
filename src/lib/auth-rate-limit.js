import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import AuthRateLimit from "../models/AuthRateLimit";
import { connectToDatabase } from "./mongodb";
import { authJson } from "./auth-http";

const AUTH_RATE_LIMIT_MESSAGE =
  "Too many authentication attempts. Please try again later.";
let indexInitialization;

export const AUTH_RATE_LIMITS = {
  registrationIp: {
    scope: "registration-ip",
    limit: 5,
    windowMs: 60 * 60 * 1000,
  },
  loginIp: {
    scope: "login-ip",
    limit: 20,
    windowMs: 15 * 60 * 1000,
  },
  loginAccount: {
    scope: "login-account",
    limit: 10,
    windowMs: 15 * 60 * 1000,
  },
};

export function getAuthClientAddress(request) {
  const forwardedIp = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const address = forwardedIp || "";

  return address.length <= 64 && isIP(address) ? address : "unknown";
}

function getIdentityHash(identity) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is required for authentication rate limits.");
  }

  return createHmac("sha256", secret).update(identity).digest("hex");
}

async function incrementBucket(bucketId, expiresAt) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await AuthRateLimit.findOneAndUpdate(
        { _id: bucketId },
        {
          $inc: { count: 1 },
          $setOnInsert: { expiresAt },
        },
        { upsert: true, new: true, setDefaultsOnInsert: false },
      )
        .select("count")
        .lean();
    } catch (error) {
      if (error?.code !== 11000 || attempt === 1) throw error;
    }
  }

  throw new Error("Authentication rate limit counter could not be updated.");
}

async function ensureRateLimitIndexes() {
  if (!indexInitialization) {
    indexInitialization = (async () => {
      await AuthRateLimit.init();
      await AuthRateLimit.collection.createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0 },
      );
    })().catch((error) => {
      indexInitialization = null;
      throw error;
    });
  }

  await indexInitialization;
}

export async function consumeAuthRateLimit(policy, identity, now = Date.now()) {
  await connectToDatabase();
  await ensureRateLimitIndexes();

  const bucket = Math.floor(now / policy.windowMs);
  const bucketId = [
    policy.scope,
    getIdentityHash(identity),
    bucket,
  ].join(":");
  const expiresAt = new Date((bucket + 2) * policy.windowMs);
  const record = await incrementBucket(bucketId, expiresAt);
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil(((bucket + 1) * policy.windowMs - now) / 1000),
  );

  return {
    allowed: record.count <= policy.limit,
    retryAfterSeconds,
  };
}

export function authRateLimitResponse(result) {
  return authJson(
    { error: AUTH_RATE_LIMIT_MESSAGE },
    429,
    { "Retry-After": String(result.retryAfterSeconds) },
  );
}
