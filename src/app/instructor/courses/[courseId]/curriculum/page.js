import { Suspense } from "react";
import { notFound, redirect, unstable_rethrow } from "next/navigation";
import AdminCurriculumManagement from "../../../../../components/AdminCurriculumManagement.jsx";
import AdminLayout from "../../../../../components/AdminLayout.jsx";
import {
  AdminAccessError,
  AdminAccessLoading,
} from "../../../../../components/AdminDashboardView.jsx";
import { getCurrentUser } from "../../../../../lib/auth";
import { getInstructorDashboardRedirect } from "../../../../../lib/curriculum-policy";

export const metadata = { title: "Curriculum management | Instructor Workspace" };

export default function InstructorCurriculumPage({ params }) {
  return (
    <Suspense fallback={<AdminAccessLoading />}>
      <AuthenticatedInstructorCurriculum params={params} />
    </Suspense>
  );
}

async function AuthenticatedInstructorCurriculum({ params }) {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    unstable_rethrow(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error(`Instructor curriculum access verification failed (${errorName})`);
    return <AdminAccessError />;
  }

  const redirectTo = getInstructorDashboardRedirect(user);
  if (redirectTo) redirect(redirectTo);

  const { courseId } = await params;
  if (!/^[\da-f]{24}$/i.test(courseId)) notFound();

  return (
    <AdminLayout
      activeSection="curriculum"
      title="Curriculum management"
      description="Add and organize course modules and lessons for your students."
      role="instructor"
    >
      <AdminCurriculumManagement
        courseId={courseId}
        backHref="/instructor/courses"
      />
    </AdminLayout>
  );
}
