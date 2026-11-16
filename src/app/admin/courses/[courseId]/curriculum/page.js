import { Suspense } from "react";
import { notFound, redirect, unstable_rethrow } from "next/navigation";
import AdminCurriculumManagement from "../../../../../components/AdminCurriculumManagement.jsx";
import AdminLayout from "../../../../../components/AdminLayout.jsx";
import {
  AdminAccessError,
  AdminAccessLoading,
} from "../../../../../components/AdminDashboardView.jsx";
import { getCurrentUser } from "../../../../../lib/auth";
import { getAdminDashboardRedirect } from "../../../../../lib/curriculum-policy";

export const metadata = { title: "Curriculum management" };

export default function AdminCurriculumPage({ params }) {
  return (
    <Suspense fallback={<AdminAccessLoading />}>
      <AuthenticatedAdminCurriculum params={params} />
    </Suspense>
  );
}

async function AuthenticatedAdminCurriculum({ params }) {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    unstable_rethrow(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error(`Admin curriculum access verification failed (${errorName})`);
    return <AdminAccessError />;
  }

  const redirectTo = getAdminDashboardRedirect(user);
  if (redirectTo) redirect(redirectTo);

  const { courseId } = await params;
  if (!/^[\da-f]{24}$/i.test(courseId)) notFound();

  return (
    <AdminLayout
      activeSection="curriculum"
      title="Curriculum management"
      description="Edit course modules and lessons without losing learner progress."
    >
      <AdminCurriculumManagement courseId={courseId} />
    </AdminLayout>
  );
}
