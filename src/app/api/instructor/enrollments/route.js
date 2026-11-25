import mongoose from "mongoose";
import Course from "../../../../models/Course";
import Enrollment from "../../../../models/Enrollment";
import { authJson } from "../../../../lib/auth-http";
import {
  adminCourseFailure,
  authorizeInstructorApi,
} from "../../../../lib/admin-course-api";
import { connectToDatabase } from "../../../../lib/mongodb";

function validCourseId(id) {
  return typeof id === "string" && /^[\da-f]{24}$/i.test(id) && mongoose.isValidObjectId(id);
}

export async function GET(request) {
  const authorization = await authorizeInstructorApi("Instructor enrollment list");
  if (authorization.response) return authorization.response;

  const { searchParams } = new URL(request.url);
  const filterCourseId = searchParams.get("courseId");
  const filterStatus = searchParams.get("status");
  const searchQuery = searchParams.get("search")?.trim().toLowerCase() || "";

  if (filterCourseId && !validCourseId(filterCourseId)) {
    return authJson({ error: "A valid course ID is required." }, 400);
  }

  try {
    await connectToDatabase();

    // Determine the instructor's authorized courses
    const courseQuery =
      authorization.user.role === "admin"
        ? {}
        : { instructorId: authorization.user.id };

    const instructorCourses = await Course.find(courseQuery)
      .select("_id title slug modules")
      .lean();

    const allowedCourseIdMap = new Map(
      instructorCourses.map((c) => [c._id.toString(), c]),
    );

    // If a specific courseId was requested, enforce ownership
    let targetCourseIds = [];
    if (filterCourseId) {
      if (!allowedCourseIdMap.has(filterCourseId)) {
        return authJson(
          { error: "You are not authorized to view enrollments for this course." },
          403,
        );
      }
      targetCourseIds = [new mongoose.Types.ObjectId(filterCourseId)];
    } else {
      targetCourseIds = Array.from(allowedCourseIdMap.keys()).map(
        (id) => new mongoose.Types.ObjectId(id),
      );
    }

    if (targetCourseIds.length === 0) {
      return authJson({
        enrollments: [],
        total: 0,
        courses: [],
      });
    }

    const enrollmentQuery = { course: { $in: targetCourseIds } };
    if (filterStatus && ["active", "completed", "cancelled"].includes(filterStatus)) {
      enrollmentQuery.status = filterStatus;
    }

    const rawEnrollments = await Enrollment.find(enrollmentQuery)
      .populate({
        path: "user",
        select: "name email",
      })
      .populate({
        path: "course",
        select: "title slug modules",
      })
      .sort({ enrolledAt: -1, _id: -1 })
      .lean();

    let enrollments = rawEnrollments
      .filter((e) => e.user && e.course)
      .map((e) => {
        const totalPublishedLessons = (e.course.modules || []).flatMap(
          (m) => (m.lessons || []).filter((l) => l.published === true),
        ).length;

        return {
          id: e._id.toString(),
          courseId: e.course._id.toString(),
          courseTitle: e.course.title,
          courseSlug: e.course.slug,
          studentId: e.user._id.toString(),
          studentName: e.user.name || "Student",
          studentEmail: e.user.email || "No email",
          enrolledAt: e.enrolledAt ? e.enrolledAt.toISOString() : null,
          status: e.status,
          progressPercentage:
            typeof e.progressPercentage === "number" ? e.progressPercentage : 0,
          completedLessons:
            typeof e.completedLessons === "number" ? e.completedLessons : 0,
          totalLessons: totalPublishedLessons,
        };
      });

    if (searchQuery) {
      enrollments = enrollments.filter(
        (e) =>
          e.studentName.toLowerCase().includes(searchQuery) ||
          e.studentEmail.toLowerCase().includes(searchQuery) ||
          e.courseTitle.toLowerCase().includes(searchQuery),
      );
    }

    const coursesList = instructorCourses.map((c) => ({
      id: c._id.toString(),
      title: c.title,
      slug: c.slug,
    }));

    return authJson({
      enrollments,
      total: enrollments.length,
      courses: coursesList,
    });
  } catch (error) {
    return adminCourseFailure("Instructor enrollment lookup", error);
  }
}
