import mongoose from "mongoose";
import Course from "../../../../../models/Course";
import Enrollment from "../../../../../models/Enrollment";
import Review from "../../../../../models/Review";
import { getCurrentUser } from "../../../../../lib/auth";
import { authJson, logAuthFailure } from "../../../../../lib/auth-http";
import { verifyCsrfOrigin } from "../../../../../lib/csrf";
import { getProgressSummary } from "../../../../../lib/lesson-progress";
import {
  connectToDatabase,
  isDatabaseConnectionError,
} from "../../../../../lib/mongodb";

function databaseFailureStatus(error) {
  return isDatabaseConnectionError(error) ? 503 : 500;
}

function validCourseId(courseId) {
  return (
    typeof courseId === "string" &&
    /^[\da-f]{24}$/i.test(courseId) &&
    mongoose.isValidObjectId(courseId)
  );
}

export async function GET(request, { params }) {
  const { courseId } = await params;
  if (!validCourseId(courseId)) {
    return authJson({ error: "A valid course ID is required." }, 400);
  }

  try {
    await connectToDatabase();

    const course = await Course.findById(courseId).lean();
    if (!course) {
      return authJson({ error: "Course not found." }, 404);
    }

    const reviews = await Review.find({ course: courseId })
      .populate({ path: "user", select: "name" })
      .sort({ createdAt: -1 })
      .lean();

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    for (const r of reviews) {
      if (distribution[r.rating] !== undefined) {
        distribution[r.rating] += 1;
      }
      sum += r.rating;
    }

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 ? Number((sum / totalReviews).toFixed(1)) : 0;

    let currentUserReview = null;
    let canReview = false;
    let reviewEligibilityReason = null;

    let user = null;
    try {
      user = await getCurrentUser();
    } catch {
      user = null;
    }

    if (user) {
      const userReview = reviews.find(
        (r) => r.user?._id?.toString() === user.id || r.user?.toString() === user.id,
      );
      if (userReview) {
        currentUserReview = {
          id: userReview._id.toString(),
          rating: userReview.rating,
          title: userReview.title || "",
          comment: userReview.comment,
          createdAt: userReview.createdAt.toISOString(),
          updatedAt: userReview.updatedAt.toISOString(),
        };
        canReview = true;
      } else {
        const enrollment = await Enrollment.findOne({
          user: user.id,
          course: courseId,
          status: { $in: ["active", "completed"] },
        }).lean();

        if (!enrollment) {
          canReview = false;
          reviewEligibilityReason = "Enrollment is required to review this course.";
        } else {
          const progress = await getProgressSummary(user.id, course);
          const isCourseCompleted =
            progress &&
            progress.totalPublishedLessons > 0 &&
            progress.completedLessons >= progress.totalPublishedLessons &&
            progress.progressPercentage === 100;

          if (!isCourseCompleted) {
            canReview = false;
            reviewEligibilityReason =
              "Complete this course before submitting a review.";
          } else {
            canReview = true;
          }
        }
      }
    }

    return authJson({
      averageRating,
      totalReviews,
      distribution,
      canReview,
      reviewEligibilityReason,
      currentUserReview,
      reviews: reviews.map((r) => {
        const name = r.user?.name || "Student";
        const initials = name
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0])
          .join("")
          .toUpperCase();

        return {
          id: r._id.toString(),
          rating: r.rating,
          title: r.title || "",
          comment: r.comment,
          createdAt: r.createdAt.toISOString(),
          author: {
            name,
            initials,
          },
        };
      }),
    });
  } catch (error) {
    logAuthFailure("Reviews lookup", error);
    return authJson(
      { error: "Unable to load reviews right now." },
      databaseFailureStatus(error),
    );
  }
}

export async function POST(request, { params }) {
  const csrf = verifyCsrfOrigin(request);
  if (!csrf.ok) return csrf.response;

  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    logAuthFailure("Reviews authentication", error);
    return authJson(
      { error: "Unable to verify your session." },
      databaseFailureStatus(error),
    );
  }

  if (!user) {
    return authJson({ error: "Authentication required." }, 401);
  }

  const { courseId } = await params;
  if (!validCourseId(courseId)) {
    return authJson({ error: "A valid course ID is required." }, 400);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return authJson({ error: "Invalid request body." }, 400);
  }

  const rating = Number(body?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return authJson(
      { error: "Rating must be an integer between 1 and 5." },
      400,
    );
  }

  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : "";
  const comment = typeof body?.comment === "string" ? body.comment.trim() : "";

  if (comment.length < 5) {
    return authJson(
      { error: "Review comment must be at least 5 characters long." },
      400,
    );
  }
  if (comment.length > 2000) {
    return authJson(
      { error: "Review comment must not exceed 2000 characters." },
      400,
    );
  }

  try {
    await connectToDatabase();

    const course = await Course.findById(courseId).lean();
    if (!course) {
      return authJson({ error: "Course not found." }, 404);
    }

    // Eligibility check
    const enrollment = await Enrollment.findOne({
      user: user.id,
      course: courseId,
      status: { $in: ["active", "completed"] },
    }).lean();

    if (!enrollment) {
      return authJson(
        { error: "You must be enrolled in this course to leave a review." },
        403,
      );
    }

    // Verify 100% completion server-side using actual published lessons and LessonProgress records
    const progress = await getProgressSummary(user.id, course);
    const isCourseCompleted =
      progress &&
      progress.totalPublishedLessons > 0 &&
      progress.completedLessons >= progress.totalPublishedLessons &&
      progress.progressPercentage === 100;

    if (!isCourseCompleted) {
      return authJson(
        {
          error:
            "You must complete this course before submitting a review.",
        },
        403,
      );
    }

    // Create or update review
    const review = await Review.findOneAndUpdate(
      { user: user.id, course: courseId },
      { $set: { rating, title, comment } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // Recalculate course ratings dynamically
    const stats = await Review.aggregate([
      { $match: { course: new mongoose.Types.ObjectId(courseId) } },
      {
        $group: {
          _id: "$course",
          avgRating: { $avg: "$rating" },
          total: { $sum: 1 },
        },
      },
    ]);

    const newAvg = stats.length > 0 ? Number(stats[0].avgRating.toFixed(1)) : rating;
    const newTotal = stats.length > 0 ? stats[0].total : 1;

    await Course.updateOne(
      { _id: courseId },
      { $set: { rating: newAvg, reviews: newTotal } },
    );

    return authJson(
      {
        message: "Your review has been saved.",
        review: {
          id: review._id.toString(),
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          createdAt: review.createdAt.toISOString(),
        },
        courseRating: {
          rating: newAvg,
          reviews: newTotal,
        },
      },
      200,
    );
  } catch (error) {
    logAuthFailure("Review submission", error);
    return authJson(
      { error: "Unable to save review right now." },
      databaseFailureStatus(error),
    );
  }
}

export async function DELETE(request, { params }) {
  const csrf = verifyCsrfOrigin(request);
  if (!csrf.ok) return csrf.response;

  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    logAuthFailure("Review deletion authentication", error);
    return authJson(
      { error: "Unable to verify your session." },
      databaseFailureStatus(error),
    );
  }

  if (!user) {
    return authJson({ error: "Authentication required." }, 401);
  }

  const { courseId } = await params;
  if (!validCourseId(courseId)) {
    return authJson({ error: "A valid course ID is required." }, 400);
  }

  try {
    await connectToDatabase();

    const deleted = await Review.findOneAndDelete({
      user: user.id,
      course: courseId,
    });

    if (!deleted) {
      return authJson({ error: "Review not found or unauthorized." }, 404);
    }

    const stats = await Review.aggregate([
      { $match: { course: new mongoose.Types.ObjectId(courseId) } },
      {
        $group: {
          _id: "$course",
          avgRating: { $avg: "$rating" },
          total: { $sum: 1 },
        },
      },
    ]);

    const newAvg =
      stats.length > 0 ? Number(stats[0].avgRating.toFixed(1)) : 0;
    const newTotal = stats.length > 0 ? stats[0].total : 0;

    await Course.updateOne(
      { _id: courseId },
      { $set: { rating: newAvg, reviews: newTotal } },
    );

    return authJson(
      {
        message: "Your review has been deleted.",
        courseRating: {
          rating: newAvg,
          reviews: newTotal,
        },
      },
      200,
    );
  } catch (error) {
    logAuthFailure("Review deletion", error);
    return authJson(
      { error: "Unable to delete review right now." },
      databaseFailureStatus(error),
    );
  }
}
