import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../src/models/Course.js", () => ({
  default: { countDocuments: vi.fn() },
}));
vi.mock("../src/models/Enrollment.js", () => ({
  default: { countDocuments: vi.fn() },
}));
vi.mock("../src/lib/mongodb.js", () => ({
  connectToDatabase: vi.fn(),
}));
vi.mock("next/server", () => ({
  connection: vi.fn(),
}));

import Course from "../src/models/Course.js";
import Enrollment from "../src/models/Enrollment.js";
import { connectToDatabase } from "../src/lib/mongodb.js";
import { connection } from "next/server";
import {
  getAdminDashboardRedirect,
} from "../src/lib/curriculum-policy.js";
import { getAdminDashboardStats } from "../src/lib/admin-dashboard-data.js";
import AdminDashboardView, {
  AdminAccessError,
  AdminAccessLoading,
  AdminDashboardError,
  AdminDashboardLoading,
} from "../src/components/AdminDashboardView.jsx";

function render(element) {
  return renderToStaticMarkup(element);
}

describe("admin dashboard authorization", () => {
  it("redirects unauthenticated users to login", () => {
    expect(getAdminDashboardRedirect(null)).toBe("/login");
  });

  it.each(["student", "instructor", "ADMIN"])(
    "redirects users whose database role is %s to the student dashboard",
    (role) => {
      expect(getAdminDashboardRedirect({ id: "user-id", role })).toBe(
        "/dashboard",
      );
    },
  );

  it("allows only a user with the exact admin role", () => {
    expect(getAdminDashboardRedirect({ id: "admin-id", role: "admin" })).toBe(
      null,
    );
  });
});

describe("admin dashboard statistics", () => {
  beforeEach(() => {
    Course.countDocuments.mockReset();
    Enrollment.countDocuments.mockReset();
    connectToDatabase.mockReset().mockResolvedValue(undefined);
    connection.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("counts courses, published courses, drafts, and enrollments from MongoDB", async () => {
    Course.countDocuments
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(5);
    Enrollment.countDocuments.mockResolvedValueOnce(23);

    await expect(getAdminDashboardStats()).resolves.toEqual({
      totalCourses: 8,
      publishedCourses: 5,
      draftCourses: 3,
      totalEnrollments: 23,
    });
    expect(connection).toHaveBeenCalledOnce();
    expect(connectToDatabase).toHaveBeenCalledOnce();
    expect(Course.countDocuments).toHaveBeenNthCalledWith(1, {});
    expect(Course.countDocuments).toHaveBeenNthCalledWith(2, {
      published: true,
    });
    expect(Enrollment.countDocuments).toHaveBeenCalledOnce();
  });

  it("returns zero counts for an empty database", async () => {
    Course.countDocuments.mockResolvedValue(0);
    Enrollment.countDocuments.mockResolvedValue(0);

    const stats = await getAdminDashboardStats();

    expect(stats).toEqual({
      totalCourses: 0,
      publishedCourses: 0,
      draftCourses: 0,
      totalEnrollments: 0,
    });
    expect(
      render(
        createElement(AdminDashboardView, {
          stats,
        }),
      ),
    ).toContain("No courses have been created yet.");
  });

  it("propagates database failures for the page to render an error state", async () => {
    connectToDatabase.mockRejectedValueOnce(
      new Error("database unavailable"),
    );

    await expect(getAdminDashboardStats()).rejects.toThrow(
      "database unavailable",
    );
    expect(Course.countDocuments).not.toHaveBeenCalled();
  });
});

describe("admin dashboard loading and error states", () => {
  it("denies access with an explicit error when the session cannot be verified", () => {
    const html = render(createElement(AdminAccessError));

    expect(html).toContain("Administrator access could not be verified");
    expect(html).toContain('role="alert"');
  });

  it("renders a neutral access-check loading state", () => {
    expect(render(createElement(AdminAccessLoading))).toContain(
      "Verifying administrator access...",
    );
  });

  it("renders a statistics loading state", () => {
    expect(render(createElement(AdminDashboardLoading))).toContain(
      "Loading dashboard statistics...",
    );
  });

  it("renders a database error with a retry link", () => {
    const html = render(createElement(AdminDashboardError));

    expect(html).toContain("Dashboard data is unavailable");
    expect(html).toContain('href="/admin"');
    expect(html).toContain('role="alert"');
  });
});
