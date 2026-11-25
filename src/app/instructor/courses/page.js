import { Suspense } from "react";
import { redirect, unstable_rethrow } from "next/navigation";
import AdminCourseManagement from "../../../components/AdminCourseManagement.jsx";
import AdminLayout from "../../../components/AdminLayout.jsx";
import {
  AdminAccessError,
  AdminAccessLoading,
} from "../../../components/AdminDashboardView.jsx";
import { getCurrentUser } from "../../../lib/auth";
import { getInstructorDashboardRedirect } from "../../../lib/curriculum-policy";

export const metadata = { title: "Manage courses" };

export default function InstructorCoursesPage() {
  return (
    <Suspense fallback={<AdminAccessLoading message="Verifying instructor access..." />}>
      <AuthenticatedInstructorCourses />
    </Suspense>
  );
}

async function AuthenticatedInstructorCourses() {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    unstable_rethrow(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error(`Instructor course access verification failed (${errorName})`);
    return <AdminAccessError />;
  }

  const redirectTo = getInstructorDashboardRedirect(user);
  if (redirectTo) redirect(redirectTo);

  return (
    <AdminLayout
      activeSection="courses"
      title="Course management"
      description="Create, edit, and manage your courses and lessons."
      role="instructor"
    >
      <AdminCourseManagement
        apiBase="/api/instructor/courses"
        curriculumBase="/instructor/courses"
      />
    </AdminLayout>
  );
}
