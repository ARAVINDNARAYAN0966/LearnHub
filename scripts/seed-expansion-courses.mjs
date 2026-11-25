import mongoose from "mongoose";
import { expansionCourses } from "../src/lib/expansion-courses.js";
import Course from "../src/models/Course.js";

async function seedExpansionCourses() {
  const uri = process.env.MONGODB_URI;
  if (!uri || !/^mongodb(?:\+srv)?:\/\//i.test(uri)) {
    throw new Error("A valid MONGODB_URI is required.");
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    const dbName = mongoose.connection.name;
    console.log(`Connected to database: ${dbName}`);

    if (dbName !== "learnhub_v2") {
      throw new Error(`Safety check failed: active database is '${dbName}', expected 'learnhub_v2'.`);
    }

    await Course.init();

    let insertedCount = 0;
    let updatedCount = 0;
    let untouchedCount = 0;

    for (const courseData of expansionCourses) {
      const existing = await Course.findOne({ slug: courseData.slug });

      if (!existing) {
        // Create new course
        const newCourse = new Course(courseData);
        await newCourse.save();
        insertedCount++;
        console.log(`[INSERTED] Course: ${courseData.slug} (${courseData.title})`);
      } else {
        // Update existing course while preserving existing lesson _ids
        const existingLessons = existing.modules?.[0]?.lessons || [];
        const updatedModules = courseData.modules.map((mod, modIdx) => {
          const modLessons = mod.lessons.map((lesson, lessonIdx) => {
            const existingLesson = existingLessons[lessonIdx];
            return {
              ...lesson,
              _id: existingLesson?._id || lesson._id || new mongoose.Types.ObjectId(),
            };
          });
          return {
            ...mod,
            lessons: modLessons,
          };
        });

        existing.title = courseData.title;
        existing.description = courseData.description;
        existing.category = courseData.category;
        existing.instructor = courseData.instructor;
        existing.instructorRole = courseData.instructorRole;
        existing.price = courseData.price;
        existing.originalPrice = courseData.originalPrice;
        existing.currency = courseData.currency;
        existing.image = courseData.image;
        existing.duration = courseData.duration;
        existing.lessons = courseData.lessons;
        existing.rating = courseData.rating;
        existing.reviews = courseData.reviews;
        existing.students = courseData.students;
        existing.level = courseData.level;
        existing.color = courseData.color;
        existing.learn = courseData.learn;
        existing.modules = updatedModules;
        existing.published = courseData.published;

        await existing.save();
        updatedCount++;
        console.log(`[UPDATED] Course: ${courseData.slug} (preserved lesson IDs)`);
      }
    }

    // Verify course counts
    const totalCourses = await Course.countDocuments();
    const publishedCourses = await Course.countDocuments({ published: true });
    const draftCourses = await Course.countDocuments({ published: false });

    console.log("\n--- Seeding Summary ---");
    console.log(`Expansion courses processed: ${expansionCourses.length}`);
    console.log(`Inserted: ${insertedCount}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Total courses in DB: ${totalCourses}`);
    console.log(`Published courses: ${publishedCourses}`);
    console.log(`Draft courses: ${draftCourses}`);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from database.");
  }
}

seedExpansionCourses().catch((err) => {
  console.error("Seeding failed:", err.message);
  process.exitCode = 1;
});
