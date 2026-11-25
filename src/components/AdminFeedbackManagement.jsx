"use client";

import React, { useCallback, useEffect, useState } from "react";

const CATEGORIES = [
  { id: "all", label: "All Categories", icon: "🌐" },
  { id: "general", label: "General Feedback", icon: "💬" },
  { id: "bug", label: "Bug Report", icon: "🐛" },
  { id: "feature", label: "Feature Request", icon: "💡" },
  { id: "ui_ux", label: "UI / UX Improvement", icon: "🎨" },
  { id: "performance", label: "Performance", icon: "⚡" },
];

const STATUSES = [
  { id: "all", label: "All Statuses" },
  { id: "submitted", label: "Submitted" },
  { id: "under_review", label: "Under Review" },
  { id: "resolved", label: "Resolved" },
  { id: "rejected", label: "Rejected" },
];

export default function AdminFeedbackManagement() {
  const [feedbackList, setFeedbackList] = useState([]);
  const [stats, setStats] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [alert, setAlert] = useState(null);

  // Per-item response editing state
  const [editingResponses, setEditingResponses] = useState({});
  const [updatingId, setUpdatingId] = useState(null);

  const fetchFeedbackData = useCallback(async () => {
    const params = new URLSearchParams();
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search.trim()) params.set("search", search.trim());

    const url = `/api/admin/feedback?${params.toString()}`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to load platform feedback.");
    }
    return data;
  }, [categoryFilter, statusFilter, search]);

  const loadData = useCallback(() => {
    setIsLoading(true);
    setError("");
    fetchFeedbackData()
      .then((data) => {
        setFeedbackList(data.feedback || []);
        if (data.stats) setStats(data.stats);
      })
      .catch((err) => setError(err.message || "Failed to load feedback."))
      .finally(() => setIsLoading(false));
  }, [fetchFeedbackData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadData]);

  async function handleStatusChange(feedbackId, newStatus) {
    if (updatingId) return;
    setUpdatingId(feedbackId);
    setAlert(null);

    try {
      const res = await fetch(`/api/admin/feedback/${feedbackId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();

      if (!res.ok) {
        setAlert({ type: "error", message: data.error || "Failed to update status." });
        return;
      }

      setFeedbackList((prev) =>
        prev.map((item) =>
          item.id === feedbackId ? { ...item, status: newStatus } : item
        )
      );
      setAlert({ type: "success", message: `Status updated to "${newStatus}".` });
    } catch {
      setAlert({ type: "error", message: "Network error updating status." });
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleSaveResponse(feedbackId) {
    if (updatingId) return;
    const responseText = editingResponses[feedbackId] ?? "";
    setUpdatingId(feedbackId);
    setAlert(null);

    try {
      const res = await fetch(`/api/admin/feedback/${feedbackId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminResponse: responseText }),
      });
      const data = await res.json();

      if (!res.ok) {
        setAlert({ type: "error", message: data.error || "Failed to save response." });
        return;
      }

      setFeedbackList((prev) =>
        prev.map((item) =>
          item.id === feedbackId
            ? {
                ...item,
                adminResponse: responseText,
                respondedAt: new Date().toISOString(),
              }
            : item
        )
      );
      setAlert({ type: "success", message: "Response saved and recorded." });
    } catch {
      setAlert({ type: "error", message: "Network error saving admin response." });
    } finally {
      setUpdatingId(null);
    }
  }

  function getStatusBadge(status) {
    switch (status) {
      case "resolved":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            Resolved ✓
          </span>
        );
      case "under_review":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            Under Review ⏳
          </span>
        );
      case "rejected":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700">
            Rejected ✕
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            Submitted ✉
          </span>
        );
    }
  }

  function getCategoryLabel(catId) {
    const item = CATEGORIES.find((c) => c.id === catId);
    return item ? `${item.icon} ${item.label}` : catId;
  }

  return (
    <div className="space-y-6">
      {/* ── Summary Statistics Cards ────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
            <span className="text-xs text-[var(--muted)] uppercase font-semibold">Total Submissions</span>
            <div className="text-2xl font-black text-[var(--ink)] mt-1">{stats.totalCount}</div>
            <span className="text-[11px] text-[var(--muted)]">Platform-wide feedback</span>
          </div>

          <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
            <span className="text-xs text-[var(--muted)] uppercase font-semibold">Average Rating</span>
            <div className="text-2xl font-black text-amber-500 mt-1 flex items-center gap-1">
              <span>{stats.averageRating}</span>
              <span className="text-lg">★</span>
            </div>
            <span className="text-[11px] text-[var(--muted)]">Out of 5.0 stars</span>
          </div>

          <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
            <span className="text-xs text-[var(--muted)] uppercase font-semibold">Pending Review</span>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {(stats.byStatus?.submitted || 0) + (stats.byStatus?.under_review || 0)}
            </div>
            <span className="text-[11px] text-[var(--muted)]">
              {stats.byStatus?.submitted || 0} new, {stats.byStatus?.under_review || 0} in review
            </span>
          </div>

          <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
            <span className="text-xs text-[var(--muted)] uppercase font-semibold">Resolved</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.byStatus?.resolved || 0}
            </div>
            <span className="text-[11px] text-[var(--muted)]">Closed & resolved tickets</span>
          </div>
        </div>
      )}

      {/* ── Toolbar & Filters ─────────────────────────────────────── */}
      <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search bar */}
          <div className="flex-1 relative">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, message, user name, or email..."
              className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-[var(--line)] bg-[var(--surface-alt)] text-[var(--ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--purple)]"
            />
            <span className="absolute left-3 top-2.5 text-[var(--muted)] pointer-events-none text-sm">
              ⌕
            </span>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--surface-alt)] text-[var(--ink)] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--purple)]"
          >
            {STATUSES.map((st) => (
              <option key={st.id} value={st.id}>
                {st.label}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--surface-alt)] text-[var(--ink)] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--purple)]"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.label}
              </option>
            ))}
          </select>

          {(search || categoryFilter !== "all" || statusFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCategoryFilter("all");
                setStatusFilter("all");
              }}
              className="button button-secondary text-xs py-2 px-3 rounded-lg"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ── Global Alert Banner ─────────────────────────────────── */}
      {alert && (
        <div
          className={`p-3.5 rounded-lg text-xs font-medium border flex items-center justify-between ${
            alert.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300"
              : "bg-red-50 dark:bg-red-950/40 border-red-300 text-red-800 dark:text-red-300"
          }`}
        >
          <span>{alert.type === "success" ? "✓" : "⚠️"} {alert.message}</span>
          <button type="button" onClick={() => setAlert(null)} className="text-xs font-bold">
            ✕
          </button>
        </div>
      )}

      {/* ── Feedback Items List ─────────────────────────────────── */}
      {isLoading ? (
        <div className="p-12 text-center text-sm text-[var(--muted)] border border-[var(--line)] bg-[var(--surface)] rounded-xl">
          Loading feedback tickets...
        </div>
      ) : error ? (
        <div className="p-6 text-center text-sm text-red-600 border border-red-300 bg-red-50 rounded-xl">
          {error}
        </div>
      ) : feedbackList.length === 0 ? (
        <div className="p-12 text-center text-sm text-[var(--muted)] border border-[var(--line)] bg-[var(--surface)] rounded-xl">
          No feedback tickets match the selected criteria.
        </div>
      ) : (
        <div className="space-y-4">
          {feedbackList.map((item) => {
            const currentResponse =
              editingResponses[item.id] !== undefined
                ? editingResponses[item.id]
                : item.adminResponse || "";

            return (
              <article
                key={item.id}
                className="p-5 md:p-6 rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-sm space-y-4 transition-all min-w-0 overflow-hidden"
              >
                {/* Header: User, Category, Rating, Date */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-3 min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center shrink-0">
                      {item.user?.name ? item.user.name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div className="min-w-0 break-words">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-xs font-semibold text-[var(--ink)] break-words">
                          {item.user?.name || "Anonymous User"}
                        </strong>
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[var(--surface-subtle)] text-[var(--muted)] border border-[var(--line)] shrink-0">
                          {item.user?.role || "user"}
                        </span>
                      </div>
                      <div className="text-[11px] text-[var(--muted)] break-all">
                        {item.user?.email || "No email available"}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-[var(--surface-subtle)] text-[var(--ink-light)] border border-[var(--line)]">
                      {getCategoryLabel(item.category)}
                    </span>
                    <span className="text-amber-500 font-bold text-xs">
                      {"★".repeat(item.rating)}{"☆".repeat(5 - item.rating)}
                    </span>
                    <span className="text-[11px] text-[var(--muted)]">
                      {new Intl.DateTimeFormat("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(item.createdAt))}
                    </span>
                  </div>
                </div>

                {/* Content: Title & Message */}
                <div className="min-w-0 break-words">
                  <h3 className="text-sm font-bold text-[var(--ink)] m-0 mb-1.5 break-words">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[var(--ink-light)] m-0 whitespace-pre-wrap leading-relaxed break-words">
                    {item.message}
                  </p>
                </div>

                {/* Status & Action Controls */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--muted)]">Status:</span>
                    {getStatusBadge(item.status)}
                    <select
                      value={item.status}
                      disabled={updatingId === item.id}
                      onChange={(e) => handleStatusChange(item.id, e.target.value)}
                      aria-label="Change status"
                      className="text-xs px-2 py-1 rounded border border-[var(--line)] bg-[var(--surface-alt)] text-[var(--ink)] font-medium focus:ring-1 focus:ring-[var(--purple)]"
                    >
                      <option value="submitted">Mark Submitted</option>
                      <option value="under_review">Mark Under Review</option>
                      <option value="resolved">Mark Resolved</option>
                      <option value="rejected">Mark Rejected</option>
                    </select>
                  </div>
                </div>

                {/* Admin Response Section */}
                <div className="mt-3 p-4 rounded-lg bg-[var(--surface-subtle)] border border-[var(--line)] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5" htmlFor={`response-${item.id}`}>
                      <span>🛡️</span> Official Admin Response
                    </label>
                    {item.respondedAt && (
                      <span className="text-[10px] text-[var(--muted)]">
                        Responded {new Intl.DateTimeFormat("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }).format(new Date(item.respondedAt))}
                      </span>
                    )}
                  </div>

                  <textarea
                    id={`response-${item.id}`}
                    rows={3}
                    maxLength={2000}
                    value={currentResponse}
                    placeholder="Compose official resolution or note visible to the student/instructor..."
                    onChange={(e) =>
                      setEditingResponses((prev) => ({
                        ...prev,
                        [item.id]: e.target.value,
                      }))
                    }
                    className="w-full p-2.5 text-xs rounded-md border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--purple)]"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-[var(--muted)]">
                      {currentResponse.length}/2000 chars
                    </span>
                    <button
                      type="button"
                      disabled={updatingId === item.id}
                      onClick={() => handleSaveResponse(item.id)}
                      className="button button-primary text-xs py-1.5 px-4 rounded font-semibold"
                    >
                      {updatingId === item.id ? "Saving..." : "Save Response"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
