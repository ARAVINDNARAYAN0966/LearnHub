import { Suspense } from "react";
import { redirect, unstable_rethrow } from "next/navigation";
import AdminLayout from "../../../components/AdminLayout.jsx";
import AdminUserManagement from "../../../components/AdminUserManagement.jsx";
import {
  AdminAccessError,
  AdminAccessLoading,
} from "../../../components/AdminDashboardView.jsx";
import { getCurrentUser } from "../../../lib/auth";
import { getAdminDashboardRedirect } from "../../../lib/curriculum-policy";

export const metadata = { title: "User management | LearnHub Admin" };

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<AdminAccessLoading />}>
      <AuthenticatedAdminUsers />
    </Suspense>
  );
}

async function AuthenticatedAdminUsers() {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    unstable_rethrow(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error(`Admin user access verification failed (${errorName})`);
    return <AdminAccessError />;
  }

  const redirectTo = getAdminDashboardRedirect(user);
  if (redirectTo) redirect(redirectTo);

  return (
    <AdminLayout
      activeSection="users"
      title="User management"
      description="View registered accounts and assign student, instructor, or admin roles."
      role="admin"
    >
      <AdminUserManagement />
    </AdminLayout>
  );
}
