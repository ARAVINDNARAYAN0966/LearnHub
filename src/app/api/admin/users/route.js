import mongoose from "mongoose";
import User from "../../../../models/User";
import { authJson } from "../../../../lib/auth-http";
import { verifyCsrfOrigin } from "../../../../lib/csrf";
import { authorizeAdminApi } from "../../../../lib/admin-course-api";
import { connectToDatabase, isDatabaseConnectionError } from "../../../../lib/mongodb";

const VALID_ROLES = new Set(["student", "instructor", "admin"]);

function databaseFailureStatus(error) {
  return isDatabaseConnectionError(error) ? 503 : 500;
}

export async function GET() {
  const authorization = await authorizeAdminApi("Admin users list");
  if (authorization.response) return authorization.response;

  try {
    await connectToDatabase();
    const users = await User.find({})
      .select("name email username role createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return authJson({
      users: users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        username: u.username || null,
        role: u.role,
        createdAt: u.createdAt?.toISOString?.() ?? null,
      })),
    });
  } catch (error) {
    return authJson(
      { error: "Unable to load users right now." },
      databaseFailureStatus(error),
    );
  }
}

export async function PATCH(request) {
  const csrf = verifyCsrfOrigin(request);
  if (!csrf.ok) return csrf.response;

  const authorization = await authorizeAdminApi("Admin user role update");
  if (authorization.response) return authorization.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return authJson({ error: "Invalid request body." }, 400);
  }

  const { userId, role } = body || {};

  if (
    typeof userId !== "string" ||
    !/^[\da-f]{24}$/i.test(userId) ||
    !mongoose.isValidObjectId(userId)
  ) {
    return authJson({ error: "A valid user ID is required." }, 400);
  }

  if (typeof role !== "string" || !VALID_ROLES.has(role)) {
    return authJson(
      { error: "Role must be 'student', 'instructor', or 'admin'." },
      400,
    );
  }

  try {
    await connectToDatabase();

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return authJson({ error: "User not found." }, 404);
    }

    // Safety guard: prevent demoting the last active admin
    if (targetUser.role === "admin" && role !== "admin") {
      const remainingAdmins = await User.countDocuments({
        role: "admin",
        _id: { $ne: targetUser._id },
      });
      if (remainingAdmins === 0) {
        return authJson(
          { error: "Cannot demote the only remaining administrator." },
          409,
        );
      }
    }

    targetUser.role = role;
    targetUser.tokenVersion = (targetUser.tokenVersion ?? 0) + 1;
    await targetUser.save();

    return authJson({
      message: `User role updated to ${role}.`,
      user: {
        id: targetUser._id.toString(),
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
      },
    });
  } catch (error) {
    return authJson(
      { error: "Unable to update user role right now." },
      databaseFailureStatus(error),
    );
  }
}
