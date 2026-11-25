"use client";

import React, { useCallback, useEffect, useState } from "react";

export default function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [updatingUserId, setUpdatingUserId] = useState(null);

  const fetchUsersData = useCallback(() => {
    return fetch("/api/admin/users", { cache: "no-store" }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to load users.");
      }
      return data.users || [];
    });
  }, []);

  const loadUsers = useCallback(() => {
    setIsLoading(true);
    setError("");
    fetchUsersData()
      .then((userList) => setUsers(userList))
      .catch((err) => setError(err.message || "Failed to load users."))
      .finally(() => setIsLoading(false));
  }, [fetchUsersData]);

  useEffect(() => {
    let cancelled = false;
    fetchUsersData()
      .then((userList) => {
        if (!cancelled) setUsers(userList);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load users.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchUsersData]);

  async function handleRoleChange(userId, newRole) {
    if (updatingUserId) return;
    setUpdatingUserId(userId);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFeedback({ type: "error", message: data.error || "Failed to update user role." });
        return;
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      );
      setFeedback({ type: "success", message: data.message || `User role updated to ${newRole}.` });
    } catch {
      setFeedback({ type: "error", message: "Network error updating user role." });
    } finally {
      setUpdatingUserId(null);
    }
  }

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      `${u.name} ${u.email} ${u.username || ""} ${u.role}`.toLowerCase().includes(query);
    return matchesRole && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="admin-course-toolbar">
        <div className="admin-course-filters">
          <label className="admin-course-search">
            <span aria-hidden="true">⌕</span>
            <span className="sr-only">Search users by name, email, username</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              aria-label="Search users"
            />
          </label>
          <label className="admin-course-status-filter">
            <span className="sr-only">Filter by role</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Filter by role"
            >
              <option value="all">All Roles</option>
              <option value="student">Students</option>
              <option value="instructor">Instructors</option>
              <option value="admin">Admins</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={loadUsers}
          disabled={isLoading}
          className="button button-outline text-xs"
        >
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-lg text-sm ${
            feedback.type === "error"
              ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
              : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
          }`}
          role={feedback.type === "error" ? "alert" : "status"}
        >
          {feedback.message}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800 text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-zinc-500 text-sm">
          Loading platform users...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 text-sm border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900">
          No users match your criteria.
        </div>
      ) : (
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-3 font-semibold">User</th>
                  <th scope="col" className="px-6 py-3 font-semibold">Username</th>
                  <th scope="col" className="px-6 py-3 font-semibold">Joined</th>
                  <th scope="col" className="px-6 py-3 font-semibold">Role</th>
                  <th scope="col" className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredUsers.map((u) => {
                  const initials = u.name
                    ? u.name
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")
                        .toUpperCase()
                    : "U";
                  const isUpdating = updatingUserId === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 flex items-center justify-center font-bold text-xs shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">{u.name}</div>
                            <div className="text-xs text-zinc-400">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-zinc-600 dark:text-zinc-400">
                        {u.username ? `@${u.username}` : "—"}
                      </td>
                      <td className="px-6 py-4 text-xs text-zinc-500 whitespace-nowrap">
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                            u.role === "admin"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                              : u.role === "instructor"
                                ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200"
                                : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <select
                          value={u.role}
                          disabled={isUpdating}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          aria-label={`Change role for ${u.name}`}
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-medium cursor-pointer"
                        >
                          <option value="student">Student</option>
                          <option value="instructor">Instructor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
