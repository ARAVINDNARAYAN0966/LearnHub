import mongoose from "mongoose";
import Feedback from "../../../../../models/Feedback";
import { getCurrentUser } from "../../../../../lib/auth";
import { authJson, logAuthFailure } from "../../../../../lib/auth-http";
import { verifyCsrfOrigin } from "../../../../../lib/csrf";
import { connectToDatabase, isDatabaseConnectionError } from "../../../../../lib/mongodb";

function databaseFailureStatus(error) {
  return isDatabaseConnectionError(error) ? 503 : 500;
}

const VALID_STATUSES = new Set(["submitted", "under_review", "resolved", "rejected"]);

export async function PATCH(request, { params }) {
  const csrf = verifyCsrfOrigin(request);
  if (!csrf.ok) return csrf.response;

  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    logAuthFailure("Admin feedback update auth check", error);
    return authJson({ error: "Unable to verify your session." }, databaseFailureStatus(error));
  }

  if (!user) {
    return authJson({ error: "Authentication required." }, 401);
  }

  if (user.role !== "admin") {
    return authJson({ error: "Administrator authorization required." }, 403);
  }

  const { feedbackId } = await params;
  if (!feedbackId || !mongoose.isValidObjectId(feedbackId)) {
    return authJson({ error: "A valid feedback ID is required." }, 400);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return authJson({ error: "Invalid request body." }, 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return authJson({ error: "Invalid request body." }, 400);
  }

  const updateFields = {};

  if ("status" in body) {
    const status = typeof body.status === "string" ? body.status.trim().toLowerCase() : "";
    if (!VALID_STATUSES.has(status)) {
      return authJson(
        { error: "Invalid status. Allowed values: submitted, under_review, resolved, rejected." },
        400,
      );
    }
    updateFields.status = status;
  }

  if ("adminResponse" in body) {
    if (typeof body.adminResponse !== "string") {
      return authJson({ error: "Admin response must be text." }, 400);
    }
    const trimmedResponse = body.adminResponse.trim();
    if (trimmedResponse.length > 2000) {
      return authJson({ error: "Admin response must be 2,000 characters or fewer." }, 400);
    }
    updateFields.adminResponse = trimmedResponse;
    updateFields.respondedAt = new Date();
    updateFields.respondedBy = user.id;
  }

  if (Object.keys(updateFields).length === 0) {
    return authJson({ error: "No update fields provided." }, 400);
  }

  try {
    await connectToDatabase();

    const updated = await Feedback.findByIdAndUpdate(
      feedbackId,
      { $set: updateFields },
      { new: true, runValidators: true },
    )
      .populate("user", "name email role")
      .lean();

    if (!updated) {
      return authJson({ error: "Feedback item not found." }, 404);
    }

    return authJson({
      message: "Feedback updated successfully.",
      feedback: {
        id: updated._id.toString(),
        user: updated.user
          ? {
              id: updated.user._id.toString(),
              name: updated.user.name,
              email: updated.user.email,
              role: updated.user.role,
            }
          : {
              id: null,
              name: updated.userName,
              email: updated.userEmail,
              role: updated.userRole || "guest",
            },
        category: updated.category,
        rating: updated.rating,
        title: updated.title,
        message: updated.message,
        status: updated.status,
        adminResponse: updated.adminResponse || "",
        respondedAt: updated.respondedAt ? updated.respondedAt.toISOString() : null,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    logAuthFailure("Admin feedback update execution", error);
    return authJson({ error: "Unable to update feedback item." }, databaseFailureStatus(error));
  }
}
