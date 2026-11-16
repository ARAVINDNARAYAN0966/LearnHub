import { Suspense } from "react";
import { redirect, unstable_rethrow } from "next/navigation";
import AdminCourseManagement from "../../../components/AdminCourseManagement.jsx";
import AdminLayout from "../../../components/AdminLayout.jsx";
import {
  AdminAccessError,
  AdminAccessLoading,
} from "../../../components/AdminDashboardView.jsx";
import { getCurrentUser } from "../../../lib/auth";
import { getAdminDashboardRedirect } from "../../../lib/curriculum-policy";

export const metadata = { title: "Course management" };

export default function AdminCoursesPage() {
  return (
    <Suspense fallback={<AdminAccessLoading />}>
      <AuthenticatedAdminCourses />
    </Suspense>
  );
}

async function AuthenticatedAdminCourses() {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    unstable_rethrow(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error(`Admin course access verification failed (${errorName})`);
    return <AdminAccessError />;
  }

  const redirectTo = getAdminDashboardRedirect(user);
  if (redirectTo) redirect(redirectTo);

  return (
    <AdminLayout
      activeSection="courses"
      title="Course management"
      description="Search, update, publish, and manage LearnHub courses."
    >
      <AdminCourseManagement />
    </AdminLayout>
  );
}
