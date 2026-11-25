import mongoose from "mongoose";
import Feedback from "../../../models/Feedback";
import { getCurrentUser } from "../../../lib/auth";
import { authJson, logAuthFailure } from "../../../lib/auth-http";
import { verifyCsrfOrigin } from "../../../lib/csrf";
import { connectToDatabase, isDatabaseConnectionError } from "../../../lib/mongodb";

function databaseFailureStatus(error) {
  return isDatabaseConnectionError(error) ? 503 : 500;
}

const VALID_CATEGORIES = new Set(["general", "bug", "feature", "ui_ux", "performance"]);

export async function POST(request) {
  const csrf = verifyCsrfOrigin(request);
  if (!csrf.ok) return csrf.response;

  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    logAuthFailure("Feedback submission auth check", error);
    return authJson({ error: "Unable to verify your session." }, databaseFailureStatus(error));
  }

  if (!user) {
    return authJson({ error: "Authentication required to submit feedback." }, 401);
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

  // 1. Category
  const category = typeof body.category === "string" ? body.category.trim().toLowerCase() : "";
  if (!VALID_CATEGORIES.has(category)) {
    return authJson(
      { error: "Please select a valid feedback category (general, bug, feature, ui_ux, or performance)." },
      400,
    );
  }

  // 2. Rating (1-5 integer)
  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return authJson({ error: "Please provide a valid platform rating between 1 and 5 stars." }, 400);
  }

  // 3. Title (3 - 150 chars)
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (title.length < 3 || title.length > 150) {
    return authJson({ error: "Feedback title must be between 3 and 150 characters." }, 400);
  }

  // 4. Message (10 - 3000 chars)
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length < 10 || message.length > 3000) {
    return authJson({ error: "Feedback message must be between 10 and 3,000 characters." }, 400);
  }

  try {
    await connectToDatabase();

    // Prevent accidental double-clicks or rapid spam (within 8 seconds)
    const recentDuplicate = await Feedback.findOne({
      user: user.id,
      createdAt: { $gte: new Date(Date.now() - 8000) },
    })
      .select("_id")
      .lean();

    if (recentDuplicate) {
      return authJson(
        { error: "A feedback submission was recently received. Please wait a few moments before submitting again." },
        429,
      );
    }

    const newFeedback = new Feedback({
      user: user.id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      category,
      rating,
      title,
      message,
      status: "submitted",
    });

    await newFeedback.save();

    return authJson(
      {
        message: "Thank you! Your feedback has been received and logged.",
        feedback: {
          id: newFeedback._id.toString(),
          category: newFeedback.category,
          rating: newFeedback.rating,
          title: newFeedback.title,
          message: newFeedback.message,
          status: newFeedback.status,
          createdAt: newFeedback.createdAt.toISOString(),
        },
      },
      201,
    );
  } catch (error) {
    logAuthFailure("Feedback creation", error);
    return authJson({ error: "Unable to submit feedback right now." }, databaseFailureStatus(error));
  }
}
