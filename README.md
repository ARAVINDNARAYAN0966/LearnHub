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

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
