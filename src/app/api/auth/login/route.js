import bcrypt from "bcryptjs";
import User from "../../../../models/User";
import { assertSessionConfiguration, issueSession } from "../../../../lib/auth";
import { verifyCsrfOrigin } from "../../../../lib/csrf";
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
  resetAuthRateLimit,
} from "../../../../lib/auth-rate-limit";
import {
  connectToDatabase,
  isDatabaseConnectionError,
} from "../../../../lib/mongodb";

const BCRYPT_WORK_FACTOR = 12;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVALID_CREDENTIALS = { error: "Invalid email or password." };

export async function POST(request) {
  const csrf = verifyCsrfOrigin(request);
  if (!csrf.ok) return csrf.response;

  try {
    assertSessionConfiguration();
    const ipLimit = await consumeAuthRateLimit(
      AUTH_RATE_LIMITS.loginIp,
      `ip:${getAuthClientAddress(request)}`,
    );
    if (!ipLimit.allowed) return authRateLimitResponse(ipLimit);
  } catch (error) {
    logAuthFailure("Login rate limiting", error);
    return authJson(
      { error: "Unable to sign in right now." },
      isDatabaseConnectionError(error) ? 503 : 500,
    );
  }

  const parsed = await parseAuthJsonBody(request);
  if (parsed.response) return parsed.response;
  const body = parsed.body;

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (EMAIL_PATTERN.test(email) && email.length <= 254) {
    try {
      const accountLimit = await consumeAuthRateLimit(
        AUTH_RATE_LIMITS.loginAccount,
        `email:${email}`,
      );
      if (!accountLimit.allowed) return authRateLimitResponse(accountLimit);
    } catch (error) {
      logAuthFailure("Login account rate limiting", error);
      return authJson(
        { error: "Unable to sign in right now." },
        isDatabaseConnectionError(error) ? 503 : 500,
      );
    }
  }

  if (
    !EMAIL_PATTERN.test(email) ||
    email.length > 254 ||
    !password ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return authJson(INVALID_CREDENTIALS, 401);
  }

  try {
    await connectToDatabase();

    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user?.passwordHash) {
      await bcrypt.hash(password, BCRYPT_WORK_FACTOR);
      return authJson(INVALID_CREDENTIALS, 401);
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return authJson(INVALID_CREDENTIALS, 401);
    }

    await issueSession(user._id.toString(), body.rememberMe === true);

    try {
      await resetAuthRateLimit(
        AUTH_RATE_LIMITS.loginAccount,
        `email:${email}`,
      );
    } catch (resetError) {
      logAuthFailure("Login rate limit reset", resetError);
    }

    return authJson({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        username: user.username || null,
        role: user.role,
      },
    });
  } catch (error) {
    logAuthFailure("Login", error);
    return authJson({ error: "Unable to sign in right now." }, 500);
  }
}
