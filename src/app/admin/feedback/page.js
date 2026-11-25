import { Suspense } from "react";
import { redirect, unstable_rethrow } from "next/navigation";
import AdminLayout from "../../../components/AdminLayout.jsx";
import AdminFeedbackManagement from "../../../components/AdminFeedbackManagement.jsx";
import {
  AdminAccessError,
  AdminAccessLoading,
} from "../../../components/AdminDashboardView.jsx";
import { getCurrentUser } from "../../../lib/auth";
import { getAdminDashboardRedirect } from "../../../lib/curriculum-policy";

export const metadata = { title: "Platform feedback | LearnHub Admin" };

export default function AdminFeedbackPage() {
  return (
    <Suspense fallback={<AdminAccessLoading />}>
      <AuthenticatedAdminFeedback />
    </Suspense>
  );
}

async function AuthenticatedAdminFeedback() {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    unstable_rethrow(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error(`Admin feedback access verification failed (${errorName})`);
    return <AdminAccessError />;
  }

  const redirectTo = getAdminDashboardRedirect(user);
  if (redirectTo) redirect(redirectTo);

  return (
    <AdminLayout
      activeSection="feedback"
      title="Platform feedback"
      description="Review student and instructor suggestions, update ticket status, and provide administrator responses."
      role="admin"
    >
      <AdminFeedbackManagement />
    </AdminLayout>
  );
}
