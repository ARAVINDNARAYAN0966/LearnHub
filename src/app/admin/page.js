import { Suspense } from "react";
import { redirect, unstable_rethrow } from "next/navigation";
import AdminLayout from "../../components/AdminLayout.jsx";
import {
  AdminAccessError,
  AdminAccessLoading,
  AdminDashboardError,
  AdminDashboardLoading,
  default as AdminDashboardView,
} from "../../components/AdminDashboardView.jsx";
import { getCurrentUser } from "../../lib/auth";
import { getAdminDashboardStats } from "../../lib/admin-dashboard-data";
import { getAdminDashboardRedirect } from "../../lib/curriculum-policy";

export const metadata = { title: "Admin dashboard" };

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminAccessLoading />}>
      <AuthenticatedAdminDashboard />
    </Suspense>
  );
}

async function AuthenticatedAdminDashboard() {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    unstable_rethrow(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error(`Admin access verification failed (${errorName})`);
    return <AdminAccessError />;
  }

  const redirectTo = getAdminDashboardRedirect(user);
  if (redirectTo) redirect(redirectTo);

  return (
    <AdminLayout
      activeSection="overview"
      title="Dashboard overview"
      description="Monitor courses and learner enrollment activity."
    >
      <Suspense fallback={<AdminDashboardLoading />}>
        <AdminOverview />
      </Suspense>
    </AdminLayout>
  );
}

async function AdminOverview() {
  let stats;
  try {
    stats = await getAdminDashboardStats();
  } catch (error) {
    unstable_rethrow(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error(`Admin dashboard statistics failed (${errorName})`);
    return <AdminDashboardError />;
  }

  return <AdminDashboardView stats={stats} />;
}
