const ENROLLED_STATUSES = new Set(["active", "completed"]);

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

export function getAdminDashboardRedirect(user) {
  if (!user) {
    return "/login";
  }

  return getCurriculumManagementAccess(user).allowed ? null : "/dashboard";
}
