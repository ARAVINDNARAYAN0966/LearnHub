"use client";

import { useCallback, useEffect, useState } from "react";

function StarRating({ rating, setRating, interactive = false }) {
  return (
    <div
      style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}
      role={interactive ? "radiogroup" : undefined}
      aria-label={
        interactive ? "Select rating" : `${rating} out of 5 stars`
      }
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type={interactive ? "button" : undefined}
          disabled={!interactive}
          onClick={() => interactive && setRating && setRating(star)}
          className={`star-rating-btn${star > rating ? " star-muted" : ""}`}
          style={{
            cursor: interactive ? "pointer" : "default",
            minWidth: interactive ? "40px" : "auto",
            minHeight: interactive ? "44px" : "auto",
            padding: interactive ? "6px 4px" : "0 2px",
            fontSize: interactive ? "26px" : "20px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label={
            interactive ? `${star} star${star > 1 ? "s" : ""}` : undefined
          }
        >
          ★
        </button>
      ))}
    </div>
  );
}

function formatDate(dateString) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(dateString));
  } catch {
    return "";
  }
}

export default function CourseReviews({ courseId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // fetchReviews returns a promise that resolves with the JSON data.
  // State updates only happen in .then/.catch/.finally callbacks, not synchronously.
  const fetchReviews = useCallback(() => {
    return fetch(`/api/courses/${courseId}/reviews`, { cache: "no-store" }).then(
      (res) => res.json(),
    );
  }, [courseId]);

  const loadReviews = useCallback(() => {
    setLoading(true);
    fetchReviews()
      .then((res) => {
        setData(res);
        if (res.currentUserReview) {
          setRating(res.currentUserReview.rating);
          setTitle(res.currentUserReview.title || "");
          setComment(res.currentUserReview.comment);
        }
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [fetchReviews]);

  useEffect(() => {
    let cancelled = false;
    fetchReviews()
      .then((res) => {
        if (!cancelled) {
          setData(res);
          if (res.currentUserReview) {
            setRating(res.currentUserReview.rating);
            setTitle(res.currentUserReview.title || "");
            setComment(res.currentUserReview.comment);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchReviews]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;

    if (!comment.trim() || comment.trim().length < 5) {
      setError("Please write at least 5 characters for your review.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/courses/${courseId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, title: title.trim(), comment: comment.trim() }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Unable to save review.");
        return;
      }

      setMessage("Thank you! Your review has been published.");
      setShowForm(false);
      loadReviews();
    } catch {
      setError("Unable to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (submitting) return;
    if (!window.confirm("Are you sure you want to delete your review?")) return;

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/courses/${courseId}/reviews`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Unable to delete review.");
        return;
      }

      setMessage("Your review has been deleted.");
      setShowForm(false);
      setRating(5);
      setTitle("");
      setComment("");
      loadReviews();
    } catch {
      setError("Unable to delete review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <section className="detail-panel reviews-panel py-8">
        <span className="eyebrow">COMMUNITY FEEDBACK</span>
        <h2>Student Reviews</h2>
        <p className="text-zinc-500 mt-4 text-sm">Loading reviews...</p>
      </section>
    );
  }

  if (!data) return null;

  const { averageRating, totalReviews, distribution = {}, reviews = [], canReview, currentUserReview, reviewEligibilityReason } = data;

  return (
    <section className="detail-panel reviews-panel" id="reviews">
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div>
          <span className="eyebrow">COMMUNITY FEEDBACK</span>
          <h2>Student Reviews &amp; Ratings</h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-1">
            Real feedback from verified enrolled learners.
          </p>
        </div>

        {canReview && (
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="button button-outline text-sm self-start sm:self-auto"
          >
            {currentUserReview ? (showForm ? "Cancel Edit" : "Edit Your Review") : (showForm ? "Cancel" : "Write a Review")}
          </button>
        )}
      </div>

      {/* Review Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="review-form-box">
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px" }}>
            {currentUserReview
              ? "Update your review"
              : "Rate and review this course"}
          </h3>
          <p
            style={{
              fontSize: 12,
              color: "var(--ink-muted, #726b77)",
              margin: "0 0 16px",
            }}
          >
            Share your experience to help fellow learners discover great courses.
          </p>

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--ink-muted, #726b77)",
                marginBottom: 6,
              }}
            >
              Your Rating
            </label>
            <StarRating rating={rating} setRating={setRating} interactive />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="review-title"
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--ink-muted, #726b77)",
                marginBottom: 4,
              }}
            >
              Review Title (optional)
            </label>
            <input
              id="review-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Invaluable hands-on practical techniques!"
              maxLength={120}
              className="review-input-field"
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="review-comment"
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--ink-muted, #726b77)",
                marginBottom: 4,
              }}
            >
              Your Review
            </label>
            <textarea
              id="review-comment"
              rows={4}
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What did you like about this course? How did it help you grow?"
              maxLength={2000}
              className="review-textarea-field"
            />
          </div>

          {error && <p className="auth-notice auth-notice-error mb-4" role="alert">{error}</p>}
          {message && <p className="auth-notice auth-notice-success mb-4" role="status">{message}</p>}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="button button-primary text-sm py-2 px-5"
              >
                {submitting
                  ? "Submitting..."
                  : currentUserReview
                    ? "Update Review"
                    : "Publish Review"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="button button-outline text-sm py-2 px-4"
              >
                Cancel
              </button>
            </div>
            {currentUserReview && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="text-xs text-red-500 hover:text-red-700 underline font-medium cursor-pointer p-2 min-h-[44px] flex items-center"
              >
                Delete this review
              </button>
            )}
          </div>
        </form>
      )}

      {reviewEligibilityReason && !canReview && (
        <div className="p-4 mb-6 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 text-xs text-zinc-500 border border-zinc-200 dark:border-zinc-700/60 flex items-center gap-2">
          <span aria-hidden="true">ℹ</span>
          <span>{reviewEligibilityReason}</span>
        </div>
      )}

      {/* Aggregate Overview */}
      <div className="review-overview-card">
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1 }}>
            {averageRating.toFixed(1)}
          </div>
          <div style={{ margin: "6px 0" }}>
            <StarRating rating={Math.round(averageRating)} />
          </div>
          <p
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "var(--ink-muted, #726b77)",
              margin: 0,
            }}
          >
            {totalReviews} review{totalReviews === 1 ? "" : "s"}
          </p>
        </div>

        <div>
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = distribution[stars] || 0;
            const percentage =
              totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
            return (
              <div key={stars} className="review-breakdown-row">
                <span className="review-breakdown-label">
                  {stars} {stars === 1 ? "star" : "stars"}
                </span>
                <div className="review-breakdown-track">
                  <div
                    className="review-breakdown-bar"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="review-breakdown-percent">{percentage}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="empty-state py-8 text-center">
          <span aria-hidden="true" className="text-3xl text-zinc-300">
            ★
          </span>
          <h3 className="font-bold text-base mt-2">No reviews yet</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Be the first enrolled student to share feedback on this course!
          </p>
        </div>
      ) : (
        <div>
          {reviews.map((rev) => (
            <article key={rev.id} className="review-item-card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "rgba(245, 158, 11, 0.15)",
                      color: "#b45309",
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                    }}
                  >
                    {rev.author.initials}
                  </div>
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
                      {rev.author.name}
                    </h4>
                    <p
                      style={{
                        fontSize: 11,
                        color: "var(--ink-muted, #726b77)",
                        margin: 0,
                      }}
                    >
                      {formatDate(rev.createdAt)}
                    </p>
                  </div>
                </div>
                <StarRating rating={rev.rating} />
              </div>

              {rev.title && (
                <h5 style={{ fontSize: 15, fontWeight: 700, margin: "12px 0 4px" }}>
                  {rev.title}
                </h5>
              )}
              <p
                style={{
                  fontSize: 13,
                  color: "var(--ink, #17172f)",
                  margin: "6px 0 0",
                  lineHeight: 1.6,
                }}
              >
                {rev.comment}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
