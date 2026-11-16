import bcrypt from "bcryptjs";
import User from "../../../../models/User";
import { assertSessionConfiguration } from "../../../../lib/auth";
import {
  authJson,
  logAuthFailure,
  parseAuthJsonBody,
} from "../../../../lib/auth-http";
import {
  AUTH_RATE_LIMITS,
  authRateLimitResponse,
  consumeAuthRateLimit,
  getAuthClientAddress,
} from "../../../../lib/auth-rate-limit";
import { connectToDatabase } from "../../../../lib/mongodb";

const BCRYPT_WORK_FACTOR = 12;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validationResponse(fieldErrors) {
  return authJson(
    {
      error: "Please correct the highlighted fields.",
      fieldErrors,
    },
    400,
  );
}

function registrationAcceptedResponse() {
  return authJson(
    {
      message:
        "If registration can be completed for this address, you can now try signing in.",
    },
    202,
  );
}

export async function POST(request) {
  try {
    assertSessionConfiguration();
    const ipLimit = await consumeAuthRateLimit(
      AUTH_RATE_LIMITS.registrationIp,
      `ip:${getAuthClientAddress(request)}`,
    );
    if (!ipLimit.allowed) return authRateLimitResponse(ipLimit);
  } catch (error) {
    logAuthFailure("Registration rate limiting", error);
    return authJson(
      { error: "Unable to create your account right now." },
      error?.name === "MongooseServerSelectionError" ? 503 : 500,
    );
  }

  const parsed = await parseAuthJsonBody(request);
  if (parsed.response) return parsed.response;
  const body = parsed.body;

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const username =
    typeof body.username === "string" ? body.username.trim() : "";
  const fieldErrors = {};

  if (!name) {
    fieldErrors.name = "Enter your full name.";
  } else if (name.length > 100) {
    fieldErrors.name = "Name must be 100 characters or fewer.";
  }

  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    fieldErrors.email = "Enter a valid email address.";
  }

  if (body.username !== undefined && typeof body.username !== "string") {
    fieldErrors.username = "Enter a valid username.";
  } else if (username && (username.length < 4 || username.length > 30)) {
    fieldErrors.username = "Username must be between 4 and 30 characters.";
  }

  if (password.length < 8) {
    fieldErrors.password = "Use at least 8 characters.";
  } else if (Buffer.byteLength(password, "utf8") > 72) {
    fieldErrors.password = "Password must be 72 UTF-8 bytes or fewer.";
  } else if (!/[A-Z]/.test(password)) {
    fieldErrors.password = "Add at least one uppercase letter.";
  } else if (!/[a-z]/.test(password)) {
    fieldErrors.password = "Add at least one lowercase letter.";
  } else if (!/[0-9]/.test(password)) {
    fieldErrors.password = "Add at least one number.";
  } else if (!/[^A-Za-z0-9]/.test(password)) {
    fieldErrors.password = "Add at least one special character.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return validationResponse(fieldErrors);
  }

  try {
    await connectToDatabase();
    await User.init();

    const passwordHash = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);
    await User.create({
      name,
      email,
      username: username || undefined,
      passwordHash,
    });

    return registrationAcceptedResponse();
  } catch (error) {
    if (error?.code === 11000) {
      return registrationAcceptedResponse();
    }

    logAuthFailure("Registration", error);
    if (error?.name === "MongooseServerSelectionError") {
      return authJson(
        {
          error: "Registration is temporarily unavailable. Please try again shortly.",
        },
        503,
      );
    }

    return authJson({ error: "Unable to create your account right now." }, 500);
  }
}
