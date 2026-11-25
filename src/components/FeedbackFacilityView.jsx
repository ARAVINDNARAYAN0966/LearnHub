"use client";

import { useState } from "react";
import Link from "next/link";

const CATEGORIES = [
  { id: "general", label: "General Feedback", icon: "💬" },
  { id: "bug", label: "Bug Report", icon: "🐛" },
  { id: "feature", label: "Feature Request", icon: "💡" },
  { id: "ui_ux", label: "UI / UX Improvement", icon: "🎨" },
  { id: "performance", label: "Performance Issue", icon: "⚡" },
];

export default function FeedbackFacilityView({ isAuthenticated, initialHistory = [] }) {
  const [history, setHistory] = useState(initialHistory);
  const [category, setCategory] = useState("general");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return;

    if (!isAuthenticated) {
      setError("Please log in to submit platform feedback.");
      return;
    }

    if (title.trim().length < 3 || title.trim().length > 150) {
      setError("Title must be between 3 and 150 characters.");
      return;
    }

    if (message.trim().length < 10 || message.trim().length > 3000) {
      setError("Message must be between 10 and 3,000 characters.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          rating,
          title: title.trim(),
          message: message.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit feedback.");
      }

      setSuccess(data.message || "Thank you! Your feedback has been received.");
      setTitle("");
      setMessage("");
      setRating(5);

      // Prepend to history
      if (data.feedback) {
        setHistory((prev) => [data.feedback, ...prev]);
      }
    } catch (err) {
      setError(err.message || "An error occurred while submitting feedback.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function getStatusBadge(status) {
    switch (status) {
      case "resolved":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Resolved ✓</span>;
      case "under_review":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">Under Review ⏳</span>;
      case "rejected":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">Rejected ✕</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">Submitted ✉</span>;
    }
  }

  function getCategoryLabel(catId) {
    const item = CATEGORIES.find((c) => c.id === catId);
    return item ? `${item.icon} ${item.label}` : catId;
  }

  return (
    <div className="feedback-facility space-y-12 max-w-4xl mx-auto">
      {/* ── Header ──────────────────────────────────────────────── */}
      <section className="feedback-intro text-center">
        <span className="eyebrow">YOUR VOICE MATTERS</span>
        <h1 className="text-3xl font-extrabold text-[var(--ink)] mt-1.5 mb-3">
          Platform Feedback & Suggestions
        </h1>
        <p className="text-sm text-[var(--muted)] max-w-xl mx-auto">
          Help us shape LearnHub. Report bugs, propose new features, or share your thoughts to improve the learning experience for everyone.
        </p>
      </section>

      {/* ── Feedback Form Card ──────────────────────────────────── */}
      <section className="p-6 md:p-8 rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
        <h2 className="text-lg font-bold text-[var(--ink)] m-0 mb-6 flex items-center gap-2">
          <span>✍</span> Submit Feedback
        </h2>

        {success && (
          <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm mb-6 flex items-center justify-between">
            <span>✓ {success}</span>
            <button type="button" onClick={() => setSuccess("")} className="text-xs font-bold">✕</button>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-sm mb-6 flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button type="button" onClick={() => setError("")} className="text-xs font-bold">✕</button>
          </div>
        )}

        {!isAuthenticated ? (
          <div className="p-8 text-center bg-[var(--surface-subtle)] rounded-lg border border-[var(--line)]">
            <span className="text-2xl block mb-2">🔒</span>
            <h3 className="text-base font-bold text-[var(--ink)] m-0 mb-1">
              Please sign in to share feedback
            </h3>
            <p className="text-xs text-[var(--muted)] mb-4">
              Signing in connects your feedback with your account so our engineering team can follow up and update your ticket status.
            </p>
            <Link href="/login" className="button button-primary text-xs py-2 px-5 inline-block">
              Log In to LearnHub ↗
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase text-[var(--ink-light)] mb-2">
                Feedback Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`p-3 rounded-lg border text-left transition-all flex flex-col items-center sm:items-start text-xs ${
                        isSelected
                          ? "border-[var(--purple)] bg-[var(--surface-alt)] ring-2 ring-[var(--purple)]/30 font-bold text-[var(--purple-dark)]"
                          : "border-[var(--line)] bg-[var(--surface-subtle)] hover:border-[var(--muted)] text-[var(--ink-light)]"
                      }`}
                    >
                      <span className="text-lg mb-1">{cat.icon}</span>
                      <span className="truncate w-full text-center sm:text-left">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Platform Rating */}
            <div>
              <label className="block text-xs font-semibold uppercase text-[var(--ink-light)] mb-1.5">
                Overall Experience Rating ({rating} of 5 stars)
              </label>
              <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="text-2xl p-1 transition-transform hover:scale-110 focus:outline-none"
                    aria-label={`${star} Star${star > 1 ? "s" : ""}`}
                  >
                    <span className={(hoverRating || rating) >= star ? "text-amber-500" : "text-gray-300 dark:text-gray-700"}>
                      ★
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback Title */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase text-[var(--ink-light)]" htmlFor="title">
                  Subject / Summary <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-[var(--muted)]">{title.length}/150</span>
              </div>
              <input
                id="title"
                type="text"
                required
                minLength={3}
                maxLength={150}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief summary of your feedback or issue..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--line)] bg-[var(--surface-alt)] text-[var(--ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--purple)]"
              />
            </div>

            {/* Feedback Message */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase text-[var(--ink-light)]" htmlFor="message">
                  Detailed Explanation <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-[var(--muted)]">{message.length}/3000</span>
              </div>
              <textarea
                id="message"
                rows={5}
                required
                minLength={10}
                maxLength={3000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Please describe what you experienced, what could be improved, or steps to reproduce the bug..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--line)] bg-[var(--surface-alt)] text-[var(--ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--purple)]"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-[var(--muted)] m-0">
                Your feedback will be reviewed by LearnHub administrators.
              </p>
              <button
                type="submit"
                disabled={isSubmitting}
                className="button button-primary text-xs py-2.5 px-6 rounded-lg font-semibold shadow-sm"
              >
                {isSubmitting ? "Submitting..." : "Send Feedback ↗"}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* ── User Feedback History ───────────────────────────────── */}
      {isAuthenticated && (
        <section className="p-6 md:p-8 rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-[var(--ink)] m-0 flex items-center gap-2">
                <span>📋</span> Your Submission History
              </h2>
              <p className="text-xs text-[var(--muted)] m-0 mt-0.5">
                Track status and view administrator responses to your suggestions.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--surface-subtle)] text-[var(--muted)] border border-[var(--line)]">
              {history.length} {history.length === 1 ? "ticket" : "tickets"}
            </span>
          </div>

          {history.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--muted)] bg-[var(--surface-subtle)] rounded-lg">
              You haven&apos;t submitted any feedback yet. Your past suggestions and status updates will appear here.
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item) => (
                <article
                  key={item.id}
                  className="p-5 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-[var(--surface)] text-[var(--ink-light)] border border-[var(--line)]">
                        {getCategoryLabel(item.category)}
                      </span>
                      <span className="text-amber-500 font-bold text-xs">
                        {"★".repeat(item.rating)}{"☆".repeat(5 - item.rating)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-[var(--muted)]">
                        {new Intl.DateTimeFormat("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }).format(new Date(item.createdAt))}
                      </span>
                      {getStatusBadge(item.status)}
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-[var(--ink)] m-0">
                    {item.title}
                  </h3>

                  <p className="text-xs text-[var(--ink-light)] m-0 whitespace-pre-wrap leading-relaxed">
                    {item.message}
                  </p>

                  {item.adminResponse && (
                    <div className="p-3.5 rounded-md bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs">
                      <div className="flex items-center justify-between font-bold text-purple-900 dark:text-purple-300 mb-1">
                        <span>🛡️ Administrator Response:</span>
                        {item.respondedAt && (
                          <span className="text-[10px] font-normal text-purple-700 dark:text-purple-400">
                            {new Intl.DateTimeFormat("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }).format(new Date(item.respondedAt))}
                          </span>
                        )}
                      </div>
                      <p className="m-0 text-purple-950 dark:text-purple-200 whitespace-pre-wrap">
                        {item.adminResponse}
                      </p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
