import { connection } from "next/server";
import { Suspense } from "react";
import { getCurrentUser } from "../../lib/auth";
import { connectToDatabase } from "../../lib/mongodb";
import Feedback from "../../models/Feedback";
import FeedbackFacilityView from "../../components/FeedbackFacilityView";

export const metadata = {
  title: "Platform Feedback | LearnHub",
  description: "Share your thoughts, report issues, and help improve LearnHub.",
};

export default function FeedbackPage() {
  return (
    <main className="feedback-page min-h-screen py-10">
      <div className="page-container">
        <Suspense
          fallback={
            <div className="p-12 text-center text-sm text-[var(--muted)]">
              Loading feedback center...
            </div>
          }
        >
          <FeedbackContent />
        </Suspense>
      </div>
    </main>
  );
}

async function FeedbackContent() {
  await connection();
  const user = await getCurrentUser();
  let initialHistory = [];

  if (user) {
    try {
      await connectToDatabase();
      const docs = await Feedback.find({ user: user.id })
        .sort({ createdAt: -1 })
        .lean();

      initialHistory = docs.map((doc) => ({
        id: doc._id.toString(),
        category: doc.category,
        rating: doc.rating,
        title: doc.title,
        message: doc.message,
        status: doc.status,
        adminResponse: doc.adminResponse || "",
        respondedAt: doc.respondedAt ? doc.respondedAt.toISOString() : null,
        createdAt: doc.createdAt.toISOString(),
      }));
    } catch (err) {
      console.error("Failed to load feedback history:", err);
    }
  }

  return (
    <FeedbackFacilityView
      isAuthenticated={Boolean(user)}
      initialHistory={initialHistory}
    />
  );
}
