import bcrypt from "bcryptjs";
import User from "../../../../models/User";
import { assertSessionConfiguration, issueSession } from "../../../../lib/auth";
import { authJson, logAuthFailure } from "../../../../lib/auth-http";
import { connectToDatabase } from "../../../../lib/mongodb";

const BCRYPT_WORK_FACTOR = 12;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVALID_CREDENTIALS = { error: "Invalid email or password." };

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return authJson({ error: "Invalid request body." }, 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return authJson({ error: "Invalid request body." }, 400);
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (
    !EMAIL_PATTERN.test(email) ||
    email.length > 254 ||
    !password ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return authJson(INVALID_CREDENTIALS, 401);
  }

  try {
    assertSessionConfiguration();
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
