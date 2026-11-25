import { authJson } from "../../../../lib/auth-http";
import { authorizeInstructorApi } from "../../../../lib/admin-course-api";
import {
  getAdminDashboardStats,
  getInstructorDashboardStats,
  getInstructorRecentCourses,
  getInstructorCompletionStats,
} from "../../../../lib/admin-dashboard-data";
import { isDatabaseConnectionError } from "../../../../lib/mongodb";

function databaseFailureStatus(error) {
  return isDatabaseConnectionError(error) ? 503 : 500;
}

export async function GET() {
  const authorization = await authorizeInstructorApi("Instructor dashboard");
  if (authorization.response) return authorization.response;

  try {
    const isPlatformAdmin = authorization.user.role === "admin";
    const instructorId = isPlatformAdmin ? null : authorization.user.id;

    const [stats, recentCourses, completionStats] = await Promise.all([
      isPlatformAdmin
        ? getAdminDashboardStats()
        : getInstructorDashboardStats(authorization.user.id),
      getInstructorRecentCourses(instructorId),
      getInstructorCompletionStats(instructorId),
    ]);

    return authJson({
      stats,
      recentCourses,
      completionStats,
    });
  } catch (error) {
    return authJson(
      { error: "Unable to load instructor dashboard statistics." },
      databaseFailureStatus(error),
    );
  }
}
