import Feedback from "../../../../models/Feedback";
import { getCurrentUser } from "../../../../lib/auth";
import { authJson, logAuthFailure } from "../../../../lib/auth-http";
import { connectToDatabase, isDatabaseConnectionError } from "../../../../lib/mongodb";

function databaseFailureStatus(error) {
  return isDatabaseConnectionError(error) ? 503 : 500;
}

const VALID_CATEGORIES = new Set(["general", "bug", "feature", "ui_ux", "performance"]);
const VALID_STATUSES = new Set(["submitted", "under_review", "resolved", "rejected"]);

export async function GET(request) {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    logAuthFailure("Admin feedback auth check", error);
    return authJson({ error: "Unable to verify your session." }, databaseFailureStatus(error));
  }

  if (!user) {
    return authJson({ error: "Authentication required." }, 401);
  }

  if (user.role !== "admin") {
    return authJson({ error: "Administrator authorization required." }, 403);
  }

  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const categoryFilter = searchParams.get("category");
    const statusFilter = searchParams.get("status");
    const searchQuery = searchParams.get("search");

    const query = {};

    if (categoryFilter && VALID_CATEGORIES.has(categoryFilter)) {
      query.category = categoryFilter;
    }

    if (statusFilter && VALID_STATUSES.has(statusFilter)) {
      query.status = statusFilter;
    }

    if (searchQuery && typeof searchQuery === "string" && searchQuery.trim()) {
      const term = searchQuery.trim();
      query.$or = [
        { title: { $regex: term, $options: "i" } },
        { message: { $regex: term, $options: "i" } },
        { userName: { $regex: term, $options: "i" } },
        { userEmail: { $regex: term, $options: "i" } },
      ];
    }

    const [records, allFeedbackForStats] = await Promise.all([
      Feedback.find(query)
        .populate("user", "name email role")
        .sort({ createdAt: -1 })
        .lean(),
      Feedback.find({})
        .select("status category rating")
        .lean(),
    ]);

    // Calculate Platform Feedback Statistics
    const totalCount = allFeedbackForStats.length;
    const totalRatingSum = allFeedbackForStats.reduce((sum, item) => sum + (item.rating || 0), 0);
    const averageRating = totalCount > 0 ? (totalRatingSum / totalCount).toFixed(1) : "0.0";

    const byStatus = {
      submitted: 0,
      under_review: 0,
      resolved: 0,
      rejected: 0,
    };

    const byCategory = {
      general: 0,
      bug: 0,
      feature: 0,
      ui_ux: 0,
      performance: 0,
    };

    allFeedbackForStats.forEach((item) => {
      if (item.status && item.status in byStatus) {
        byStatus[item.status]++;
      }
      if (item.category && item.category in byCategory) {
        byCategory[item.category]++;
      }
    });

    const formattedList = records.map((item) => ({
      id: item._id.toString(),
      user: item.user
        ? {
            id: item.user._id.toString(),
            name: item.user.name,
            email: item.user.email,
            role: item.user.role,
          }
        : {
            id: null,
            name: item.userName,
            email: item.userEmail,
            role: item.userRole || "guest",
          },
      category: item.category,
      rating: item.rating,
      title: item.title,
      message: item.message,
      status: item.status,
      adminResponse: item.adminResponse || "",
      respondedAt: item.respondedAt ? item.respondedAt.toISOString() : null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }));

    return authJson({
      feedback: formattedList,
      stats: {
        totalCount,
        averageRating,
        byStatus,
        byCategory,
      },
    });
  } catch (error) {
    logAuthFailure("Admin feedback lookup", error);
    return authJson({ error: "Unable to load feedback submissions." }, databaseFailureStatus(error));
  }
}
