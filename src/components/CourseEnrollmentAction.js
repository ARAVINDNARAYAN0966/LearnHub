"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ClaimCertificateButton from "./ClaimCertificateButton";

export default function CourseEnrollmentAction({
  courseId,
  courseSlug,
  coursePrice = 0,
  lessonId,
  isAuthenticated,
  enrollmentStatus,
  isCourseComplete = false,
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (enrollmentStatus === "active" || enrollmentStatus === "completed") {
    return (
      <div className="flex flex-col gap-2">
        {isCourseComplete && (
          <p className="lesson-completed enroll-course-completed" role="status">
            <span aria-hidden="true">✓</span> All published lessons completed
          </p>
        )}
        {isCourseComplete && (
          <ClaimCertificateButton
            courseId={courseId}
            buttonText="View Certificate 🎓"
            className="button button-primary enroll-button"
          />
        )}
        <Link
          className={`button ${isCourseComplete ? "button-outline" : "button-primary"} enroll-button`}
          href={
            lessonId
              ? `/learn/${courseSlug}/${lessonId}`
              : `/courses/${courseSlug}#curriculum`
          }
        >
          {isCourseComplete ? "Review curriculum" : "Continue Learning"}{" "}
          <span aria-hidden="true">↗</span>
        </Link>
      </div>
    );
  }

  if (enrollmentStatus === "cancelled") {
    return (
      <p className="auth-notice auth-notice-error" role="status">
        This enrollment was cancelled.
      </p>
    );
  }

  if (coursePrice > 0) {
    return (
      <div className="flex flex-col gap-2">
        <button
          className="button button-primary enroll-button opacity-70 cursor-not-allowed"
          type="button"
          disabled
          aria-disabled="true"
          title="Payment processing is currently not configured"
        >
          Enrollment Unavailable (Payment Required)
        </button>
        <p className="enroll-note text-amber-700 dark:text-amber-400 text-xs mt-1" role="note">
          Paid course enrollment is currently unavailable because no payment gateway is configured.
        </p>
      </div>
    );
  }

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
