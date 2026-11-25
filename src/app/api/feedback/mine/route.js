import Feedback from "../../../../models/Feedback";
import { getCurrentUser } from "../../../../lib/auth";
import { authJson, logAuthFailure } from "../../../../lib/auth-http";
import { connectToDatabase, isDatabaseConnectionError } from "../../../../lib/mongodb";

function databaseFailureStatus(error) {
  return isDatabaseConnectionError(error) ? 503 : 500;
}

export async function GET() {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    logAuthFailure("Feedback history session check", error);
    return authJson({ error: "Unable to verify your session." }, databaseFailureStatus(error));
  }

  if (!user) {
    return authJson({ error: "Authentication required to view feedback history." }, 401);
  }

  try {
    await connectToDatabase();

    const records = await Feedback.find({ user: user.id })
      .select("category rating title message status adminResponse respondedAt createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const feedbackList = records.map((item) => ({
      id: item._id.toString(),
      category: item.category,
      rating: item.rating,
      title: item.title,
      message: item.message,
      status: item.status,
      adminResponse: item.adminResponse || "",
      respondedAt: item.respondedAt ? item.respondedAt.toISOString() : null,
      createdAt: item.createdAt.toISOString(),
    }));

    return authJson({ feedback: feedbackList });
  } catch (error) {
    logAuthFailure("Feedback history lookup", error);
    return authJson({ error: "Unable to load feedback history right now." }, databaseFailureStatus(error));
  }
}
