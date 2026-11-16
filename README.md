This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Authentication configuration

Authentication requires the server-only `SESSION_SECRET` environment variable in the root `.env.local` file. Generate a fresh value locally with:

```bash
node -p "require('node:crypto').randomBytes(32).toString('base64url')"
```

Add the generated value as `SESSION_SECRET=...` in `.env.local`. Do not add a `NEXT_PUBLIC_` prefix, commit the file, or expose the value in browser code. Restart the development server after changing environment variables. The application also requires the existing `MONGODB_URI` setting.

Registration and login are available at `/register` and `/login`; authenticated users are redirected to `/dashboard`. Session cookies are HTTP-only and signed with `SESSION_SECRET`.

## Course data

The course catalog is currently sourced from `src/lib/courses.js`. To upsert
those courses into MongoDB Atlas, run this command from the project root:

```bash
npm run seed:courses
```

The command reads `MONGODB_URI` from the root `.env.local`, upserts by course
slug, and does not delete records or write enrollment/progress data. The
published-course read endpoint is `GET /api/courses`.

## Admin course management

Users whose database role is exactly `admin` can manage courses at
`/admin/courses`. The page supports title/category search, publication filters,
course creation and editing, and publish/unpublish actions. Its protected API
provides `GET` and `POST /api/admin/courses`, plus `PUT`, `PATCH` and `DELETE`
`/api/admin/courses/[courseId]`. Every endpoint checks the server-side session
role; course input is validated on the server.

Course deletion is allowed only after unpublishing and only when MongoDB has no
enrollment or lesson-progress records for that course. Dependent records are
never removed or altered by the course-management API. New courses use neutral
defaults for legacy model fields not represented by the admin form; no sample
curriculum is generated. A course cannot be published until it has at least
one valid published lesson. Catalog, detail, and student dashboard
lesson counts and durations are calculated from published lesson records, not
the legacy summary fields.

## Admin curriculum management

Admins can manage a course's embedded curriculum at
`/admin/courses/[courseId]/curriculum`. The admin-only
`GET /api/admin/courses/[courseId]/curriculum` returns the complete curriculum
for editing. `PUT` validates and saves module/lesson changes, while the existing
`POST` endpoint remains append-only. Updates use the course version to reject
stale edits. Lesson IDs are retained when content is edited or reordered, and
deletion is rejected if any `LessonProgress` record references a removed
lesson. Progress records are never deleted or reset.

Students see only modules containing published lessons, and lesson details
remain enrollment-protected. Module visibility is derived from its published
lessons because the existing schema has no independent module publication flag.
Lessons must have valid authored material before they can be published.
First-time progress writes transactionally bump the same course revision used
by curriculum saves, preventing a concurrent access from creating progress
for a deleted lesson.

## Lessons and learning progress

Structured lessons live in `Course.modules[].lessons[]`. The legacy course
lesson count and module summaries are display data only; they are not converted
into lesson records. Enrolled students can retrieve published curriculum through
`GET /api/courses/[courseId]/curriculum` and view lessons at
`/learn/[courseSlug]/[lessonId]`. The public course-detail response contains
module summaries, not lesson titles or materials.

Administrators can append authentic lesson material using
`POST /api/admin/courses/[courseId]/curriculum` with an authenticated admin
session. The endpoint accepts one module number and lesson array; for a new
module it also requires a title. New lessons default to unpublished, and the
append-only operation does not replace existing lessons or change their IDs.
Only publish material after supplying the real article/quiz content or HTTPS
video source. No curriculum seed content is provided. Authenticated progress is
available through `GET` and `POST /api/progress/[courseId]`. Progress is
calculated only from published lessons, and the dashboard's learning-time
figure sums completed lesson durations rather than tracking actual playback
time.

## Concurrency and authentication limits

Course deletion and enrollment creation coordinate through a MongoDB
transaction when the database deployment supports transactions. On a
standalone MongoDB deployment, an atomic course-level deletion gate and
enrollment reservation counter provide the fallback: deletion is blocked while
an enrollment is being written, and dependent enrollment/progress records are
never removed. If a server process stops while holding a fallback reservation
or deletion gate, the affected course fails closed until an operator verifies
the course and enrollment records and clears the stale internal state.

Login and registration limits use fixed-window counters stored in the shared
MongoDB `auth_rate_limits` collection, with a TTL index for cleanup; no
process-local limiter is used. Current limits are 20 login attempts per IP per
15 minutes, 10 login attempts per normalized email per 15 minutes, and 5
registrations per IP per hour. Counter identities are HMACed with
`SESSION_SECRET`, and authentication requests are capped at 8 KiB. If MongoDB
is unavailable, these endpoints fail closed rather than bypassing the limits.
The deployment proxy is part of the trust boundary: it must strip incoming
`x-forwarded-for` values and replace the header with the observed client
address. The application ignores `x-real-ip`, and its origin must not be
directly reachable around the trusted proxy. Without these guarantees, clients
may share the fallback bucket or spoof their address. These application limits
do not replace edge/WAF protection against large distributed traffic floods,
and MongoDB TTL cleanup is asynchronous.

The course seed script creates new sample catalog courses as drafts because
its legacy module summaries are not real published lessons. Re-running the
script does not change the publication state, curriculum, enrollments, or
progress of existing records.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
