import crypto from "node:crypto";
import mongoose from "mongoose";
import Certificate from "../../../../../models/Certificate";
import Course from "../../../../../models/Course";
import Enrollment from "../../../../../models/Enrollment";
import { getCurrentUser } from "../../../../../lib/auth";
import { authJson, logAuthFailure } from "../../../../../lib/auth-http";
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

function generateCertificateId(slug) {
  const prefix = slug
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 6)
    .toUpperCase();
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `LH-${prefix || "COURSE"}-${random}`;
}

export async function GET(_request, { params }) {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    logAuthFailure("Certificate authentication", error);
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

    const course = await Course.findById(courseId).lean();
    if (!course) {
      return authJson({ error: "Course not found." }, 404);
    }

    const enrollment = await Enrollment.findOne({
      user: user.id,
      course: courseId,
      status: { $in: ["active", "completed"] },
    }).lean();

    if (!enrollment) {
      return authJson(
        { error: "You must be enrolled in this course to claim a certificate." },
        403,
      );
    }

    // Verify 100% completion server-side
    const progress = await getProgressSummary(user.id, course);
    if (
      progress.totalPublishedLessons === 0 ||
      progress.completedLessons < progress.totalPublishedLessons ||
      progress.progressPercentage < 100
    ) {
      return authJson(
        {
          error:
            "Complete all published lessons to unlock your certificate of completion.",
          progressPercentage: progress.progressPercentage,
          completedLessons: progress.completedLessons,
          totalLessons: progress.totalPublishedLessons,
        },
        403,
      );
    }

    // Fetch existing or generate new certificate
    let cert = await Certificate.findOne({
      user: user.id,
      course: courseId,
    }).lean();

    if (!cert) {
      try {
        cert = await Certificate.create({
          certificateId: generateCertificateId(course.slug),
          user: user.id,
          course: courseId,
          enrollment: enrollment._id,
          recipientName: user.name,
          courseTitle: course.title,
          instructorName: course.instructor,
        });
      } catch (createErr) {
        if (createErr?.code === 11000) {
          cert = await Certificate.findOne({
            user: user.id,
            course: courseId,
          }).lean();
        } else {
          throw createErr;
        }
      }
    }

    return authJson({
      certificate: {
        certificateId: cert.certificateId,
        recipientName: cert.recipientName,
        courseTitle: cert.courseTitle,
        instructorName: cert.instructorName,
        issuedAt: (cert.issuedAt || cert.createdAt).toISOString(),
        verificationUrl: `/certificates/verify?id=${cert.certificateId}`,
        downloadUrl: `/api/certificates/${cert.certificateId}/download`,
      },
    });
  } catch (error) {
    logAuthFailure("Certificate generation", error);
    return authJson(
      { error: "Unable to retrieve certificate right now." },
      databaseFailureStatus(error),
    );
  }
}
