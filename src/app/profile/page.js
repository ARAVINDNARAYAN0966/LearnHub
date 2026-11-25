import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getCurrentUser } from "../../lib/auth";
import { getUserProfile } from "../../lib/profile-data";
import UserProfileView from "../../components/UserProfileView";

export const metadata = {
  title: "My Profile | LearnHub",
  description: "View and manage your LearnHub profile, learning progress, certificates, and reviews.",
};

export default function ProfilePage() {
  return (
    <main className="profile-page min-h-screen py-10">
      <div className="page-container">
        <Suspense
          fallback={
            <div className="p-12 text-center text-sm text-[var(--muted)]">
              Loading your profile...
            </div>
          }
        >
          <AuthenticatedProfileContent />
        </Suspense>
      </div>
    </main>
  );
}

async function AuthenticatedProfileContent() {
  await connection();
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getUserProfile(user.id);
  if (!profile) {
    redirect("/login");
  }

  return <UserProfileView initialProfile={profile} />;
}
