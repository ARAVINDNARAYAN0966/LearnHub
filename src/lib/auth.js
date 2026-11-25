import "server-only";

import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import mongoose from "mongoose";
import User from "../models/User";
import { connectToDatabase } from "./mongodb";

const SESSION_COOKIE_NAME = "learnhub_session";
const SESSION_ISSUER = "learnhub";
const SESSION_AUDIENCE = "learnhub-app";
const SESSION_SECONDS = 60 * 60 * 24;
const REMEMBERED_SESSION_SECONDS = 60 * 60 * 24 * 30;

function getSessionKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || new TextEncoder().encode(secret).byteLength < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 bytes");
  }

  return new TextEncoder().encode(secret);
}

export function assertSessionConfiguration() {
  getSessionKey();
}

export async function issueSession(userId, rememberMe = false, tokenVersion = null) {
  const resolvedUserId =
    typeof userId === "object" && userId !== null
      ? (userId._id?.toString() || userId.id)
      : String(userId);

  let resolvedTokenVersion = tokenVersion;
  if (resolvedTokenVersion === null) {
    if (
      typeof userId === "object" &&
      userId !== null &&
      typeof userId.tokenVersion === "number"
    ) {
      resolvedTokenVersion = userId.tokenVersion;
    } else {
      await connectToDatabase();
      const dbUser = await User.findById(resolvedUserId)
        .select("tokenVersion")
        .lean();
      resolvedTokenVersion = dbUser?.tokenVersion ?? 0;
    }
  }

  const sessionSeconds = rememberMe
    ? REMEMBERED_SESSION_SECONDS
    : SESSION_SECONDS;
  const token = await new SignJWT({ tv: resolvedTokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(resolvedUserId)
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${sessionSeconds}s`)
    .sign(getSessionKey());

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };

  if (rememberMe) {
    cookieOptions.maxAge = sessionSeconds;
    cookieOptions.expires = new Date(Date.now() + sessionSeconds * 1000);
  }

  (await cookies()).set(SESSION_COOKIE_NAME, token, cookieOptions);
}

export async function revokeUserSessions(userId) {
  const resolvedUserId =
    typeof userId === "object" && userId !== null
      ? (userId._id?.toString() || userId.id)
      : String(userId);

  await connectToDatabase();
  return User.findByIdAndUpdate(
    resolvedUserId,
    { $inc: { tokenVersion: 1 } },
    { new: true },
  );
}

export async function clearSession() {
  (await cookies()).set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const key = getSessionKey();
  let payload;

  try {
    ({ payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
    }));
  } catch {
    return null;
  }

  if (typeof payload.sub !== "string" || !mongoose.isValidObjectId(payload.sub)) {
    return null;
  }

  await connectToDatabase();
  const user = await User.findById(payload.sub)
    .select("name email username role tokenVersion")
    .lean();

  if (!user) {
    return null;
  }

  const expectedTokenVersion = user.tokenVersion ?? 0;
  const tokenVersion = typeof payload.tv === "number" ? payload.tv : 0;
  if (tokenVersion !== expectedTokenVersion) {
    return null;
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    username: user.username || null,
    role: user.role,
  };
}
