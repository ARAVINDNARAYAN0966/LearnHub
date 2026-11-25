const ENROLLED_STATUSES = new Set(["active", "completed"]);

export function isInstructor(user) {
  return Boolean(user && (user.role === "instructor" || user.role === "admin"));
}

export function isAdmin(user) {
  return Boolean(user && user.role === "admin");
}

export function getCurriculumAccess(user, enrollment) {
  if (!user) {
    return {
      allowed: false,
      status: 401,
      error: "Authentication required.",
    };
  }

  if (!enrollment || !ENROLLED_STATUSES.has(enrollment.status)) {
    return {
      allowed: false,
      status: 403,
      error: "An active enrollment is required.",
    };
  }

  return { allowed: true, status: 200 };
}

export function getCurriculumManagementAccess(user) {
  if (!user) {
    return {
      allowed: false,
      status: 401,
      error: "Authentication required.",
    };
  }

  if (user.role !== "admin") {
    return {
      allowed: false,
      status: 403,
      error: "Administrator access is required.",
    };
  }

  return { allowed: true, status: 200 };
}

export function getInstructorManagementAccess(user) {
  if (!user) {
    return {
      allowed: false,
      status: 401,
      error: "Authentication required.",
    };
  }

  if (user.role !== "instructor" && user.role !== "admin") {
    return {
      allowed: false,
      status: 403,
      error: "Instructor access is required.",
    };
  }

  return { allowed: true, status: 200 };
}

export function canManageCourse(user, course) {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.role === "instructor") {
    if (!course.instructorId) return false;
    const instructorIdStr = course.instructorId._id
      ? course.instructorId._id.toString()
      : course.instructorId.toString();
    return instructorIdStr === user.id;
  }
  return false;
}

export function getAdminDashboardRedirect(user) {
  if (!user) {
    return "/login";
  }

  return getCurriculumManagementAccess(user).allowed ? null : "/dashboard";
}

export function getInstructorDashboardRedirect(user) {
  if (!user) {
    return "/login";
  }

  return getInstructorManagementAccess(user).allowed ? null : "/dashboard";
}

