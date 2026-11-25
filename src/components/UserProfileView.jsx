"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPrice } from "../lib/format-price";

export default function UserProfileView({ initialProfile }) {
  const [profile, setProfile] = useState(initialProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    name: initialProfile?.name || "",
    headline: initialProfile?.headline || "",
    bio: initialProfile?.bio || "",
    location: initialProfile?.location || "",
    website: initialProfile?.website || "",
    github: initialProfile?.github || "",
    linkedin: initialProfile?.linkedin || "",
    avatarUrl: initialProfile?.avatarUrl || "",
  });

  if (!profile) return null;

  const initials = profile.name
    ? profile.name
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0])
        .join("")
        .toUpperCase()
    : "U";

  const formattedJoinDate = profile.createdAt
    ? new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(profile.createdAt))
    : "Recent";

  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to update profile.");
      }

      setProfile((prev) => ({
        ...prev,
        ...data.profile,
      }));
      setSuccess("Profile updated successfully!");
      setIsEditing(false);
    } catch (err) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="profile-dashboard space-y-8">
      {/* ── Profile Header Card ────────────────────────────────────── */}
      <section className="profile-hero-card p-5 sm:p-6 md:p-8 rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 min-w-0 w-full">
          <div className="flex items-center gap-4 sm:gap-5 min-w-0 w-full sm:w-auto">
            <div className="profile-avatar-container relative shrink-0">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt={`${profile.name}'s avatar`}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-[var(--purple)]"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[var(--surface-subtle)] border-2 border-[var(--purple)] flex items-center justify-center text-xl sm:text-2xl font-bold text-[var(--purple-dark)]">
                  {initials}
                </div>
              )}
              <span
                className={`role-indicator-badge absolute bottom-0 right-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white shadow-sm ${
                  profile.role === "admin"
                    ? "bg-purple-600"
                    : profile.role === "instructor"
                      ? "bg-amber-600"
                      : "bg-blue-600"
                }`}
              >
                {profile.role}
              </span>
            </div>

            <div className="profile-info-text min-w-0 flex-1 break-words">
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--ink)] m-0 flex items-center gap-2 break-words">
                {profile.name}
              </h1>
              {profile.headline ? (
                <p className="text-xs sm:text-sm font-medium text-[var(--ink-light)] mt-1 mb-0 break-words">
                  {profile.headline}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-2 text-xs text-[var(--muted)]">
                <span className="flex items-center gap-1 font-mono break-all">
                  ✉ {profile.email} <span className="text-[10px] bg-[var(--surface-subtle)] px-1.5 py-0.5 rounded border border-[var(--line)] shrink-0">Read-only</span>
                </span>
                <span>•</span>
                <span className="whitespace-nowrap">Member since {formattedJoinDate}</span>
                {profile.location && (
                  <>
                    <span>•</span>
                    <span className="break-words">📍 {profile.location}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-stretch sm:self-auto shrink-0">
            <button
              type="button"
              className={`button text-xs py-2 px-4 rounded-lg font-medium transition-all ${
                isEditing ? "button-outline" : "button-primary"
              }`}
              onClick={() => {
                setIsEditing(!isEditing);
                setError("");
                setSuccess("");
              }}
            >
              {isEditing ? "Cancel Editing" : "Edit Profile ✎"}
            </button>
          </div>
        </div>

        {profile.bio && !isEditing && (
          <div className="mt-5 pt-5 border-t border-[var(--line)] text-sm text-[var(--ink-light)] leading-relaxed">
            <p className="m-0 whitespace-pre-wrap">{profile.bio}</p>
          </div>
        )}

        {/* Social / Portfolio Links */}
        {!isEditing && (profile.website || profile.github || profile.linkedin) && (
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-[var(--line)] text-xs text-[var(--ink-light)]">
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--purple)] hover:underline flex items-center gap-1 font-medium"
              >
                🔗 Website ↗
              </a>
            )}
            {profile.github && (
              <a
                href={
                  profile.github.startsWith("http")
                    ? profile.github
                    : `https://github.com/${profile.github}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--purple)] hover:underline flex items-center gap-1 font-medium"
              >
                💻 GitHub (@{profile.github.replace(/^https?:\/\/(?:www\.)?github\.com\/?/i, "")}) ↗
              </a>
            )}
            {profile.linkedin && (
              <a
                href={
                  profile.linkedin.startsWith("http")
                    ? profile.linkedin
                    : `https://linkedin.com/in/${profile.linkedin}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--purple)] hover:underline flex items-center gap-1 font-medium"
              >
                💼 LinkedIn (@{profile.linkedin.replace(/^https?:\/\/(?:www\.)?linkedin\.com\/in\/?/i, "")}) ↗
              </a>
            )}
          </div>
        )}
      </section>

      {/* ── Status Feedback Banners ───────────────────────────────── */}
      {success && (
        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm flex items-center justify-between">
          <span>✓ {success}</span>
          <button type="button" onClick={() => setSuccess("")} className="text-xs font-bold">✕</button>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-sm flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button type="button" onClick={() => setError("")} className="text-xs font-bold">✕</button>
        </div>
      )}

      {/* ── Profile Edit Modal / Form ──────────────────────────────── */}
      {isEditing && (
        <section className="profile-edit-section p-6 md:p-8 rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-md animate-fadeIn">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--line)] mb-6">
            <div>
              <h2 className="text-lg font-bold text-[var(--ink)] m-0">Edit Profile Information</h2>
              <p className="text-xs text-[var(--muted)] m-0 mt-1">
                Update your personal details and social presence.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-md bg-[var(--surface-subtle)] text-[var(--muted)] border border-[var(--line)]">
              Role: <strong className="capitalize">{profile.role}</strong>
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold uppercase text-[var(--ink-light)] mb-1.5" htmlFor="name">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  maxLength={100}
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--line)] bg-[var(--surface-alt)] text-[var(--ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--purple)]"
                  placeholder="e.g. Jane Doe"
                />
              </div>

              {/* Headline */}
              <div>
                <label className="block text-xs font-semibold uppercase text-[var(--ink-light)] mb-1.5" htmlFor="headline">
                  Headline / Professional Title
                </label>
                <input
                  id="headline"
                  name="headline"
                  type="text"
                  maxLength={120}
                  value={formData.headline}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--line)] bg-[var(--surface-alt)] text-[var(--ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--purple)]"
                  placeholder="e.g. Full Stack Engineer & Cloud Architect"
                />
              </div>

              {/* Email (Read Only) */}
              <div>
                <label className="block text-xs font-semibold uppercase text-[var(--muted)] mb-1.5" htmlFor="email">
                  Email Address (Locked)
                </label>
                <input
                  id="email"
                  type="email"
                  disabled
                  value={profile.email}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] text-[var(--muted)] text-sm cursor-not-allowed opacity-80"
                />
                <p className="text-[11px] text-[var(--muted)] mt-1">
                  Email address cannot be changed for security and authentication consistency.
                </p>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-semibold uppercase text-[var(--ink-light)] mb-1.5" htmlFor="location">
                  Location
                </label>
                <input
                  id="location"
                  name="location"
                  type="text"
                  maxLength={100}
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--line)] bg-[var(--surface-alt)] text-[var(--ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--purple)]"
                  placeholder="e.g. Bengaluru, India or London, UK"
                />
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs font-semibold uppercase text-[var(--ink-light)] mb-1.5" htmlFor="bio">
                Biography ({formData.bio.length}/1000 characters)
              </label>
              <textarea
                id="bio"
                name="bio"
                rows={3}
                maxLength={1000}
                value={formData.bio}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--line)] bg-[var(--surface-alt)] text-[var(--ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--purple)]"
                placeholder="Share a short introduction about your learning goals, background, or passions..."
              />
            </div>

            {/* Social Links Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-semibold uppercase text-[var(--ink-light)] mb-1.5" htmlFor="website">
                  Website / Portfolio
                </label>
                <input
                  id="website"
                  name="website"
                  type="url"
                  maxLength={250}
                  value={formData.website}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--line)] bg-[var(--surface-alt)] text-[var(--ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--purple)]"
                  placeholder="https://yourdomain.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-[var(--ink-light)] mb-1.5" htmlFor="github">
                  GitHub Username
                </label>
                <input
                  id="github"
                  name="github"
                  type="text"
                  maxLength={100}
                  value={formData.github}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--line)] bg-[var(--surface-alt)] text-[var(--ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--purple)]"
                  placeholder="octocat"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-[var(--ink-light)] mb-1.5" htmlFor="linkedin">
                  LinkedIn Profile / Handle
                </label>
                <input
                  id="linkedin"
                  name="linkedin"
                  type="text"
                  maxLength={100}
                  value={formData.linkedin}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--line)] bg-[var(--surface-alt)] text-[var(--ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--purple)]"
                  placeholder="in/janedoe"
                />
              </div>
            </div>

            {/* Avatar URL */}
            <div>
              <label className="block text-xs font-semibold uppercase text-[var(--ink-light)] mb-1.5" htmlFor="avatarUrl">
                Avatar Image URL (Optional HTTPS)
              </label>
              <input
                id="avatarUrl"
                name="avatarUrl"
                type="url"
                maxLength={2048}
                value={formData.avatarUrl}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--line)] bg-[var(--surface-alt)] text-[var(--ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--purple)]"
                placeholder="https://images.unsplash.com/... or secure avatar link"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--line)]">
              <button
                type="button"
                className="button button-outline text-xs py-2 px-4 rounded-lg"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="button button-primary text-xs py-2 px-5 rounded-lg font-semibold"
                disabled={isSaving}
              >
                {isSaving ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ── ROLE-SPECIFIC DASHBOARD SECTIONS ────────────────────────── */}

      {/* 1. STUDENT VIEW */}
      {profile.role === "student" && profile.studentData && (
        <div className="space-y-8">
          {/* Student Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <article className="stat-card p-5 rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Enrolled Courses</span>
              <div className="text-2xl font-bold text-[var(--ink)] mt-1.5">
                {profile.studentData.totalEnrolled}
              </div>
              <p className="text-[11px] text-[var(--muted)] m-0 mt-1">Total learning pathways</p>
            </article>

            <article className="stat-card p-5 rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Completed Courses</span>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1.5">
                {profile.studentData.completedCourses}
              </div>
              <p className="text-[11px] text-[var(--muted)] m-0 mt-1">100% finished</p>
            </article>

            <article className="stat-card p-5 rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">In Progress</span>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1.5">
                {profile.studentData.activeCourses}
              </div>
              <p className="text-[11px] text-[var(--muted)] m-0 mt-1">Active coursework</p>
            </article>

            <article className="stat-card p-5 rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Average Progress</span>
              <div className="text-2xl font-bold text-[var(--purple-dark)] mt-1.5">
                {profile.studentData.averageProgress}%
              </div>
              <p className="text-[11px] text-[var(--muted)] m-0 mt-1">Overall completion rate</p>
            </article>
          </div>

          {/* Recently Accessed Courses */}
          <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-[var(--ink)] m-0">Your Courses</h2>
                <p className="text-xs text-[var(--muted)] m-0 mt-0.5">Recently active enrolled courses.</p>
              </div>
              <Link href="/dashboard" className="text-xs font-semibold text-[var(--purple)] hover:underline">
                View Full Dashboard ↗
              </Link>
            </div>

            {profile.studentData.recentCourses && profile.studentData.recentCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.studentData.recentCourses.map((enrollment) => {
                  const course = enrollment.course;
                  if (!course) return null;
                  return (
                    <div
                      key={enrollment.id}
                      className="p-4 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] flex gap-4 items-center min-w-0 overflow-hidden"
                    >
                      <div
                        className="w-16 h-16 rounded-md bg-cover bg-center shrink-0 border border-[var(--line)]"
                        style={{ backgroundImage: `url("${course.image}")` }}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-[var(--purple)] uppercase">
                          {course.category}
                        </span>
                        <h3 className="text-sm font-bold text-[var(--ink)] truncate m-0 mt-0.5">
                          <Link href={`/courses/${course.slug}`} className="hover:underline">
                            {course.title}
                          </Link>
                        </h3>
                        <div className="flex items-center justify-between text-xs text-[var(--muted)] mt-2">
                          <span>Progress: {enrollment.progressPercentage}%</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                            enrollment.status === "completed"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          }`}>
                            {enrollment.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-[var(--muted)]">
                <p>No enrolled courses yet. Discover our curriculum to start learning!</p>
                <Link href="/courses" className="button button-primary text-xs mt-3 inline-block">
                  Explore Catalogue ↗
                </Link>
              </div>
            )}
          </section>

          {/* Earned Certificates */}
          <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-[var(--ink)] m-0 flex items-center gap-2">
                  <span>🎓</span> Earned Certificates
                </h2>
                <p className="text-xs text-[var(--muted)] m-0 mt-0.5">Verified credentials awarded upon 100% course completion.</p>
              </div>
              <Link href="/certificates/verify" className="text-xs font-semibold text-[var(--purple)] hover:underline">
                Verify Credential Tool ↗
              </Link>
            </div>

            {profile.studentData.certificates && profile.studentData.certificates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.studentData.certificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="p-4 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400">
                        ID: {cert.certificateId}
                      </span>
                      <h3 className="text-sm font-bold text-[var(--ink)] m-0 mt-1">
                        {cert.courseTitle}
                      </h3>
                      <p className="text-xs text-[var(--muted)] mt-1 mb-0">
                        Instructor: {cert.instructorName}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-amber-200/60 dark:border-amber-900/40 text-xs">
                      <span className="text-[var(--muted)] text-[11px]">
                        Issued {new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(cert.issuedAt))}
                      </span>
                      <Link
                        href={`/certificates/${cert.certificateId}`}
                        className="font-semibold text-amber-800 dark:text-amber-300 hover:underline"
                      >
                        View Certificate ↗
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-[var(--muted)] bg-[var(--surface-subtle)] rounded-lg">
                Complete all published lessons in any course to earn your verified graduation certificate.
              </div>
            )}
          </section>

          {/* Submitted Course Reviews */}
          <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[var(--ink)] m-0 mb-4 flex items-center gap-2">
              <span>★</span> Your Course Reviews
            </h2>

            {profile.studentData.reviews && profile.studentData.reviews.length > 0 ? (
              <div className="space-y-3">
                {profile.studentData.reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <Link href={`/courses/${rev.courseSlug}`} className="text-sm font-bold text-[var(--ink)] hover:underline">
                        {rev.courseTitle}
                      </Link>
                      <span className="text-amber-500 font-bold text-xs tracking-wider">
                        {"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)} ({rev.rating}/5)
                      </span>
                    </div>
                    <p className="text-xs text-[var(--ink-light)] m-0 italic">
                      &quot;{rev.comment}&quot;
                    </p>
                    <span className="text-[10px] text-[var(--muted)]">
                      Submitted on {new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(rev.createdAt))}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--muted)] m-0">You have not submitted any course reviews yet.</p>
            )}
          </section>
        </div>
      )}

      {/* 2. INSTRUCTOR VIEW */}
      {profile.role === "instructor" && profile.instructorData && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <article className="stat-card p-5 rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Total Courses</span>
              <div className="text-2xl font-bold text-[var(--ink)] mt-1.5">
                {profile.instructorData.totalCourses}
              </div>
              <p className="text-[11px] text-[var(--muted)] m-0 mt-1">Created curriculum</p>
            </article>

            <article className="stat-card p-5 rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Published</span>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1.5">
                {profile.instructorData.publishedCount}
              </div>
              <p className="text-[11px] text-[var(--muted)] m-0 mt-1">Live in marketplace</p>
            </article>

            <article className="stat-card p-5 rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Total Students</span>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1.5">
                {profile.instructorData.stats?.totalEnrollments || 0}
              </div>
              <p className="text-[11px] text-[var(--muted)] m-0 mt-1">Learners enrolled</p>
            </article>

            <article className="stat-card p-5 rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Average Rating</span>
              <div className="text-2xl font-bold text-amber-500 mt-1.5 flex items-center gap-1">
                ★ {profile.instructorData.averageRating}
              </div>
              <p className="text-[11px] text-[var(--muted)] m-0 mt-1">From {profile.instructorData.totalRatings} ratings</p>
            </article>
          </div>

          <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-[var(--ink)] m-0">Your Authored Courses</h2>
                <p className="text-xs text-[var(--muted)] m-0 mt-0.5">Manage lessons, pricing, and curriculum publication.</p>
              </div>
              <Link href="/instructor/courses" className="button button-small button-primary text-xs">
                Teaching Workspace ↗
              </Link>
            </div>

            {profile.instructorData.courses && profile.instructorData.courses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.instructorData.courses.map((course) => (
                  <div
                    key={course.id}
                    className="p-4 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] flex gap-4 items-center"
                  >
                    <div
                      className="w-16 h-16 rounded-md bg-cover bg-center shrink-0 border border-[var(--line)]"
                      style={{ backgroundImage: `url("${course.image}")` }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-[var(--purple)] uppercase">
                        {course.category} · {course.level}
                      </span>
                      <h3 className="text-sm font-bold text-[var(--ink)] truncate m-0 mt-0.5">
                        <Link href={`/courses/${course.slug}`} className="hover:underline">
                          {course.title}
                        </Link>
                      </h3>
                      <div className="flex items-center justify-between text-xs text-[var(--muted)] mt-2">
                        <span>{course.lessonCount} lessons · {formatPrice(course.price)}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          course.published
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}>
                          {course.published ? "Published" : "Draft"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--muted)] m-0">No courses authored yet.</p>
            )}
          </section>
        </div>
      )}

      {/* 3. ADMIN VIEW */}
      {profile.role === "admin" && profile.adminData && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <article className="stat-card p-5 rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Platform Users</span>
              <div className="text-2xl font-bold text-[var(--ink)] mt-1.5">
                {profile.adminData.totalUsers}
              </div>
              <p className="text-[11px] text-[var(--muted)] m-0 mt-1">Registered accounts</p>
            </article>

            <article className="stat-card p-5 rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Catalogue Courses</span>
              <div className="text-2xl font-bold text-[var(--ink)] mt-1.5">
                {profile.adminData.totalCourses}
              </div>
              <p className="text-[11px] text-[var(--muted)] m-0 mt-1">Live & draft courses</p>
            </article>

            <article className="stat-card p-5 rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Platform Feedback</span>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1.5">
                {profile.adminData.totalFeedback}
              </div>
              <p className="text-[11px] text-[var(--muted)] m-0 mt-1">User suggestions & reports</p>
            </article>

            <article className="stat-card p-5 rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Account Security</span>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1.5">
                Admin
              </div>
              <p className="text-[11px] text-[var(--muted)] m-0 mt-1">Role is locked</p>
            </article>
          </div>

          <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[var(--ink)] m-0 mb-4">Admin Management Console</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Link
                href="/admin"
                className="p-4 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-alt)] transition-all block group"
              >
                <span className="text-lg mb-1 block">▦</span>
                <strong className="text-sm text-[var(--ink)] group-hover:text-[var(--purple)] block">Overview</strong>
                <p className="text-xs text-[var(--muted)] m-0 mt-0.5">Platform statistics & metrics</p>
              </Link>

              <Link
                href="/admin/courses"
                className="p-4 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-alt)] transition-all block group"
              >
                <span className="text-lg mb-1 block">◫</span>
                <strong className="text-sm text-[var(--ink)] group-hover:text-[var(--purple)] block">Courses</strong>
                <p className="text-xs text-[var(--muted)] m-0 mt-0.5">Manage curriculum & publishing</p>
              </Link>

              <Link
                href="/admin/users"
                className="p-4 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-alt)] transition-all block group"
              >
                <span className="text-lg mb-1 block">👥</span>
                <strong className="text-sm text-[var(--ink)] group-hover:text-[var(--purple)] block">Users</strong>
                <p className="text-xs text-[var(--muted)] m-0 mt-0.5">Account roles & permissions</p>
              </Link>

              <Link
                href="/admin/feedback"
                className="p-4 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-alt)] transition-all block group"
              >
                <span className="text-lg mb-1 block">💬</span>
                <strong className="text-sm text-[var(--ink)] group-hover:text-[var(--purple)] block">Feedback</strong>
                <p className="text-xs text-[var(--muted)] m-0 mt-0.5">User feedback & bug reports</p>
              </Link>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
