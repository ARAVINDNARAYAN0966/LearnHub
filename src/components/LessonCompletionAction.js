"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LessonCompletionAction({
  courseId,
  lessonId,
  initiallyCompleted,
}) {
  const router = useRouter();
  const [completed, setCompleted] = useState(initiallyCompleted);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function markComplete() {
    if (isSubmitting || completed) return;

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/progress/${courseId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId }),
        cache: "no-store",
      });
      let result = null;
      try {
        result = await response.json();
      } catch {
        result = null;
      }

      if (!response.ok) {
        setError(result?.error || "Unable to save lesson progress.");
        return;
      }

      setCompleted(true);
      router.refresh();
    } catch {
      setError("We couldn’t reach LearnHub. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="lesson-completion">
      {completed ? (
        <p className="lesson-completed" role="status">
          <span aria-hidden="true">✓</span> Lesson completed
        </p>
      ) : (
        <button
          className="button button-primary"
          type="button"
          onClick={markComplete}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving progress..." : "Mark as complete"}
        </button>
      )}
      {error && (
        <p className="auth-notice auth-notice-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
