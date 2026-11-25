"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Logo from "./Logo";
import LogoutButton from "./LogoutButton";
import ThemeToggle from "./ThemeToggle";

const links = [
  { label: "Home", href: "/" },
  { label: "Courses", href: "/courses" },
  { label: "Categories", href: "/courses#categories" },
  { label: "Feedback", href: "/feedback" },
  { label: "About", href: "/#about" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    let controller;
    let active = true;

    function refreshCurrentUser() {
      controller?.abort();
      controller = new AbortController();

      fetch("/api/auth/me", {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) return null;
          const result = await response.json();
          return result.user || null;
        })
        .then((user) => {
          if (active) setCurrentUser(user);
        })
        .catch((error) => {
          if (active && error.name !== "AbortError") setCurrentUser(null);
        });
    }

    refreshCurrentUser();
    window.addEventListener("learnhub:auth-changed", refreshCurrentUser);

    return () => {
      active = false;
      controller?.abort();
      window.removeEventListener("learnhub:auth-changed", refreshCurrentUser);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    function handleResize() {
      if (window.innerWidth > 680) setMenuOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousDocumentOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [menuOpen]);

  return (
    <header className="site-header">
      <nav className="navbar page-container" aria-label="Main navigation">
        <Logo />
        <div
          className={`nav-content${menuOpen ? " nav-content-open" : ""}`}
          id="site-navigation"
        >
          <div className="nav-links">
            {links.map((link) => (
              <Link
                href={link.href}
                key={link.label}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="nav-actions">
            {currentUser ? (
              <>
                {currentUser.role === "admin" && (
                  <Link
                    className="nav-login font-semibold text-amber-600 dark:text-amber-400"
                    href="/admin"
                    onClick={() => setMenuOpen(false)}
                  >
                    Admin
                  </Link>
                )}
                {currentUser.role === "instructor" && (
                  <Link
                    className="nav-login font-semibold text-amber-600 dark:text-amber-400"
                    href="/instructor"
                    onClick={() => setMenuOpen(false)}
                  >
                    Teaching
                  </Link>
                )}
                <Link
                  className="nav-login"
                  href="/dashboard"
                  onClick={() => setMenuOpen(false)}
                >
                  My learning
                </Link>
                <Link
                  className="nav-login inline-flex items-center gap-1.5"
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  title="My Profile"
                >
                  {currentUser.avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name || "Profile"}
                      className="w-5 h-5 rounded-full object-cover inline-block"
                    />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold inline-flex items-center justify-center">
                      {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
                    </span>
                  )}
                  <span>Profile</span>
                </Link>
                <LogoutButton />
              </>
            ) : (
              <>
                <Link
                  className="nav-login"
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  className="button button-small button-primary"
                  href="/register"
                  onClick={() => setMenuOpen(false)}
                >
                  Get started <span aria-hidden="true">↗</span>
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="nav-tools">
          <ThemeToggle />
          <button
            type="button"
            className="menu-toggle"
            aria-controls="site-navigation"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
          </button>
        </div>
        {menuOpen && (
          <button
            type="button"
            className="nav-backdrop"
            aria-label="Close navigation menu"
            onClick={() => setMenuOpen(false)}
          />
        )}
      </nav>
    </header>
  );
}
