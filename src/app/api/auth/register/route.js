import bcrypt from "bcryptjs";
import User from "../../../../models/User";
import { assertSessionConfiguration, issueSession } from "../../../../lib/auth";
import { authJson, logAuthFailure } from "../../../../lib/auth-http";
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

function conflictResponse() {
  return authJson(
    {
      error: "An account with this email already exists.",
      fieldErrors: { email: "An account with this email already exists." },
    },
    409,
  );
}

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
    assertSessionConfiguration();
    await connectToDatabase();
    await User.init();

    if (await User.exists({ email })) {
      return conflictResponse();
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);
    const user = await User.create({
      name,
      email,
      username: username || undefined,
      passwordHash,
    });

    await issueSession(user._id.toString());

    return authJson(
      {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          username: user.username || null,
          role: user.role,
        },
      },
      201,
    );
  } catch (error) {
    if (error?.code === 11000) {
      return conflictResponse();
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
