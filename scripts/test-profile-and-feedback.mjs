import mongoose from "mongoose";
import { SignJWT } from "jose";

async function createToken(user, secret) {
  const sessionSecretBytes = new TextEncoder().encode(secret);
  return await new SignJWT({ tv: user.tokenVersion ?? 0 })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user._id.toString())
    .setIssuer("learnhub")
    .setAudience("learnhub-app")
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(sessionSecretBytes);
}

function getHeaders(token) {
  const h = {
    "Content-Type": "application/json",
    Origin: "http://localhost:3000",
    Host: "localhost:3000",
  };
  if (token) {
    h.Cookie = `learnhub_session=${token}`;
  }
  return h;
}

async function runTests() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Missing SESSION_SECRET");

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB:", mongoose.connection.name);

  const usersCol = mongoose.connection.db.collection("users");
  const student = await usersCol.findOne({ email: "qa_v2_student@learnhub.test" });
  const instructor = await usersCol.findOne({ email: "qa_v2_instructor@learnhub.test" });
  const admin = await usersCol.findOne({ email: "qa_v2_admin@learnhub.test" });

  if (!student || !instructor || !admin) {
    throw new Error("Missing required QA test users (student, instructor, admin)!");
  }

  const studentToken = await createToken(student, secret);
  const instructorToken = await createToken(instructor, secret);
  const adminToken = await createToken(admin, secret);

  console.log("Tokens generated successfully for student, instructor, and admin.");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✕ FAIL: ${message}`);
      failed++;
    }
  }

  // =========================================================================
  // SECTION 1: PROFILE TESTS
  // =========================================================================
  console.log("\n=================== SECTION 1: PROFILE API ===================");

  // 1.1 Unauthenticated Profile Check
  {
    const res = await fetch("http://localhost:3000/api/profile", {
      headers: getHeaders(null),
    });
    assert(res.status === 401, "Unauthenticated GET /api/profile returns 401");
  }

  // 1.2 Student Profile GET
  let studentProfile;
  {
    const res = await fetch("http://localhost:3000/api/profile", {
      headers: getHeaders(studentToken),
    });
    const data = await res.json();
    assert(res.status === 200, "Student GET /api/profile returns 200");
    assert(data.profile?.email === student.email, "Profile email matches student email");
    assert(data.profile?.role === "student", "Profile role is student");
    assert("studentData" in data.profile, "Student data section present");
    assert(Array.isArray(data.profile.studentData.recentCourses), "Student recent courses array present");
    studentProfile = data.profile;
  }

  // 1.3 Instructor Profile GET
  {
    const res = await fetch("http://localhost:3000/api/profile", {
      headers: getHeaders(instructorToken),
    });
    const data = await res.json();
    assert(res.status === 200, "Instructor GET /api/profile returns 200");
    assert(data.profile?.role === "instructor", "Profile role is instructor");
    assert("instructorData" in data.profile, "Instructor data section present");
    assert(Array.isArray(data.profile.instructorData.courses), "Instructor authored courses array present");
  }

  // 1.4 Admin Profile GET
  {
    const res = await fetch("http://localhost:3000/api/profile", {
      headers: getHeaders(adminToken),
    });
    const data = await res.json();
    assert(res.status === 200, "Admin GET /api/profile returns 200");
    assert(data.profile?.role === "admin", "Profile role is admin");
    assert("adminData" in data.profile, "Admin data section present");
    assert(typeof data.profile.adminData.totalUsers === "number", "Admin system totalUsers count present");
  }

  // 1.5 Role Tampering / Mass-Assignment Rejection Test
  {
    const res = await fetch("http://localhost:3000/api/profile", {
      method: "PATCH",
      headers: getHeaders(studentToken),
      body: JSON.stringify({ role: "admin" }),
    });
    const data = await res.json();
    assert(res.status === 400, "Attempt to mutate role is blocked with 400 Bad Request");
    assert(data.error?.includes("cannot be modified"), "Error message specifies immutable field");
  }

  // 1.6 Email Tampering Rejection Test
  {
    const res = await fetch("http://localhost:3000/api/profile", {
      method: "PATCH",
      headers: getHeaders(studentToken),
      body: JSON.stringify({ email: "hacker@test.com" }),
    });
    assert(res.status === 400, "Attempt to mutate email is blocked with 400 Bad Request");
  }

  // 1.7 URL Validation Test
  {
    const res = await fetch("http://localhost:3000/api/profile", {
      method: "PATCH",
      headers: getHeaders(studentToken),
      body: JSON.stringify({ website: "invalid-url-without-protocol" }),
    });
    assert(res.status === 400, "Invalid website URL format rejected with 400 Bad Request");
  }

  // 1.8 Valid Profile Update (PATCH)
  {
    const updatePayload = {
      name: "QA Student Learner",
      headline: "Aspiring Full Stack Cloud Developer",
      bio: "Learning Next.js, MERN stack, and distributed systems on LearnHub.",
      location: "Bengaluru, India",
      website: "https://learner.example.com",
      github: "https://github.com/qastudent",
      linkedin: "https://linkedin.com/in/qastudent",
    };

    const res = await fetch("http://localhost:3000/api/profile", {
      method: "PATCH",
      headers: getHeaders(studentToken),
      body: JSON.stringify(updatePayload),
    });
    const data = await res.json();
    assert(res.status === 200, "Valid PATCH /api/profile returns 200");
    assert(data.profile?.name === "QA Student Learner", "Updated name matches");
    assert(data.profile?.headline === "Aspiring Full Stack Cloud Developer", "Updated headline matches");
    assert(data.profile?.location === "Bengaluru, India", "Updated location matches");
    assert(data.profile?.website === "https://learner.example.com", "Updated website matches");
  }

  // =========================================================================
  // SECTION 2: PLATFORM FEEDBACK API
  // =========================================================================
  console.log("\n=================== SECTION 2: FEEDBACK API ===================");

  // 2.1 Unauthenticated Submission Rejection
  {
    const res = await fetch("http://localhost:3000/api/feedback", {
      method: "POST",
      headers: getHeaders(null),
      body: JSON.stringify({
        category: "general",
        rating: 5,
        title: "Test unauthenticated feedback",
        message: "This should be rejected because user is not signed in.",
      }),
    });
    assert(res.status === 401, "Unauthenticated POST /api/feedback returns 401");
  }

  // 2.2 Validation: Invalid Category
  {
    const res = await fetch("http://localhost:3000/api/feedback", {
      method: "POST",
      headers: getHeaders(studentToken),
      body: JSON.stringify({
        category: "not-a-category",
        rating: 5,
        title: "Test category validation",
        message: "Testing invalid category validation.",
      }),
    });
    assert(res.status === 400, "Invalid category rejected with 400 Bad Request");
  }

  // 2.3 Validation: Invalid Rating (< 1 or > 5 or non-integer)
  {
    const res = await fetch("http://localhost:3000/api/feedback", {
      method: "POST",
      headers: getHeaders(studentToken),
      body: JSON.stringify({
        category: "bug",
        rating: 6,
        title: "Test rating validation",
        message: "Testing out-of-range rating validation.",
      }),
    });
    assert(res.status === 400, "Rating > 5 rejected with 400 Bad Request");
  }

  // 2.4 Validation: Short Title / Message
  {
    const res = await fetch("http://localhost:3000/api/feedback", {
      method: "POST",
      headers: getHeaders(studentToken),
      body: JSON.stringify({
        category: "feature",
        rating: 4,
        title: "Hi",
        message: "Short",
      }),
    });
    assert(res.status === 400, "Short title/message rejected with 400 Bad Request");
  }

  // 2.5 Successful Feedback Submission by Student
  let createdFeedbackId;
  const feedbackTitle = `Automated QA Feedback ${Date.now()}`;
  {
    const res = await fetch("http://localhost:3000/api/feedback", {
      method: "POST",
      headers: getHeaders(studentToken),
      body: JSON.stringify({
        category: "feature",
        rating: 5,
        title: feedbackTitle,
        message: "We would love an interactive dark mode code playground directly in lesson articles!",
      }),
    });
    const data = await res.json();
    assert(res.status === 201, "Valid POST /api/feedback returns 201 Created");
    assert(data.feedback?.id, "Response includes created feedback ID");
    assert(data.feedback?.status === "submitted", "Initial feedback status is 'submitted'");
    assert(data.feedback?.rating === 5, "Rating is recorded as 5");
    createdFeedbackId = data.feedback?.id;
  }

  // 2.6 Rate Limiting / Double-Click Spam Protection
  {
    const res = await fetch("http://localhost:3000/api/feedback", {
      method: "POST",
      headers: getHeaders(studentToken),
      body: JSON.stringify({
        category: "general",
        rating: 4,
        title: "Spam check immediate second submission",
        message: "This should trigger the 8-second anti-spam rate limiter.",
      }),
    });
    assert(res.status === 429, "Immediate repeat submission triggers 429 Too Many Requests");
  }

  // 2.7 User's Own Feedback History (GET /api/feedback/mine)
  {
    const res = await fetch("http://localhost:3000/api/feedback/mine", {
      headers: getHeaders(studentToken),
    });
    const data = await res.json();
    assert(res.status === 200, "GET /api/feedback/mine returns 200");
    assert(Array.isArray(data.feedback), "User feedback history is an array");
    const myItem = data.feedback.find((f) => f.id === createdFeedbackId);
    assert(Boolean(myItem), "Newly submitted feedback appears in user's history");
    assert(myItem?.title === feedbackTitle, "Feedback title matches in user history");
  }

  // 2.8 Instructor's History Isolation Check
  {
    const res = await fetch("http://localhost:3000/api/feedback/mine", {
      headers: getHeaders(instructorToken),
    });
    const data = await res.json();
    assert(res.status === 200, "Instructor GET /api/feedback/mine returns 200");
    const hasStudentItem = data.feedback.some((f) => f.id === createdFeedbackId);
    assert(!hasStudentItem, "Instructor CANNOT see student's private feedback (Isolation confirmed)");
  }

  // =========================================================================
  // SECTION 3: ADMIN FEEDBACK DASHBOARD & MANAGEMENT
  // =========================================================================
  console.log("\n=================== SECTION 3: ADMIN FEEDBACK MANAGEMENT ===================");

  // 3.1 Non-Admin Access Forbidden (403)
  {
    const res = await fetch("http://localhost:3000/api/admin/feedback", {
      headers: getHeaders(studentToken),
    });
    assert(res.status === 403, "Student access to /api/admin/feedback returns 403 Forbidden");
  }
  {
    const res = await fetch("http://localhost:3000/api/admin/feedback", {
      headers: getHeaders(instructorToken),
    });
    assert(res.status === 403, "Instructor access to /api/admin/feedback returns 403 Forbidden");
  }

  // 3.2 Admin List Feedback & Stats
  {
    const res = await fetch("http://localhost:3000/api/admin/feedback", {
      headers: getHeaders(adminToken),
    });
    const data = await res.json();
    assert(res.status === 200, "Admin GET /api/admin/feedback returns 200");
    assert(Array.isArray(data.feedback), "Admin receives feedback items array");
    assert(typeof data.stats?.totalCount === "number", "Admin stats include totalCount");
    assert(typeof data.stats?.averageRating === "string", "Admin stats include averageRating");
    assert(typeof data.stats?.byStatus === "object", "Admin stats include byStatus breakdown");
    assert(typeof data.stats?.byCategory === "object", "Admin stats include byCategory breakdown");
  }

  // 3.3 Admin Filter & Search
  {
    const res = await fetch(`http://localhost:3000/api/admin/feedback?category=feature&status=submitted`, {
      headers: getHeaders(adminToken),
    });
    const data = await res.json();
    assert(res.status === 200, "Admin query with category and status filters returns 200");
    const match = data.feedback.find((f) => f.id === createdFeedbackId);
    assert(Boolean(match), "Filtered query returns the created feedback item");
  }

  // 3.4 Non-Admin Cannot PATCH Admin Feedback (403)
  {
    const res = await fetch(`http://localhost:3000/api/admin/feedback/${createdFeedbackId}`, {
      method: "PATCH",
      headers: getHeaders(studentToken),
      body: JSON.stringify({ status: "resolved" }),
    });
    assert(res.status === 403, "Non-admin cannot PATCH /api/admin/feedback/[id] (403 Forbidden)");
  }

  // 3.5 Admin Updates Status to 'under_review' and Adds Response
  {
    const res = await fetch(`http://localhost:3000/api/admin/feedback/${createdFeedbackId}`, {
      method: "PATCH",
      headers: getHeaders(adminToken),
      body: JSON.stringify({
        status: "under_review",
        adminResponse: "Great suggestion! The engineering team is evaluating Monaco editor integration for lesson articles.",
      }),
    });
    const data = await res.json();
    assert(res.status === 200, "Admin PATCH /api/admin/feedback/[id] returns 200");
    assert(data.feedback?.status === "under_review", "Status updated to 'under_review'");
    assert(data.feedback?.adminResponse?.includes("Monaco editor"), "Admin response text recorded");
    assert(Boolean(data.feedback?.respondedAt), "RespondedAt timestamp populated");
  }

  // 3.6 Admin Resolves Ticket
  {
    const res = await fetch(`http://localhost:3000/api/admin/feedback/${createdFeedbackId}`, {
      method: "PATCH",
      headers: getHeaders(adminToken),
      body: JSON.stringify({
        status: "resolved",
      }),
    });
    const data = await res.json();
    assert(res.status === 200, "Admin marks ticket as 'resolved' successfully");
    assert(data.feedback?.status === "resolved", "Status is now 'resolved'");
  }

  // 3.7 Verify Student Sees the Admin's Response and Updated Status
  {
    const res = await fetch("http://localhost:3000/api/feedback/mine", {
      headers: getHeaders(studentToken),
    });
    const data = await res.json();
    const updatedItem = data.feedback.find((f) => f.id === createdFeedbackId);
    assert(updatedItem?.status === "resolved", "Student sees resolved status");
    assert(updatedItem?.adminResponse?.includes("Monaco editor"), "Student sees official admin response");
    assert(Boolean(updatedItem?.respondedAt), "Student sees response timestamp");
  }

  console.log(`\n=================== TEST RESULTS ===================`);
  console.log(`Total Passed: ${passed}`);
  console.log(`Total Failed: ${failed}`);

  await mongoose.disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
