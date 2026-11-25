/**
 * Tests for GET /api/courses/[courseId]/certificate
 * and  GET /api/certificates/[certificateId]
 *
 * Uses vitest + vi.mock to avoid real DB connections.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Shared mock factories ─────────────────────────────────────────────────────

vi.mock("../src/lib/mongodb", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
  isDatabaseConnectionError: vi.fn((e) => e?.__isDbError === true),
}));

vi.mock("../src/lib/auth", () => ({
  getCurrentUser: vi.fn().mockResolvedValue(null),
}));

vi.mock("../src/lib/auth-http", () => ({
  authJson: vi.fn((body, status = 200) => ({ body, status })),
  logAuthFailure: vi.fn(),
}));

vi.mock("../src/lib/lesson-progress", () => ({
  getProgressSummary: vi.fn(),
}));

vi.mock("../src/models/Course", () => ({
  default: { findById: vi.fn() },
}));

vi.mock("../src/models/Enrollment", () => ({
  default: { findOne: vi.fn() },
}));

vi.mock("../src/models/Certificate", () => ({
  default: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

// ── Constants ─────────────────────────────────────────────────────────────────

const VALID_COURSE_ID = "c".repeat(24);
const VALID_USER_ID = "d".repeat(24);
const FAKE_CERT = {
  certificateId: "LH-TESTCO-ABCD1234",
  recipientName: "Alice",
  courseTitle: "Test Course",
  instructorName: "Bob",
  issuedAt: new Date("2024-06-01"),
  createdAt: new Date("2024-06-01"),
};

function makeParams(id) {
  return { params: Promise.resolve({ courseId: id }) };
}

function makeCertParams(id) {
  return { params: Promise.resolve({ certificateId: id }) };
}

// ── GET /api/courses/[courseId]/certificate ────────────────────────────────────

describe("GET /api/courses/[courseId]/certificate", () => {
  async function getHandler() {
    const mod = await import(
      "../src/app/api/courses/[courseId]/certificate/route.js"
    );
    return mod.GET;
  }

  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    const { getCurrentUser } = await import("../src/lib/auth");
    getCurrentUser.mockResolvedValue(null);

    const GET = await getHandler();
    const result = await GET({}, makeParams(VALID_COURSE_ID));
    expect(result.status).toBe(401);
    expect(result.body.error).toMatch(/authentication required/i);
  });

  it("returns 400 for an invalid courseId", async () => {
    const { getCurrentUser } = await import("../src/lib/auth");
    getCurrentUser.mockResolvedValue({ id: VALID_USER_ID, name: "Alice" });

    const GET = await getHandler();
    const result = await GET({}, makeParams("not-valid"));
    expect(result.status).toBe(400);
    expect(result.body.error).toMatch(/valid course ID/i);
  });

  it("returns 404 when course does not exist", async () => {
    const { getCurrentUser } = await import("../src/lib/auth");
    getCurrentUser.mockResolvedValue({ id: VALID_USER_ID, name: "Alice" });

    const Course = (await import("../src/models/Course")).default;
    Course.findById.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });

    const GET = await getHandler();
    const result = await GET({}, makeParams(VALID_COURSE_ID));
    expect(result.status).toBe(404);
  });

  it("returns 403 when user is not enrolled", async () => {
    const { getCurrentUser } = await import("../src/lib/auth");
    getCurrentUser.mockResolvedValue({ id: VALID_USER_ID, name: "Alice" });

    const Course = (await import("../src/models/Course")).default;
    Course.findById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: VALID_COURSE_ID,
        title: "Test",
        slug: "test",
        instructor: "Bob",
      }),
    });

    const Enrollment = (await import("../src/models/Enrollment")).default;
    Enrollment.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });

    const GET = await getHandler();
    const result = await GET({}, makeParams(VALID_COURSE_ID));
    expect(result.status).toBe(403);
    expect(result.body.error).toMatch(/enrolled/i);
  });

  it("returns 403 when course is not 100% complete", async () => {
    const { getCurrentUser } = await import("../src/lib/auth");
    getCurrentUser.mockResolvedValue({ id: VALID_USER_ID, name: "Alice" });

    const Course = (await import("../src/models/Course")).default;
    Course.findById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: VALID_COURSE_ID,
        title: "Test",
        slug: "test",
        instructor: "Bob",
      }),
    });

    const Enrollment = (await import("../src/models/Enrollment")).default;
    Enrollment.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: "enr1", status: "active" }),
    });

    const { getProgressSummary } = await import("../src/lib/lesson-progress");
    getProgressSummary.mockResolvedValue({
      totalPublishedLessons: 10,
      completedLessons: 7,
      progressPercentage: 70,
    });

    const GET = await getHandler();
    const result = await GET({}, makeParams(VALID_COURSE_ID));
    expect(result.status).toBe(403);
    expect(result.body.progressPercentage).toBe(70);
    expect(result.body.error).toMatch(/complete all/i);
  });

  it("returns 403 when course has no published lessons", async () => {
    const { getCurrentUser } = await import("../src/lib/auth");
    getCurrentUser.mockResolvedValue({ id: VALID_USER_ID, name: "Alice" });

    const Course = (await import("../src/models/Course")).default;
    Course.findById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: VALID_COURSE_ID,
        title: "Test",
        slug: "test",
        instructor: "Bob",
      }),
    });

    const Enrollment = (await import("../src/models/Enrollment")).default;
    Enrollment.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: "enr1", status: "active" }),
    });

    const { getProgressSummary } = await import("../src/lib/lesson-progress");
    getProgressSummary.mockResolvedValue({
      totalPublishedLessons: 0,
      completedLessons: 0,
      progressPercentage: 0,
    });

    const GET = await getHandler();
    const result = await GET({}, makeParams(VALID_COURSE_ID));
    expect(result.status).toBe(403);
  });

  it("generates a new certificate for 100% completion", async () => {
    const { getCurrentUser } = await import("../src/lib/auth");
    getCurrentUser.mockResolvedValue({ id: VALID_USER_ID, name: "Alice" });

    const Course = (await import("../src/models/Course")).default;
    Course.findById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: VALID_COURSE_ID,
        title: "Test Course",
        slug: "test-course",
        instructor: "Bob",
      }),
    });

    const Enrollment = (await import("../src/models/Enrollment")).default;
    Enrollment.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: "enr1", status: "completed" }),
    });

    const { getProgressSummary } = await import("../src/lib/lesson-progress");
    getProgressSummary.mockResolvedValue({
      totalPublishedLessons: 5,
      completedLessons: 5,
      progressPercentage: 100,
    });

    const Certificate = (await import("../src/models/Certificate")).default;
    Certificate.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    });
    Certificate.create.mockResolvedValue(FAKE_CERT);

    const GET = await getHandler();
    const result = await GET({}, makeParams(VALID_COURSE_ID));
    expect(result.status).toBe(200);
    expect(result.body.certificate.certificateId).toBe(FAKE_CERT.certificateId);
    expect(result.body.certificate.recipientName).toBe("Alice");
  });

  it("returns existing certificate without duplicating on second request", async () => {
    const { getCurrentUser } = await import("../src/lib/auth");
    getCurrentUser.mockResolvedValue({ id: VALID_USER_ID, name: "Alice" });

    const Course = (await import("../src/models/Course")).default;
    Course.findById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: VALID_COURSE_ID,
        title: "Test Course",
        slug: "test-course",
        instructor: "Bob",
      }),
    });

    const Enrollment = (await import("../src/models/Enrollment")).default;
    Enrollment.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: "enr1", status: "completed" }),
    });

    const { getProgressSummary } = await import("../src/lib/lesson-progress");
    getProgressSummary.mockResolvedValue({
      totalPublishedLessons: 5,
      completedLessons: 5,
      progressPercentage: 100,
    });

    const Certificate = (await import("../src/models/Certificate")).default;
    // findOne returns existing cert — create must NOT be called
    Certificate.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue(FAKE_CERT),
    });
    Certificate.create.mockRejectedValue(new Error("Should not be called"));

    const GET = await getHandler();
    const result = await GET({}, makeParams(VALID_COURSE_ID));
    expect(result.status).toBe(200);
    expect(Certificate.create).not.toHaveBeenCalled();
    expect(result.body.certificate.certificateId).toBe(FAKE_CERT.certificateId);
  });

  it("scopes certificate queries strictly to the authenticated student, preventing access to other students' certificates", async () => {
    const OTHER_USER_ID = "e".repeat(24);
    const { getCurrentUser } = await import("../src/lib/auth");
    getCurrentUser.mockResolvedValue({ id: VALID_USER_ID, name: "Alice" });

    const Course = (await import("../src/models/Course")).default;
    Course.findById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: VALID_COURSE_ID,
        title: "Test Course",
        slug: "test-course",
        instructor: "Bob",
      }),
    });

    const Enrollment = (await import("../src/models/Enrollment")).default;
    Enrollment.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: "enr1", status: "completed" }),
    });

    const { getProgressSummary } = await import("../src/lib/lesson-progress");
    getProgressSummary.mockResolvedValue({
      totalPublishedLessons: 5,
      completedLessons: 5,
      progressPercentage: 100,
    });

    const Certificate = (await import("../src/models/Certificate")).default;
    Certificate.findOne.mockImplementation((query) => {
      if (query.user !== VALID_USER_ID) {
        throw new Error("Unauthorized query scope detected");
      }
      return {
        lean: vi.fn().mockResolvedValue(FAKE_CERT),
      };
    });

    const GET = await getHandler();
    const result = await GET({}, makeParams(VALID_COURSE_ID));
    expect(result.status).toBe(200);
    expect(Certificate.findOne).toHaveBeenCalledWith({
      user: VALID_USER_ID,
      course: VALID_COURSE_ID,
    });
    expect(Certificate.findOne).not.toHaveBeenCalledWith(
      expect.objectContaining({ user: OTHER_USER_ID }),
    );
  });
});

// ── GET /api/certificates/[certificateId] ─────────────────────────────────────

describe("GET /api/certificates/[certificateId]", () => {
  async function getHandler() {
    const mod = await import(
      "../src/app/api/certificates/[certificateId]/route.js"
    );
    return mod.GET;
  }

  beforeEach(() => vi.clearAllMocks());

  it("returns 400 for an empty certificate ID", async () => {
    const GET = await getHandler();
    const result = await GET({}, makeCertParams(""));
    expect(result.status).toBe(400);
  });

  it("returns 400 for a certificate ID that is too short", async () => {
    const GET = await getHandler();
    const result = await GET({}, makeCertParams("AB"));
    expect(result.status).toBe(400);
  });

  it("returns 404 for a non-existent certificate", async () => {
    const Certificate = (await import("../src/models/Certificate")).default;
    Certificate.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    });

    const GET = await getHandler();
    const result = await GET({}, makeCertParams("LH-TESTCO-NONEXISTENT"));
    expect(result.status).toBe(404);
    expect(result.body.error).toMatch(/certificate not found/i);
  });

  it("returns 200 with certificate data for a valid ID", async () => {
    const Certificate = (await import("../src/models/Certificate")).default;
    Certificate.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue(FAKE_CERT),
    });

    const GET = await getHandler();
    const result = await GET({}, makeCertParams("LH-TESTCO-ABCD1234"));
    expect(result.status).toBe(200);
    expect(result.body.valid).toBe(true);
    expect(result.body.certificate.certificateId).toBe(FAKE_CERT.certificateId);
    expect(result.body.certificate.recipientName).toBe("Alice");
  });

  it("normalises the certificate ID to uppercase before lookup", async () => {
    const Certificate = (await import("../src/models/Certificate")).default;
    Certificate.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue(FAKE_CERT),
    });

    const GET = await getHandler();
    await GET({}, makeCertParams("lh-testco-abcd1234"));

    // findOne should have been called with the uppercased ID
    expect(Certificate.findOne).toHaveBeenCalledWith({
      certificateId: "LH-TESTCO-ABCD1234",
    });
  });

  it("never exposes private user information in public verification response", async () => {
    const Certificate = (await import("../src/models/Certificate")).default;
    Certificate.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        ...FAKE_CERT,
        user: "internal_user_id_12345",
        userEmail: "private@example.com",
        passwordHash: "$2b$12$secretpasswordhash",
      }),
    });

    const GET = await getHandler();
    const result = await GET({}, makeCertParams("LH-TESTCO-ABCD1234"));
    expect(result.status).toBe(200);
    expect(result.body.certificate.email).toBeUndefined();
    expect(result.body.certificate.userEmail).toBeUndefined();
    expect(result.body.certificate.password).toBeUndefined();
    expect(result.body.certificate.passwordHash).toBeUndefined();
    expect(result.body.certificate.user).toBeUndefined();
    expect(result.body.certificate._id).toBeUndefined();
  });
});

// ── GET /api/certificates/[certificateId]/download ───────────────────────────

describe("GET /api/certificates/[certificateId]/download", () => {
  async function getDownloadHandler() {
    const mod = await import(
      "../src/app/api/certificates/[certificateId]/download/route.js"
    );
    return mod.GET;
  }

  beforeEach(() => vi.clearAllMocks());

  it("returns 400 for an invalid or short certificate ID", async () => {
    const GET = await getDownloadHandler();
    const result = await GET({}, makeCertParams("12"));
    expect(result.status).toBe(400);
    const body = await result.json();
    expect(body.error).toMatch(/valid certificate ID/i);
  });

  it("returns 404 when certificate is not found", async () => {
    const Certificate = (await import("../src/models/Certificate")).default;
    Certificate.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    });

    const GET = await getDownloadHandler();
    const result = await GET({}, makeCertParams("LH-TESTCO-NOTFOUND"));
    expect(result.status).toBe(404);
  });

  it("returns 200 with application/pdf and valid PDF binary data", async () => {
    const Certificate = (await import("../src/models/Certificate")).default;
    Certificate.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue(FAKE_CERT),
    });

    const GET = await getDownloadHandler();
    const result = await GET(
      { headers: { get: () => "localhost:3000" } },
      makeCertParams("LH-TESTCO-ABCD1234"),
    );

    expect(result.status).toBe(200);
    expect(result.headers.get("Content-Type")).toBe("application/pdf");
    expect(result.headers.get("Content-Disposition")).toContain(
      "learnhub-certificate-LH-TESTCO-ABCD1234.pdf",
    );

    const arrayBuf = await result.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    expect(buf.toString("utf8", 0, 8)).toBe("%PDF-1.4");
  });
});
