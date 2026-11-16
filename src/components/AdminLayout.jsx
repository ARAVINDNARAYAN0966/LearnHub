import React from "react";
import Link from "next/link";

const navigation = [
  { id: "overview", label: "Overview", href: "/admin", icon: "▦" },
  { id: "courses", label: "Courses", href: "/admin/courses", icon: "◫" },
  {
    id: "curriculum",
    label: "Curriculum tools",
    href: "/admin/courses",
    icon: "☷",
  },
];

export default function AdminLayout({
  activeSection = "overview",
  title,
  description,
  children,
}) {
  return (
    <main className="admin-dashboard min-h-screen">
      <div className="admin-shell">
        <aside className="admin-sidebar" aria-label="Admin navigation">
          <Link className="admin-brand" href="/admin">
            <span className="admin-brand-mark" aria-hidden="true">
              LH
            </span>
            <span>
              <strong>LearnHub</strong>
              <small>ADMIN WORKSPACE</small>
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
              <span className="eyebrow">LEARNHUB ADMIN</span>
              <h1 id="admin-page-title">{title}</h1>
              <p>{description}</p>
            </div>
            <span className="admin-role-badge">ADMIN</span>
          </header>
          {children}
        </section>
      </div>
    </main>
  );
}
