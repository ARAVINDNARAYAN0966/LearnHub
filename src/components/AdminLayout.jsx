import React from "react";
import Link from "next/link";

const adminNavigation = [
  { id: "overview", label: "Overview", href: "/admin", icon: "▦" },
  { id: "courses", label: "Courses", href: "/admin/courses", icon: "◫" },
  { id: "users", label: "Users", href: "/admin/users", icon: "👥" },
  { id: "feedback", label: "Feedback", href: "/admin/feedback", icon: "💬" },
];

const instructorNavigation = [
  { id: "overview", label: "Overview", href: "/instructor", icon: "▦" },
  { id: "courses", label: "My Courses", href: "/instructor/courses", icon: "◫" },
  { id: "enrollments", label: "Enrollments", href: "/instructor/enrollments", icon: "👥" },
];

export default function AdminLayout({
  activeSection = "overview",
  title,
  description,
  role = "admin",
  children,
}) {
  const isInstructor = role === "instructor";
  const navigation = isInstructor ? instructorNavigation : adminNavigation;
  const brandHref = isInstructor ? "/instructor" : "/admin";
  const brandSub = isInstructor ? "INSTRUCTOR WORKSPACE" : "ADMIN WORKSPACE";
  const roleBadge = isInstructor ? "INSTRUCTOR" : "ADMIN";
  const eyebrowText = isInstructor ? "LEARNHUB INSTRUCTOR" : "LEARNHUB ADMIN";

  return (
    <main className="admin-dashboard min-h-screen">
      <div className="admin-shell">
        <aside className="admin-sidebar" aria-label="Dashboard navigation">
          <Link className="admin-brand" href={brandHref}>
            <span className="admin-brand-mark" aria-hidden="true">
              LH
            </span>
            <span>
              <strong>LearnHub</strong>
              <small>{brandSub}</small>
            </span>
          </Link>
          <nav className="admin-side-nav" aria-label="Dashboard sections">
            {navigation.map((item) => {
              const isActive = item.id === activeSection;
              return (
                <Link
                  className={`admin-nav-link${isActive ? " admin-nav-link-active" : ""}`}
                  href={item.href}
                  key={item.id}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <Link className="admin-back-link" href="/">
            <span aria-hidden="true">←</span>
            Back to LearnHub
          </Link>
        </aside>

        <section className="admin-workspace" aria-labelledby="admin-page-title">
          <header className="admin-page-header">
            <div>
              <span className="eyebrow">{eyebrowText}</span>
              <h1 id="admin-page-title">{title}</h1>
              <p>{description}</p>
            </div>
            <span className="admin-role-badge">{roleBadge}</span>
          </header>
          {children}
        </section>
      </div>
    </main>
  );
}
