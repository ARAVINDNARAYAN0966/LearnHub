import { Suspense } from "react";
import { redirect, unstable_rethrow } from "next/navigation";
import InstructorEnrollmentView from "../../../components/InstructorEnrollmentView.jsx";
import AdminLayout from "../../../components/AdminLayout.jsx";
import {
  AdminAccessError,
  AdminAccessLoading,
} from "../../../components/AdminDashboardView.jsx";
import { getCurrentUser } from "../../../lib/auth";
import { getInstructorDashboardRedirect } from "../../../lib/curriculum-policy";

export const metadata = { title: "Student enrollments" };

export default function InstructorEnrollmentsPage() {
  return (
    <Suspense fallback={<AdminAccessLoading message="Verifying instructor access..." />}>
      <AuthenticatedInstructorEnrollments />
    </Suspense>
  );
}

async function AuthenticatedInstructorEnrollments() {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    unstable_rethrow(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error(`Instructor enrollments access verification failed (${errorName})`);
    return <AdminAccessError />;
  }

  const redirectTo = getInstructorDashboardRedirect(user);
  if (redirectTo) redirect(redirectTo);

  return (
    <AdminLayout
      activeSection="enrollments"
      title="Student enrollments"
      description="Track student learning progress and course completions."
      role="instructor"
    >
      <InstructorEnrollmentView />
    </AdminLayout>
  );
}
