"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CourseEnrollmentAction({
  courseId,
  courseSlug,
  lessonId,
  isAuthenticated,
  enrollmentStatus,
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isAuthenticated) {
    return (
      <>
        <p className="enroll-note">Log in to enroll and save this course to your learning space.</p>
        <Link className="button button-primary enroll-button" href="/login">
          Log in to enroll <span aria-hidden="true">↗</span>
        </Link>
      </>
    );
  }

  if (enrollmentStatus === "active" || enrollmentStatus === "completed") {
    return (
      <Link
        className="button button-primary enroll-button"
        href={
          lessonId
            ? `/learn/${courseSlug}/${lessonId}`
            : `/courses/${courseSlug}#curriculum`
        }
      >
        Continue Learning <span aria-hidden="true">↗</span>
      </Link>
    );
  }

  if (enrollmentStatus === "cancelled") {
    return (
      <p className="auth-notice auth-notice-error" role="status">
        This enrollment was cancelled.
      </p>
    );
  }

  async function handleEnroll() {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
        cache: "no-store",
      });
      let result = null;
      try {
        result = await response.json();
      } catch {
        result = null;
      }

      if (!response.ok) {
        setError(result?.error || "Unable to enroll right now. Please try again.");
        if (response.status === 409) {
          router.refresh();
        }
        return;
      }

      router.refresh();
    } catch {
      setError("We couldn’t reach LearnHub. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        className="button button-primary enroll-button"
        type="button"
        onClick={handleEnroll}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Enrolling..." : "Enroll Now"}
        {!isSubmitting && <span aria-hidden="true">↗</span>}
      </button>
      {error && (
        <p className="auth-notice auth-notice-error" role="alert" aria-live="assertive">
          {error}
        </p>
      )}
    </>
  );
}
