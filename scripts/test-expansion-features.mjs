import mongoose from "mongoose";
import { SignJWT } from "jose";

async function runTests() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Missing SESSION_SECRET");

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to DB:", mongoose.connection.name);

  const studentUser = await mongoose.connection.db.collection("users").findOne({
    email: "qa_v2_student@learnhub.test",
  });
  if (!studentUser) throw new Error("QA Student user not found!");
  console.log("Found QA Student:", studentUser.email, "ID:", studentUser._id.toString());

  const course = await mongoose.connection.db.collection("courses").findOne({
    slug: "html-css-javascript-foundations",
  });
  if (!course) throw new Error("Course html-css-javascript-foundations not found!");
  console.log("Found Course:", course.title, "ID:", course._id.toString());

  const lessons = course.modules[0].lessons;
  console.log(`Found ${lessons.length} lessons in Module 01:`);
  lessons.forEach((l, i) => console.log(`  [Lesson ${i + 1}] (${l.type}) ${l.title} (ID: ${l._id})`));

  // Generate session token for QA student
  const sessionSecretBytes = new TextEncoder().encode(secret);
  const token = await new SignJWT({ tv: studentUser.tokenVersion ?? 0 })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(studentUser._id.toString())
    .setIssuer("learnhub")
    .setAudience("learnhub-app")
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(sessionSecretBytes);

  const headers = {
    Cookie: `learnhub_session=${token}`,
    "Content-Type": "application/json",
    Origin: "http://localhost:3000",
    Host: "localhost:3000",
  };

  const courseId = course._id.toString();

  // 1. Enroll in course
  console.log("\n--- Step 1: Student Enrollment ---");
  const enrollRes = await fetch("http://localhost:3000/api/enrollments", {
    method: "POST",
    headers,
    body: JSON.stringify({ courseId }),
  });
  const enrollJson = await enrollRes.json();
  console.log(`Enrollment response (${enrollRes.status}):`, JSON.stringify(enrollJson));
  if (enrollRes.status !== 200 && enrollRes.status !== 201 && enrollRes.status !== 409) {
    throw new Error(`Enrollment failed: ${JSON.stringify(enrollJson)}`);
  }

  // 2. Initial progress
  console.log("\n--- Step 2: Check Initial Progress ---");
  const prog0Res = await fetch(`http://localhost:3000/api/progress/${courseId}`, {
    method: "GET",
    headers,
  });
  const prog0 = await prog0Res.json();
  console.log(`Initial progress: ${prog0.progress?.progressPercentage ?? 0}% completed (${prog0.progress?.completedLessons}/${prog0.progress?.totalPublishedLessons}) status: ${prog0.progress?.enrollmentStatus}`);

  // 3. Complete Lesson 1 (Video)
  console.log("\n--- Step 3: Complete Lesson 1 (Video) ---");
  const l1Id = lessons[0]._id.toString();
  const l1Res = await fetch(`http://localhost:3000/api/progress/${courseId}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ lessonId: l1Id, completed: true }),
  });
  const l1Json = await l1Res.json();
  console.log(`Lesson 1 completed: ${l1Json.progress?.progressPercentage}% (${l1Json.progress?.completedLessons}/${l1Json.progress?.totalPublishedLessons}) status: ${l1Json.progress?.enrollmentStatus}`);

  // 4. Complete Lesson 2 (Article)
  console.log("\n--- Step 4: Complete Lesson 2 (Article) ---");
  const l2Id = lessons[1]._id.toString();
  const l2Res = await fetch(`http://localhost:3000/api/progress/${courseId}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ lessonId: l2Id, completed: true }),
  });
  const l2Json = await l2Res.json();
  console.log(`Lesson 2 completed: ${l2Json.progress?.progressPercentage}% (${l2Json.progress?.completedLessons}/${l2Json.progress?.totalPublishedLessons}) status: ${l2Json.progress?.enrollmentStatus}`);

  // 5. Complete Lesson 3 (Article) -> 100%
  console.log("\n--- Step 5: Complete Lesson 3 (Article) ---");
  const l3Id = lessons[2]._id.toString();
  const l3Res = await fetch(`http://localhost:3000/api/progress/${courseId}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ lessonId: l3Id, completed: true }),
  });
  const l3Json = await l3Res.json();
  console.log(`Lesson 3 completed: ${l3Json.progress?.progressPercentage}% (${l3Json.progress?.completedLessons}/${l3Json.progress?.totalPublishedLessons}) status: ${l3Json.progress?.enrollmentStatus}`);
  console.log(`Course completion status: ${l3Json.progress?.enrollmentStatus === "completed" ? "COMPLETED" : "INCOMPLETE"}`);

  // 6. Submit a Review
  console.log("\n--- Step 6: Submit Course Review ---");
  const reviewBody = {
    rating: 5,
    comment: "Outstanding foundations course! The video lesson was crystal clear and the deep-dive articles on Flexbox and modern JavaScript were top quality.",
  };
  const reviewRes = await fetch(`http://localhost:3000/api/courses/${courseId}/reviews`, {
    method: "POST",
    headers,
    body: JSON.stringify(reviewBody),
  });
  const reviewJson = await reviewRes.json();
  console.log(`Review submission (${reviewRes.status}):`, JSON.stringify(reviewJson));

  // 7. Fetch Reviews for Course
  console.log("\n--- Step 7: Verify Review in Public API ---");
  const getReviewsRes = await fetch(`http://localhost:3000/api/courses/${courseId}/reviews`);
  const getReviewsJson = await getReviewsRes.json();
  console.log(`Course reviews count: ${getReviewsJson.reviews?.length}`);
  const matchingReview = getReviewsJson.reviews?.find(r => r.user?.email === "qa_v2_student@learnhub.test" || r.comment.includes("Outstanding foundations"));
  console.log("Matching review verified:", matchingReview ? "YES" : "NO", matchingReview?.comment);

  // 8. Edit the Review (Update without duplicate)
  console.log("\n--- Step 8: Edit Review (Update) ---");
  const editReviewBody = {
    rating: 5,
    comment: "Updated: Absolutely top-tier curriculum for mastering modern web fundamentals.",
  };
  const editRes = await fetch(`http://localhost:3000/api/courses/${courseId}/reviews`, {
    method: "POST",
    headers,
    body: JSON.stringify(editReviewBody),
  });
  const editJson = await editRes.json();
  console.log(`Review edit response (${editRes.status}):`, JSON.stringify(editJson));

  // 9. Re-check review list (should still have only 1 review from student, updated text)
  const recheckRes = await fetch(`http://localhost:3000/api/courses/${courseId}/reviews`);
  const recheckJson = await recheckRes.json();
  const studentReviews = recheckJson.reviews?.filter(r => r.user?.email === "qa_v2_student@learnhub.test" || r.comment.includes("Updated: Absolutely top-tier"));
  console.log(`Student review count after edit: ${studentReviews?.length} (expected: 1)`);
  console.log("Updated comment text:", studentReviews?.[0]?.comment);

  // 10. Verify progress persistence across a fresh GET request
  console.log("\n--- Step 10: Verify Progress Persistence ---");
  const persistRes = await fetch(`http://localhost:3000/api/progress/${courseId}`, {
    method: "GET",
    headers,
  });
  const persistJson = await persistRes.json();
  console.log(`Persisted progress: ${persistJson.progress?.progressPercentage}% (${persistJson.progress?.completedLessons}/${persistJson.progress?.totalPublishedLessons}) status: ${persistJson.progress?.enrollmentStatus}`);
  console.log(`Is completed persisted: ${persistJson.progress?.enrollmentStatus === "completed"}`);

  await mongoose.disconnect();
  console.log("\nAll feature tests finished successfully!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exitCode = 1;
});
