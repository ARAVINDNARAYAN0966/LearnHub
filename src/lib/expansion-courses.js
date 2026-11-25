import mongoose from "mongoose";

export const expansionCourses = [
  // 1. HTML, CSS and JavaScript
  {
    slug: "html-css-javascript-foundations",
    title: "Modern Web Foundations: HTML5, CSS3 & JavaScript",
    description: "Master the essential building blocks of the modern web. Learn semantic HTML5, modern CSS3 layout techniques (Flexbox & CSS Grid), and core JavaScript DOM manipulation and event-driven programming to build accessible, responsive websites from scratch.",
    category: "Web Development",
    instructor: "Sarah Jenkins",
    instructorRole: "Senior Frontend Architect at Stripe",
    price: 0,
    originalPrice: 2499,
    currency: "INR",
    image: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1000&q=85",
    duration: "14 hours",
    lessons: 3,
    rating: 4.9,
    reviews: 1840,
    students: "12.4k",
    level: "Beginner",
    color: "lavender",
    published: true,
    learn: [
      "Build semantic, accessible web pages using HTML5 standards",
      "Master responsive design, CSS Grid, Flexbox, and modern CSS variables",
      "Program dynamic DOM interactions and handle user events with modern JavaScript",
      "Deploy responsive websites to modern cloud hosting platforms"
    ],
    modules: [
      {
        number: "01",
        title: "Core Web Fundamentals",
        description: "Foundational concepts of HTML5 semantic markup, CSS styling, and JavaScript interactivity.",
        summary: "3 comprehensive lessons covering markup, layouts, and scripting.",
        lessons: [
          {
            _id: new mongoose.Types.ObjectId(),
            title: "Semantic HTML5 and Document Structure",
            description: "Mastering HTML5 document anatomy, semantic elements, and accessibility best practices.",
            type: "video",
            videoUrl: "https://www.youtube.com/watch?v=mU6anWqZJcc",
            content: "In this opening video lesson, we explore the core structure of modern web applications. You will learn how the DOM tree is constructed by the browser rendering engine, why semantic tags like <main>, <article>, <section>, and <nav> are critical for SEO and screen-reader accessibility, and how modern meta tags configure viewport scaling for mobile devices.\n\nKey Concepts Covered:\n- The HTML5 Doctype and rendering modes\n- Accessible landmarks (<header>, <nav>, <main>, <footer>)\n- Meta viewport configuration and mobile responsiveness\n- Document outline and semantic hierarchy",
            durationMinutes: 25,
            order: 1,
            published: true
          },
          {
            _id: new mongoose.Types.ObjectId(),
            title: "Modern Responsive Layouts with CSS Grid & Flexbox",
            description: "Deep dive into one-dimensional and two-dimensional CSS layout engines.",
            type: "article",
            videoUrl: "",
            content: `=== Modern Responsive Layouts with CSS Grid & Flexbox ===

Building responsive layouts in modern web development relies on two complementary layout systems: Flexbox (for 1-dimensional layouts) and CSS Grid (for 2-dimensional layouts).

1. Understanding Flexbox (1D Layouts)
Flexbox excels at distributing space along a single axis (row or column). It provides dynamic alignment, wrapping, and flexible sizing without manual width calculations.

Example — Responsive Navigation Bar:
\`\`\`css
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  gap: 1.5rem;
}

.nav-links {
  display: flex;
  gap: 1rem;
  list-style: none;
}
\`\`\`

2. Understanding CSS Grid (2D Layouts)
CSS Grid manages both columns and rows simultaneously. It allows you to build complex magazine or card layouts with minimal code.

Example — Auto-Fit Responsive Card Grid:
\`\`\`css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}
\`\`\`

3. Best Practices for Production:
- Prefer CSS Grid for whole-page scaffolding and card catalogs.
- Prefer Flexbox for inline components, buttons, and toolbar alignment.
- Use 'clamp()' for fluid typography that scales seamlessly between mobile and desktop viewports.`,
            durationMinutes: 35,
            order: 2,
            published: true
          },
          {
            _id: new mongoose.Types.ObjectId(),
            title: "JavaScript DOM Manipulation & Asynchronous Fetch",
            description: "Connecting JavaScript to HTML elements, managing event listeners, and querying remote APIs.",
            type: "article",
            videoUrl: "",
            content: `=== JavaScript DOM Manipulation & Asynchronous Fetch ===

JavaScript breathes life into web pages by manipulating the Document Object Model (DOM) and communicating with backend APIs asynchronously.

1. Safe Element Selection and Event Handling:
Always attach event listeners using 'addEventListener' rather than inline HTML handlers to preserve separation of concerns and avoid memory leaks.

\`\`\`javascript
const submitBtn = document.querySelector('#submit-btn');
const outputContainer = document.querySelector('#output');

submitBtn.addEventListener('click', async (event) => {
  event.preventDefault();
  outputContainer.textContent = 'Loading data...';

  try {
    const data = await fetchCourses();
    renderCourseList(data);
  } catch (error) {
    outputContainer.textContent = 'Failed to load courses. Please retry.';
  }
});
\`\`\`

2. Making Network Requests with async/await:
The modern Fetch API returns Promises that resolve to HTTP Response objects. Always verify 'response.ok' before parsing JSON.

\`\`\`javascript
async function fetchCourses() {
  const response = await fetch('/api/courses', {
    headers: { 'Accept': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(\`HTTP error! status: \${response.status}\`);
  }

  return response.json();
}
\`\`\`

3. Key Takeaways:
- Never trust raw user input in '.innerHTML' to prevent Cross-Site Scripting (XSS). Prefer '.textContent' or sanitized DOM nodes.
- Use event delegation on parent containers when handling events for dynamically generated lists.`,
            durationMinutes: 40,
            order: 3,
            published: true
          }
        ]
      }
    ]
  },

  // 2. React.js
  {
    slug: "react-modern-frontend-architecture",
    title: "React 19 & Modern Frontend Architecture",
    description: "Deep dive into React 19, Server Components, concurrent rendering, custom hooks, and state management. Learn to build performant, scalable single-page applications and client-side interfaces using industry-standard architecture.",
    category: "Web Development",
    instructor: "Noah Kim",
    instructorRole: "Staff UI Engineer at Vercel",
    price: 0,
    originalPrice: 2999,
    currency: "INR",
    image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=1000&q=85",
    duration: "18 hours",
    lessons: 3,
    rating: 4.8,
    reviews: 2420,
    students: "19.8k",
    level: "Intermediate",
    color: "blue",
    published: true,
    learn: [
      "Master React 19 fundamentals: components, props, hooks, and lifecycle",
      "Leverage modern hooks: useState, useEffect, useMemo, useCallback, and useTransition",
      "Manage application state cleanly with React Context and custom hooks",
      "Build and test production-ready component libraries"
    ],
    modules: [
      {
        number: "01",
        title: "React Architecture & Hooks",
        description: "Mental models for declarative UI, reactive data flow, and modern React hooks.",
        summary: "3 structured lessons on state, effects, and architecture.",
        lessons: [
          {
            _id: new mongoose.Types.ObjectId(),
            title: "React 19 Mental Model and Component Composition",
            description: "Understanding declarative UI, JSX compilation, and component trees.",
            type: "video",
            videoUrl: "https://www.youtube.com/watch?v=bMknfKXIFA8",
            content: "This video lecture breaks down the core architecture of React 19. Learn how React builds an in-memory Virtual DOM representation, how the reconciliation algorithm identifies state changes with surgical precision, and how unidirectional data flow guarantees predictable application state.\n\nHighlights:\n- Declarative vs Imperative rendering models\n- Props immutability and component purity\n- Component composition over inheritance\n- Key prop rules and stable list rendering",
            durationMinutes: 30,
            order: 1,
            published: true
          },
          {
            _id: new mongoose.Types.ObjectId(),
            title: "State Management & Custom Hooks Patterns",
            description: "Extracting reusable logic with custom hooks and managing complex state.",
            type: "article",
            videoUrl: "",
            content: `=== State Management & Custom Hooks Patterns ===

In React applications, keeping components lean and decoupled requires encapsulating business logic into reusable custom hooks.

1. The Rules of Hooks:
- Call hooks only at the top level of React functions.
- Do not call hooks inside loops, conditions, or nested functions.
- Name custom hooks with the 'use' prefix.

2. Creating a Custom Async Data Hook:
\`\`\`javascript
import { useState, useEffect } from 'react';

export function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then((json) => {
        if (!isCancelled) {
          setData(json);
          setError(null);
        }
      })
      .catch((err) => {
        if (!isCancelled) setError(err.message);
      })
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [url]);

  return { data, loading, error };
}
\`\`\`

3. Using the Custom Hook in UI Components:
\`\`\`jsx
function CourseList() {
  const { data: courses, loading, error } = useFetch('/api/courses');

  if (loading) return <p>Loading courses...</p>;
  if (error) return <p role="alert">Error: {error}</p>;

  return (
    <ul>
      {courses.map((c) => (
        <li key={c.id}>{c.title}</li>
      ))}
    </ul>
  );
}
\`\`\``,
            durationMinutes: 45,
            order: 2,
            published: true
          },
          {
            _id: new mongoose.Types.ObjectId(),
            title: "Performance Optimization & Concurrent Features",
            description: "Using useMemo, useCallback, React.memo, and useTransition for responsive interfaces.",
            type: "article",
            videoUrl: "",
            content: `=== Performance Optimization & Concurrent Features ===

Optimizing React applications ensures smooth 60fps animations and immediate keyboard responsiveness even under heavy data computation.

1. When to use useMemo and useCallback:
- 'useMemo' caches the result of an expensive calculation between re-renders.
- 'useCallback' caches a function definition between renders when passing callbacks to optimized child components that rely on reference equality.

\`\`\`javascript
const filteredList = useMemo(() => {
  return items.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
}, [items, searchTerm]);
\`\`\`

2. Concurrent React with useTransition:
'useTransition' lets you mark state updates as non-blocking transitions so urgent updates (like typing in an input) remain instantaneous.

\`\`\`javascript
const [isPending, startTransition] = useTransition();

function handleSearchChange(e) {
  // Urgent update: reflect typed character immediately
  setInputVal(e.target.value);

  // Transition update: filter 10,000 items in the background
  startTransition(() => {
    setSearchQuery(e.target.value);
  });
}
\`\`\``,
            durationMinutes: 40,
            order: 3,
            published: true
          }
        ]
      }
    ]
  },

  // 3. MERN Stack
  {
    slug: "mern-stack-full-stack-mastery",
    title: "Full Stack MERN: MongoDB, Express, React & Node.js",
    description: "Build and deploy complete full-stack web applications using MongoDB, Express.js, React, and Node.js. Master RESTful API design, JWT authentication, Mongoose schemas, and production deployment with end-to-end data flow.",
    category: "Web Development",
    instructor: "Alex Rivera",
    instructorRole: "Lead Full Stack Engineer at Shopify",
    price: 0,
    originalPrice: 3999,
    currency: "INR",
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1000&q=85",
    duration: "24 hours",
    lessons: 3,
    rating: 4.9,
    reviews: 1950,
    students: "16.2k",
    level: "Intermediate",
    color: "emerald",
    published: true,
    learn: [
      "Design RESTful backend APIs with Express.js and Node.js",
      "Model complex relational data with MongoDB and Mongoose schemas",
      "Connect React frontends to Node APIs with secure JWT authentication",
      "Implement error handling, CORS, rate limiting, and production deployment"
    ],
    modules: [
      {
        number: "01",
        title: "MERN Architecture & API Design",
        description: "Full-stack client-server integration, middleware architecture, and database operations.",
        summary: "3 comprehensive lessons connecting React to Express and MongoDB.",
        lessons: [
          {
            _id: new mongoose.Types.ObjectId(),
            title: "Full Stack Architecture: Connecting Client and Server",
            description: "Understanding full-stack data flow from React client through Express server to MongoDB.",
            type: "video",
            videoUrl: "https://www.youtube.com/watch?v=7CqJlxBYj-M",
            content: "This comprehensive video session introduces the MERN stack architecture. Discover how the browser dispatches HTTP requests, how Express middleware intercepts and validates payloads, and how Mongoose queries Atlas databases and streams responses back to the React UI layer.\n\nTopics:\n- Client-server separation of concerns\n- Node.js event loop and non-blocking I/O\n- Express router setup and environment configuration\n- End-to-end debugging and network inspection",
            durationMinutes: 35,
            order: 1,
            published: true
          },
          {
            _id: new mongoose.Types.ObjectId(),
            title: "Express Middleware, Routing & Mongoose Schemas",
            description: "Building production-grade REST endpoints with robust schema validation.",
            type: "article",
            videoUrl: "",
            content: `=== Express Middleware, Routing & Mongoose Schemas ===

In the MERN stack, Express acts as the backend orchestrator and Mongoose provides an elegant object data modeling (ODM) layer on top of MongoDB.

1. Defining Mongoose Schemas with Validation:
\`\`\`javascript
import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Product title is required'],
    trim: true,
    maxlength: 120
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  inStock: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
\`\`\`

2. Building Modular Express Routes:
\`\`\`javascript
import express from 'express';
import { Product } from '../models/Product.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const products = await Product.find({ inStock: true }).sort({ createdAt: -1 });
    res.json({ success: true, count: products.length, data: products });
  } catch (error) {
    next(error);
  }
});

export default router;
\`\`\`

3. Centralized Error-Handling Middleware:
Always terminate your Express middleware chain with an error-handling function signature '(err, req, res, next)':
\`\`\`javascript
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});
\`\`\``,
            durationMinutes: 45,
            order: 2,
            published: true
          },
          {
            _id: new mongoose.Types.ObjectId(),
            title: "Authentication, JWTs & Protected API Routes",
            description: "Implementing secure stateless authentication with bcrypt password hashing and JSON Web Tokens.",
            type: "article",
            videoUrl: "",
            content: `=== Authentication, JWTs & Protected API Routes ===

Securing MERN applications requires robust password hashing and tamper-proof session tokens.

1. Password Hashing with bcrypt:
Never store plaintext passwords. Hash passwords with bcrypt using a minimum work factor of 12.

\`\`\`javascript
import bcrypt from 'bcryptjs';

const saltRounds = 12;
const passwordHash = await bcrypt.hash(plaintextPassword, saltRounds);

// Verify password on login:
const isValid = await bcrypt.compare(submittedPassword, user.passwordHash);
\`\`\`

2. Creating & Verifying JWTs:
Issue signed JWT tokens stored in HttpOnly cookies to prevent Cross-Site Scripting (XSS) access:

\`\`\`javascript
import jwt from 'jsonwebtoken';

function generateToken(userId, role) {
  return jwt.sign(
    { sub: userId, role },
    process.env.SESSION_SECRET,
    { expiresIn: '24h', issuer: 'learnhub-api' }
  );
}

// Authentication middleware:
export function requireAuth(req, res, next) {
  const token = req.cookies.learnhub_session;
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const payload = jwt.verify(token, process.env.SESSION_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }
}
\`\`\``,
            durationMinutes: 50,
            order: 3,
            published: true
          }
        ]
      }
    ]
  },

  // 4. Next.js
  {
    slug: "nextjs-fullstack-app-router",
    title: "Next.js 15 & 16: Full-Stack React with App Router",
    description: "Master the Next.js App Router, React Server Components (RSC), Server Actions, streaming SSR, and edge API routes. Learn how to architect full-stack applications with optimal caching, SEO, and lightning-fast web vitals.",
    category: "Web Development",
    instructor: "Marcus Williams",
    instructorRole: "Principal Next.js Consultant",
    price: 0,
    originalPrice: 3499,
    currency: "INR",
    image: "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&w=1000&q=85",
    duration: "16 hours",
    lessons: 3,
    rating: 4.9,
    reviews: 2130,
    students: "14.5k",
    level: "Advanced",
    color: "peach",
    published: true,
    learn: [
      "Master App Router architecture: layouts, nested pages, and route groups",
      "Leverage React Server Components (RSC) and Server Actions for data mutations",
      "Implement dynamic routing, API route handlers, and middleware security",
      "Optimize performance with Partial Prerendering and streaming SSR"
    ],
    modules: [
      {
        number: "01",
        title: "App Router & Server Components",
        description: "Modern full-stack React paradigms with server-side rendering and static optimization.",
        summary: "3 comprehensive lessons on RSC, Server Actions, and Route Handlers.",
        lessons: [
          {
            _id: new mongoose.Types.ObjectId(),
            title: "Next.js App Router & Server Components In-Depth",
            description: "Understanding server execution boundaries, streaming SSR, and Suspense.",
            type: "video",
            videoUrl: "https://www.youtube.com/watch?v=wm5gMKuwSYk",
            content: "Explore how Next.js unifies server and client execution through React Server Components. Discover how server components keep heavy dependencies on the server, eliminate client bundle bloat, and stream HTML to the browser with progressive hydration.\n\nHighlights:\n- Server Components vs Client Components ('use client')\n- Layouts, templates, and nested route hierarchies\n- Suspense boundaries and streaming HTML\n- Metadata generation for dynamic SEO",
            durationMinutes: 35,
            order: 1,
            published: true
          },
          {
            _id: new mongoose.Types.ObjectId(),
            title: "Server Actions, Form Mutations & Optimistic UI",
            description: "Executing server-side mutations directly from React forms without writing manual API endpoints.",
            type: "article",
            videoUrl: "",
            content: `=== Server Actions, Form Mutations & Optimistic UI ===

Next.js Server Actions allow client components to invoke asynchronous server functions directly, eliminating boilerplate REST endpoints for form submissions.

1. Defining a Server Action:
\`\`\`javascript
'use server';

import { revalidatePath } from 'next/cache';
import Course from '@/models/Course';
import { connectToDatabase } from '@/lib/mongodb';

export async function updateCourseTitle(courseId, newTitle) {
  await connectToDatabase();
  await Course.findByIdAndUpdate(courseId, { title: newTitle });
  revalidatePath('/courses');
  return { success: true };
}
\`\`\`

2. Consuming Server Actions with useActionState:
\`\`\`jsx
'use client';

import { useActionState } from 'react';
import { updateCourseTitle } from './actions';

export function EditTitleForm({ courseId, initialTitle }) {
  const [state, formAction, isPending] = useActionState(
    async (prevState, formData) => {
      const title = formData.get('title');
      return await updateCourseTitle(courseId, title);
    },
    null
  );

  return (
    <form action={formAction}>
      <input name="title" defaultValue={initialTitle} required />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : 'Save Title'}
      </button>
      {state?.success && <p>Saved successfully!</p>}
    </form>
  );
}
\`\`\``,
            durationMinutes: 40,
            order: 2,
            published: true
          },
          {
            _id: new mongoose.Types.ObjectId(),
            title: "Route Handlers, Middleware & Production Caching",
            description: "Building custom API endpoints, intercepting requests with Edge middleware, and managing cache revalidation.",
            type: "article",
            videoUrl: "",
            content: `=== Route Handlers, Middleware & Production Caching ===

Next.js Route Handlers enable custom request handlers for Web Request and Response APIs.

1. Route Handler Example:
\`\`\`javascript
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  return NextResponse.json({
    status: 'ok',
    results: query ? ['item1', 'item2'] : []
  }, {
    headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' }
  });
}
\`\`\`

2. Protecting Routes with Next.js Middleware:
\`\`\`javascript
import { NextResponse } from 'next/server';

export function middleware(request) {
  const sessionToken = request.cookies.get('learnhub_session');

  if (request.nextUrl.pathname.startsWith('/admin') && !sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*']
};
\`\`\``,
            durationMinutes: 45,
            order: 3,
            published: true
          }
        ]
      }
    ]
  },

  // 5. C++ Programming
  {
    slug: "modern-cpp-high-performance-systems",
    title: "Modern C++ Mastery: From Fundamentals to High-Performance Systems",
    description: "Comprehensive guide to Modern C++ (C++17, C++20). Master manual memory management, smart pointers, RAII, move semantics, templates, STL containers, and concurrency to write robust, zero-overhead high-performance software.",
    category: "Programming",
    instructor: "Dr. Vikram Malhotra",
    instructorRole: "Low-Latency Systems Architect",
    price: 0,
    originalPrice: 2999,
    currency: "INR",
    image: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1000&q=85",
    duration: "20 hours",
    lessons: 3,
    rating: 4.8,
    reviews: 1420,
    students: "11.1k",
    level: "Intermediate",
    color: "amber",
    published: true,
    learn: [
      "Understand memory layout, pointers, references, and stack vs heap allocation",
      "Implement RAII idiom and smart pointers (unique_ptr, shared_ptr)",
      "Master move semantics, rvalue references, and perfect forwarding",
      "Write generic code using modern C++ templates and the Standard Template Library"
    ],
    modules: [
      {
        number: "01",
        title: "C++ Foundations & Memory Safety",
        description: "Systems programming fundamentals, zero-cost abstractions, and resource management.",
        summary: "3 comprehensive lessons on compilation, pointers, and modern C++ idioms.",
        lessons: [
          {
            _id: new mongoose.Types.ObjectId(),
            title: "C++ Architecture, Compilers & Fundamental Types",
            description: "Understanding the C++ compilation pipeline, translation units, and type system.",
            type: "video",
            videoUrl: "https://www.youtube.com/watch?v=vLnPwxZdW4Y",
            content: "Learn how C++ source code is transformed by the preprocessor, compiler, and linker into native machine instructions. Understand how the memory stack and heap operate, why type safety prevents hardware faults, and how modern C++ achieves zero-cost abstractions.\n\nKey Topics:\n- The compilation model (preprocess, compile, assemble, link)\n- Primitive data types and integer representations\n- Stack frames, function calls, and register conventions\n- Introduction to namespaces and modular headers",
            durationMinutes: 40,
            order: 1,
            published: true
          },
          {
            _id: new mongoose.Types.ObjectId(),
            title: "Pointers, References & Modern Smart Pointer Memory Management",
            description: "Managing dynamic memory safely using RAII and smart pointers.",
            type: "article",
            videoUrl: "",
            content: `=== Pointers, References & Modern Smart Pointer Memory Management ===

In modern C++, manual calls to 'new' and 'delete' are considered an anti-pattern. Instead, we embrace RAII (Resource Acquisition Is Initialization) and smart pointers.

1. Raw Pointers vs References:
- A pointer stores a memory address and can be null or reassigned.
- A reference is an immutable alias to an existing object and cannot be null.

\`\`\`cpp
int value = 42;
int* ptr = &value;   // Pointer to value
int& ref = value;    // Reference alias to value

*ptr = 100;         // Dereference pointer
ref = 200;          // Direct assignment via reference
\`\`\`

2. std::unique_ptr (Exclusive Ownership):
'std::unique_ptr' guarantees that exactly one pointer owns the heap resource. When it leaves scope, memory is automatically freed.

\`\`\`cpp
#include <memory>
#include <iostream>

struct Packet {
    int id;
    Packet(int i) : id(i) { std::cout << "Packet " << id << " created\\n"; }
    ~Packet() { std::cout << "Packet " << id << " destroyed\\n"; }
};

void processPacket() {
    auto packet = std::make_unique<Packet>(101);
    // Resource automatically freed when packet leaves function scope
}
\`\`\`

3. std::shared_ptr and std::weak_ptr (Shared Ownership):
Use 'std::shared_ptr' when multiple owners share a resource, tracked via atomic reference counting. Use 'std::weak_ptr' to prevent circular reference memory leaks.`,
            durationMinutes: 50,
            order: 2,
            published: true
          },
          {
            _id: new mongoose.Types.ObjectId(),
            title: "Object-Oriented C++, Move Semantics & STL Mastery",
            description: "Class hierarchies, rvalue references, std::move, and high-performance STL containers.",
            type: "article",
            videoUrl: "",
            content: `=== Object-Oriented C++, Move Semantics & STL Mastery ===

Move semantics in C++11 eliminated unnecessary deep copying of expensive heap objects.

1. Lvalues vs Rvalues and Move Semantics:
- Lvalue: An object that occupies an identifiable location in memory (has a name).
- Rvalue: A temporary value that does not persist beyond the expression (can be pilfered).

\`\`\`cpp
#include <vector>
#include <string>
#include <utility>

class Buffer {
    std::string data;
public:
    Buffer(std::string d) : data(std::move(d)) {} // Move constructor
};
\`\`\`

2. The Standard Template Library (STL):
- 'std::vector': Contiguous dynamic array. Best cache locality. Default choice for 95% of use cases.
- 'std::unordered_map': O(1) average hash table lookup.
- 'std::array': Fixed-size compile-time stack array. Zero overhead over C-arrays.

\`\`\`cpp
#include <algorithm>
#include <vector>

std::vector<int> numbers = {5, 2, 8, 1, 9};
std::sort(numbers.begin(), numbers.end()); // In-place O(N log N) intro-sort
\`\`\``,
            durationMinutes: 45,
            order: 3,
            published: true
          }
        ]
      }
    ]
  },

  // 6. Python Programming
  {
    slug: "complete-python-bootcamp-zero-to-hero",
    title: "Complete Python Bootcamp: Zero to Hero in Python",
    description: "Go from absolute beginner to building real-world Python applications. Master Python syntax, data structures, object-oriented programming, file handling, web scraping, and automation with clean, idiomatic Pythonic code.",
    category: "Programming",
    instructor: "Elena Rostova",
    instructorRole: "Senior Python Engineer & PSF Member",
    price: 0,
    originalPrice: 2699,
    currency: "INR",
    image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1000&q=85",
    duration: "22 hours",
    lessons: 3,
    rating: 4.9,
    reviews: 4180,
    students: "31.4k",
    level: "Beginner",
    color: "mint",
    published: true,
    learn: [
      "Master core Python syntax, control flow, functions, and data structures",
      "Write clean Object-Oriented code with classes, inheritance, and magic methods",
      "Handle file I/O, JSON processing, and exception handling safely",
      "Build automation scripts, CLI tools, and web scrapers"
    ],
    modules: [
      {
        number: "01",
        title: "Python Core Essentials",
        description: "Foundations of Python programming, control flow, functions, and data structures.",
        summary: "3 comprehensive lessons from fundamentals to automation.",
        lessons: [
          {
            _id: new mongoose.Types.ObjectId(),
            title: "Python Fundamentals, Data Types & Control Structures",
            description: "Variables, strings, lists, dictionaries, loops, and conditional logic.",
            type: "video",
            videoUrl: "https://www.youtube.com/watch?v=rfscVS0vtbw",
            content: "Learn the elegant, readable syntax that makes Python the world's most popular programming language. Understand dynamic typing, indentation blocks, built-in collection types (lists, dictionaries, sets, tuples), and how Python manages memory automatically via reference counting.\n\nHighlights:\n- Setting up Python 3.12 and virtual environments\n- Primitive types and string formatting\n- List comprehensions and dictionary iteration\n- Defining functions with default and variable-length arguments",
            durationMinutes: 30,
            order: 1,
            published: true
          },
          {
            _id: new mongoose.Types.ObjectId(),
            title: "Object-Oriented Programming & Functional Paradigms in Python",
            description: "Classes, dunder methods, inheritance, decorators, and generators.",
            type: "article",
            videoUrl: "",
            content: `=== Object-Oriented Programming & Functional Paradigms in Python ===

Python treats everything as an object, from integers to functions. Understanding OOP and functional patterns unlocks powerful software architecture.

1. Defining Classes and Magic (Dunder) Methods:
\`\`\`python
class BankAccount:
    def __init__(self, owner: str, balance: float = 0.0):
        self.owner = owner
        self._balance = balance

    def deposit(self, amount: float) -> None:
        if amount <= 0:
            raise ValueError("Deposit amount must be positive.")
        self._balance += amount

    def __repr__(self) -> str:
        return f"BankAccount(owner='{self.owner}', balance={self._balance:.2f})"

    def __len__(self) -> int:
        return int(self._balance)
\`\`\`

2. Python Decorators:
Decorators wrap functions to dynamically extend their behavior without modifying source code.

\`\`\`python
import time
from functools import wraps

def time_execution(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        duration = time.perf_counter() - start
        print(f"[{func.__name__}] executed in {duration:.4f}s")
        return result
    return wrapper

@time_execution
def process_data(n):
    return sum(i * i for i in range(n))
\`\`\``,
            durationMinutes: 45,
            order: 2,
            published: true
          },
          {
            _id: new mongoose.Types.ObjectId(),
            title: "Error Handling, File I/O & Automation Scripting",
            description: "Context managers, exception hierarchies, reading/writing files, and working with APIs.",
            type: "article",
            videoUrl: "",
            content: `=== Error Handling, File I/O & Automation Scripting ===

Writing robust automation scripts requires safe exception handling and context-managed file I/O.

1. Safe File Handling with 'with' Statements:
Always use context managers when opening files. The file is guaranteed to close even if an unhandled exception occurs.

\`\`\`python
import json
from pathlib import Path

data_file = Path("data/courses.json")

# Write structured JSON data
sample_courses = [{"id": 1, "title": "Python Bootcamp", "price": 1799}]
with open(data_file, "w", encoding="utf-8") as f:
    json.dump(sample_courses, f, indent=2)

# Read JSON data safely
try:
    with open(data_file, "r", encoding="utf-8") as f:
        courses = json.load(f)
        print(f"Loaded {len(courses)} courses.")
except FileNotFoundError:
    print("Course file does not exist.")
except json.JSONDecodeError as err:
    print(f"Malformed JSON: {err}")
\`\`\`

2. Interacting with Web APIs:
\`\`\`python
import requests

def fetch_weather(city: str) -> dict:
    url = f"https://api.example.com/weather?city={city}"
    response = requests.get(url, timeout=5)
    response.raise_for_status()  # Raises HTTPError for 4xx/5xx responses
    return response.json()
\`\`\``,
            durationMinutes: 40,
            order: 3,
            published: true
          }
        ]
      }
    ]
  },

  // 7. Data Structures and Algorithms
  {
    slug: "data-structures-algorithms-interview-mastery",
    title: "Data Structures & Algorithms: Coding Interview Mastery",
    description: "Master the essential algorithms and data structures required to crack technical coding interviews at top tech companies. Covers Big-O analysis, arrays, linked lists, trees, graphs, dynamic programming, and greedy algorithms.",
    category: "Programming",
    instructor: "Kavita Patel",
    instructorRole: "Ex-FAANG Senior Software Engineer",
    price: 0,
    originalPrice: 3999,
    currency: "INR",
    image: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=1000&q=85",
    duration: "28 hours",
    lessons: 3,
    rating: 4.9,
    reviews: 3290,
    students: "22.5k",
    level: "All Levels",
    color: "teal",
    published: true,
    learn: [
      "Analyze algorithmic complexity using Big-O time and space analysis",
      "Implement fundamental data structures: linked lists, stacks, queues, trees, and graphs",
      "Master key algorithmic patterns: two pointers, sliding window, DFS, BFS, and dynamic programming",
      "Confidently solve medium-to-hard LeetCode and FAANG interview problems"
    ],
    modules: [
      {
        number: "01",
        title: "Foundational DSA Patterns",
        description: "Algorithmic analysis, fundamental data structures, and graph traversal.",
        summary: "3 comprehensive lessons on Big-O, trees, and dynamic programming.",
        lessons: [
          {
            _id: new mongoose.Types.ObjectId(),
            title: "Big-O Complexity & Core Data Structures Overview",
            description: "Time and space complexity analysis, arrays, and linked lists.",
            type: "video",
            videoUrl: "https://www.youtube.com/watch?v=RBSGKlAvoiM",
            content: "Learn how senior engineers evaluate algorithm efficiency using Asymptotic Notation. Compare O(1), O(log N), O(N), O(N log N), and O(N^2) growth rates. Understand the hardware memory cache benefits of contiguous arrays versus pointer-chasing in linked lists.\n\nHighlights:\n- Worst-case, average-case, and best-case analysis\n- Stack vs Queue operations (FIFO and LIFO principles)\n- Hash table collisions and amortized O(1) performance\n- Array resizing strategies and geometric progression",
            durationMinutes: 35,
            order: 1,
            published: true
          },
          {
            _id: new mongoose.Types.ObjectId(),
            title: "Trees, Binary Search Trees & Graph Traversal (DFS/BFS)",
            description: "Recursive depth-first search, queue-based breadth-first search, and tree balancing.",
            type: "article",
            videoUrl: "",
            content: `=== Trees, Binary Search Trees & Graph Traversal (DFS/BFS) ===

Hierarchical and networked data structures form the backbone of modern search engines, routing algorithms, and dependency graphs.

1. Breadth-First Search (BFS) on Graphs:
BFS explores neighboring nodes level by level using a Queue. It guarantees finding the shortest path in unweighted graphs.

\`\`\`javascript
function bfsShortestPath(graph, startNode, targetNode) {
  const queue = [[startNode, 0]];
  const visited = new Set([startNode]);

  while (queue.length > 0) {
    const [current, distance] = queue.shift();

    if (current === targetNode) return distance;

    for (const neighbor of graph[current] || []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([neighbor, distance + 1]);
      }
    }
  }

  return -1; // Target unreachable
}
\`\`\`

2. Depth-First Search (DFS) Traversal:
DFS plunges deep down a branch before backtracking, typically implemented via recursion or an explicit Stack.

\`\`\`javascript
function dfsPreOrder(node, result = []) {
  if (!node) return result;
  result.push(node.val);        // Process Root
  dfsPreOrder(node.left, result);  // Traverse Left
  dfsPreOrder(node.right, result); // Traverse Right
  return result;
}
\`\`\``,
            durationMinutes: 50,
            order: 2,
            published: true
          },
          {
            _id: new mongoose.Types.ObjectId(),
            title: "Dynamic Programming & Memoization Techniques",
            description: "Solving overlapping subproblems with optimal substructure using top-down and bottom-up DP.",
            type: "article",
            videoUrl: "",
            content: `=== Dynamic Programming & Memoization Techniques ===

Dynamic Programming (DP) solves complex problems by breaking them down into simpler subproblems and caching their results.

1. Identifying a DP Problem:
A problem can be solved with DP if it exhibits:
- Overlapping Subproblems: The same calculations are repeated multiple times.
- Optimal Substructure: The optimal solution to the problem can be constructed from optimal solutions to its subproblems.

2. Top-Down Memoization Example — Climbing Stairs:
\`\`\`javascript
// Count ways to climb N stairs taking 1 or 2 steps at a time
function climbStairs(n, memo = {}) {
  if (n <= 2) return n;
  if (memo[n] !== undefined) return memo[n];

  memo[n] = climbStairs(n - 1, memo) + climbStairs(n - 2, memo);
  return memo[n];
}
\`\`\`

3. Bottom-Up Tabulation (Iterative O(1) space):
\`\`\`javascript
function climbStairsIterative(n) {
  if (n <= 2) return n;
  let prev2 = 1, prev1 = 2;

  for (let i = 3; i <= n; i++) {
    const current = prev1 + prev2;
    prev2 = prev1;
    prev1 = current;
  }

  return prev1;
}
\`\`\``,
            durationMinutes: 45,
            order: 3,
            published: true
          }
        ]
      }
    ]
  },

  // 8. Docker
  {
    slug: "docker-for-developers-containerization",
    title: "Docker for Developers: Containerization from Scratch",
    description: "Learn to package, ship, and run any application in lightweight, predictable containers with Docker. Covers Dockerfiles, multi-stage builds, volumes, networking, Docker Compose, and local development environments.",
    category: "DevOps",
    instructor: "David Miller",
    instructorRole: "Cloud Infrastructure Engineer at HashiCorp",
    price: 0,
    originalPrice: 2299,
    currency: "INR",
    image: "https://images.unsplash.com/photo-1605745341112-85968b19335b?auto=format&fit=crop&w=1000&q=85",
    duration: "10 hours",
    lessons: 3,
    rating: 4.8,
    reviews: 1680,
    students: "13.7k",
    level: "Beginner",
    color: "sky",
    published: true,
    learn: [
      "Understand container virtualization vs traditional virtual machines",
      "Write optimized Dockerfiles with multi-stage builds for small image sizes",
      "Configure multi-container applications using Docker Compose",
      "Manage persistent storage with Docker volumes and configure container networking"
    ],
    modules: [
      {
        number: "01",
        title: "Docker Essentials & Containers",
        description: "Introduction to container virtualization, image construction, and container management.",
        summary: "3 comprehensive lessons on Dockerfiles, layers, and Compose.",
        lessons: [
          {
            _id: new mongoose.Types.ObjectId(),
            title: "Container Fundamentals, Images & Docker CLI Workflow",
            description: "Understanding Linux cgroups, namespaces, image layers, and container lifecycle.",
            type: "video",
            videoUrl: "https://www.youtube.com/watch?v=fqMOX6JJhGo",
            content: "Discover how Docker solves the 'it works on my machine' dilemma. Learn how Linux kernel namespaces isolate processes, how cgroups limit CPU and RAM consumption, and how union file systems stack immutable read-only image layers under a thin writable container layer.\n\nHighlights:\n- Containers vs Virtual Machines architecture\n- Essential CLI commands: run, build, ps, stop, logs, exec\n- Port forwarding and detached mode\n- Docker Hub registries and image tagging conventions",
            durationMinutes: 30,
            order: 1,
            published: true
          },
          {
            _id: new mongoose.Types.ObjectId(),
            title: "Writing Production-Grade Multi-Stage Dockerfiles",
            description: "Optimizing image size, layer caching, and security scanning with multi-stage builds.",
            type: "article",
            videoUrl: "",
            content: `=== Writing Production-Grade Multi-Stage Dockerfiles ===

A poorly configured Dockerfile can generate bloated 1.5GB images containing compilers and build tools that have no place in production. Multi-stage builds solve this.

1. Production Next.js / Node.js Multi-Stage Dockerfile:
\`\`\`dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npm run build

# Stage 3: Minimal Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Run as non-root user for security
USER node

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "start"]
\`\`\`

2. Best Practices for Image Optimization:
- Order commands from least frequently changed to most frequently changed to maximize Docker layer caching.
- Never store secrets or API tokens inside image layers.
- Use '.dockerignore' to exclude 'node_modules', '.git', and local '.env' files.`,
            durationMinutes: 40,
            order: 2,
            published: true
          },
          {
            _id: new mongoose.Types.ObjectId(),
            title: "Multi-Container Orchestration with Docker Compose",
            description: "Coordinating web services, database backends, and caching layers with declarative compose files.",
            type: "article",
            videoUrl: "",
            content: `=== Multi-Container Orchestration with Docker Compose ===

Docker Compose allows you to define and run multi-container Docker applications using a single YAML file.

1. Production-Grade docker-compose.yml:
\`\`\`yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/learnhub
    depends_on:
      - mongo
    restart: unless-stopped

  mongo:
    image: mongo:7.0
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
\`\`\`

2. Essential Compose Commands:
- 'docker compose up -d': Builds and starts all containers in detached mode.
- 'docker compose logs -f web': Streams live container logs.
- 'docker compose down -v': Stops containers and deletes named volumes.`,
            durationMinutes: 45,
            order: 3,
            published: true
          }
        ]
      }
    ]
  },

  // 9. Kubernetes and DevOps
  {
    slug: "kubernetes-devops-cicd-pipelines",
    title: "Kubernetes & Modern DevOps CI/CD Pipelines",
    description: "Master container orchestration at scale with Kubernetes. Learn Pods, Deployments, Services, Ingress, ConfigMaps, Helm, and how to build automated GitHub Actions CI/CD deployment pipelines to cloud clusters.",
    category: "DevOps",
    instructor: "Siddharth Rao",
    instructorRole: "DevOps Lead at Datadog",
    price: 0,
    originalPrice: 4299,
    currency: "INR",
    image: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?auto=format&fit=crop&w=1000&q=85",
    duration: "18 hours",
    lessons: 3,
    rating: 4.9,
    reviews: 1250,
    students: "9.4k",
    level: "Advanced",
    color: "indigo",
    published: true,
    learn: [
      "Deploy, scale, and manage containerized applications with Kubernetes",
      "Configure declarative YAML manifests for Deployments, Services, and Ingress",
      "Package and version complex Kubernetes applications using Helm charts",
      "Build automated CI/CD deployment pipelines using GitHub Actions"
    ],
    modules: [
      {
        number: "01",
        title: "Kubernetes Architecture & Core Concepts",
        description: "Cluster architecture, declarative resources, and deployment pipelines.",
        summary: "3 comprehensive lessons on orchestration, networking, and CI/CD.",
        lessons: [
          {
            _id: new mongoose.Types.ObjectId(),
            title: "Kubernetes Architecture: Control Plane, Nodes & Pods",
            description: "Understanding API Server, etcd, Kubelet, Scheduler, and Pod lifecycle.",
            type: "video",
            videoUrl: "https://www.youtube.com/watch?v=X48VuDVv0do",
            content: "Learn how Kubernetes orchestrates distributed containerized workloads across thousands of physical servers. Understand how the Control Plane maintains desired state using etcd and the kube-controller-manager, and how worker nodes run container runtimes and kubelet agents.\n\nHighlights:\n- Control plane components (kube-apiserver, etcd, kube-scheduler)\n- Pod anatomy: why Pods are the smallest deployable unit\n- Self-healing, automated rollouts, and rolling updates\n- Declarative configuration with kubectl",
            durationMinutes: 40,
            order: 1,
            published: true
          },
          {
            _id: new mongoose.Types.ObjectId(),
            title: "Services, Ingress Controllers & Network Policies",
            description: "Cluster networking, DNS service discovery, and routing external HTTP traffic.",
            type: "article",
            videoUrl: "",
            content: `=== Services, Ingress Controllers & Network Policies ===

Pods are ephemeral; their IP addresses change every time they are restarted or rescheduled. Kubernetes Services provide stable IP endpoints and load balancing across Pod replicas.

1. Defining a Kubernetes Deployment & Service:
\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: learnhub-web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: learnhub-web
  template:
    metadata:
      labels:
        app: learnhub-web
    spec:
      containers:
      - name: web
        image: learnhub/web:1.0.0
        ports:
        - containerPort: 3000
        resources:
          limits:
            cpu: "500m"
            memory: "512Mi"
          requests:
            cpu: "100m"
            memory: "128Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: learnhub-service
spec:
  type: ClusterIP
  selector:
    app: learnhub-web
  ports:
  - port: 80
    targetPort: 3000
\`\`\`

2. Exposing Services via Ingress:
Ingress acts as an HTTP/HTTPS reverse proxy (e.g., NGINX Ingress Controller) routing external hostnames to internal ClusterIP services.`,
            durationMinutes: 45,
            order: 2,
            published: true
          },
          {
            _id: new mongoose.Types.ObjectId(),
            title: "Automated CI/CD Pipelines with GitHub Actions & Helm",
            description: "Building automated testing, container image building, and continuous deployment workflows.",
            type: "article",
            videoUrl: "",
            content: `=== Automated CI/CD Pipelines with GitHub Actions & Helm ===

Modern DevOps relies on automated pipelines where every git push triggers test execution, security scans, container builds, and deployment.

1. GitHub Actions Deployment Workflow:
\`\`\`yaml
name: Production CI/CD

on:
  push:
    branches: [ master ]

jobs:
  test-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies & run tests
        run: |
          npm ci
          npm run lint
          npm test

      - name: Build and push Docker image
        run: |
          docker build -t registry.example.com/learnhub:\${{ github.sha }} .
          docker push registry.example.com/learnhub:\${{ github.sha }}

      - name: Deploy to Kubernetes via Helm
        run: |
          helm upgrade --install learnhub ./helm/learnhub \\
            --set image.tag=\${{ github.sha }}
\`\`\``,
            durationMinutes: 50,
            order: 3,
            published: true
          }
        ]
      }
    ]
  },

  // 10. SQL and MongoDB
  {
    slug: "database-engineering-sql-mongodb",
    title: "Database Engineering: Mastering SQL & MongoDB",
    description: "Compare and master both relational (PostgreSQL/MySQL) and non-relational (MongoDB) database architectures. Covers normalization, indexing, complex JOINs, aggregation pipelines, schema design, and ACID transactions.",
    category: "Data Science",
    instructor: "Priya Kapoor",
    instructorRole: "Database Administrator & Data Architect",
    price: 0,
    originalPrice: 2899,
    currency: "INR",
    image: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=1000&q=85",
    duration: "16 hours",
    lessons: 3,
    rating: 4.9,
    reviews: 2310,
    students: "18.2k",
    level: "All Levels",
    color: "violet",
    published: true,
    learn: [
      "Write advanced SQL queries with JOINs, aggregations, subqueries, and window functions",
      "Model document-based data and execute complex aggregation pipelines in MongoDB",
      "Design optimal database indexes (B-Tree, compound, unique) for fast query execution",
      "Understand ACID transactions, normalization, and trade-offs between SQL and NoSQL"
    ],
    modules: [
      {
        number: "01",
        title: "Relational & Document Database Paradigms",
        description: "Comparative database architecture, query optimization, and schema design.",
        summary: "3 comprehensive lessons on SQL, MongoDB aggregations, and indexing.",
        lessons: [
          {
            _id: new mongoose.Types.ObjectId(),
            title: "Relational Data Modeling & Advanced SQL Queries",
            description: "Table schemas, foreign keys, normalization (1NF-3NF), and multi-table JOINs.",
            type: "video",
            videoUrl: "https://www.youtube.com/watch?v=7S_tz1z_5bA",
            content: "Learn the mathematical principles of relational database management systems (RDBMS). Understand how tables enforce integrity constraints, how foreign keys guarantee referential integrity, and how SQL queries execute INNER, LEFT, RIGHT, and FULL OUTER JOINs with optimal query plans.\n\nHighlights:\n- Database normalization principles (1NF through 3NF)\n- GROUP BY, HAVING, and aggregate functions (COUNT, SUM, AVG)\n- Window functions: ROW_NUMBER(), RANK(), and PARTITION BY\n- Transaction isolation levels (Read Committed, Serializable)",
            durationMinutes: 35,
            order: 1,
            published: true
          },
          {
            _id: new mongoose.Types.ObjectId(),
            title: "MongoDB Schema Design & Aggregation Framework",
            description: "Embedded vs referenced relationships, BSON types, and aggregation pipelines.",
            type: "article",
            videoUrl: "",
            content: `=== MongoDB Schema Design & Aggregation Framework ===

MongoDB stores documents in flexible, binary JSON (BSON) format. Unlike relational databases, MongoDB encourages embedding data that is queried together.

1. Embedding vs Referencing Rule of Thumb:
- Embed when: data is 1-to-few, documents are read together, and data does not change independently (e.g. course lessons inside modules).
- Reference when: data is 1-to-many or many-to-many, documents grow unboundedly, or entities must be queried independently (e.g. users and enrollments).

2. MongoDB Aggregation Pipeline:
The aggregation pipeline processes documents through multi-stage sequences:

\`\`\`javascript
db.reviews.aggregate([
  // Stage 1: Filter reviews for a specific course
  { $match: { course: new ObjectId("65cc882455974eafb349959e") } },

  // Stage 2: Group by course and compute averages
  {
    $group: {
      _id: "$course",
      averageRating: { $avg: "$rating" },
      reviewCount: { $sum: 1 },
      fiveStarCount: {
        $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] }
      }
    }
  },

  // Stage 3: Round the average rating to 1 decimal place
  {
    $project: {
      _id: 1,
      averageRating: { $round: ["$averageRating", 1] },
      reviewCount: 1,
      fiveStarCount: 1
    }
  }
]);
\`\`\``,
            durationMinutes: 45,
            order: 2,
            published: true
          },
          {
            _id: new mongoose.Types.ObjectId(),
            title: "Indexing Strategies, Query Optimization & Transactions",
            description: "B-Tree indexes, compound indexes, EXPLAIN plans, and multi-document ACID transactions.",
            type: "article",
            videoUrl: "",
            content: `=== Indexing Strategies, Query Optimization & Transactions ===

Without indexes, every query results in a full table/collection scan (COLLSCAN) that degrades database performance as dataset size grows.

1. Compound Index Equality-Sort-Range (ESR) Rule:
When creating compound indexes in MongoDB or PostgreSQL, order index fields:
1. Equality fields first (exact matches).
2. Sort fields second.
3. Range fields last ($gt, $lt, IN).

\`\`\`javascript
// Optimal index for: find({ published: true, category: 'DevOps' }).sort({ createdAt: -1 })
courseSchema.index({ published: 1, category: 1, createdAt: -1 });
\`\`\`

2. Multi-Document ACID Transactions:
\`\`\`javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
  await Enrollment.create([{ user: userId, course: courseId }], { session });
  await Course.updateOne({ _id: courseId }, { $inc: { students: 1 } }, { session });

  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
\`\`\``,
            durationMinutes: 45,
            order: 3,
            published: true
          }
        ]
      }
    ]
  },

  // 11. Generative AI
  {
    slug: "generative-ai-llm-engineering",
    title: "Generative AI & LLM Engineering: Build Autonomous AI Apps",
    description: "Learn to build modern AI applications powered by Large Language Models (LLMs). Covers transformer architectures, prompt engineering, RAG (Retrieval-Augmented Generation), vector databases (Pinecone/Chroma), LangChain, and AI agents.",
    category: "AI & ML",
    instructor: "Dr. Anya Sharma",
    instructorRole: "AI Research Scientist & LangChain Contributor",
    price: 0,
    originalPrice: 4999,
    currency: "INR",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1000&q=85",
    duration: "20 hours",
    lessons: 3,
    rating: 4.9,
    reviews: 2780,
    students: "15.9k",
    level: "Intermediate",
    color: "purple",
    published: true,
    learn: [
      "Understand transformer neural network architectures and attention mechanisms",
      "Build production Retrieval-Augmented Generation (RAG) systems with vector embeddings",
      "Implement autonomous AI agents with tools, memory, and function calling",
      "Evaluate, benchmark, and deploy LLM applications with guardrails"
    ],
    modules: [
      {
        number: "01",
        title: "Transformers & LLM Fundamentals",
        description: "Transformer neural networks, self-attention mechanisms, and RAG architectures.",
        summary: "3 comprehensive lessons on models, vector search, and autonomous agents.",
        lessons: [
          {
            _id: new mongoose.Types.ObjectId(),
            title: "Understanding Transformers, Attention & Neural Networks",
            description: "How transformers process tokens, compute self-attention, and predict next tokens.",
            type: "video",
            videoUrl: "https://www.youtube.com/watch?v=aircAruvnKk",
            content: "Demystify the architecture behind ChatGPT and Gemini. Understand how words are converted to high-dimensional vector embeddings, how multi-head self-attention computes contextual relationships between distant words, and why transformers scale effectively on GPU clusters.\n\nHighlights:\n- Tokenization algorithms (Byte-Pair Encoding)\n- Query, Key, and Value matrices in scaled dot-product attention\n- Positional encodings and feed-forward neural layers\n- Temperature, Top-P, and nucleus sampling parameters",
            durationMinutes: 30,
            order: 1,
            published: true
          },
          {
            _id: new mongoose.Types.ObjectId(),
            title: "Retrieval-Augmented Generation (RAG) & Vector Databases",
            description: "Overcoming LLM context limits and hallucinations by grounding responses in private knowledge bases.",
            type: "article",
            videoUrl: "",
            content: `=== Retrieval-Augmented Generation (RAG) & Vector Databases ===

Retrieval-Augmented Generation (RAG) allows LLMs to answer questions using private or real-time documents without expensive model fine-tuning.

1. The RAG Pipeline Architecture:
1. Ingestion: Document chunking (e.g. 500-token chunks with 50-token overlap).
2. Embedding: Convert text chunks to vector embeddings using embedding models.
3. Indexing: Store embeddings in a Vector Database (Chroma, Pinecone, or MongoDB Atlas Vector Search).
4. Retrieval: For a user query, compute cosine similarity to find top-K most relevant chunks.
5. Generation: Inject retrieved chunks into the prompt context for the LLM.

2. Implementing RAG with Vector Search:
\`\`\`javascript
async function answerQuestionWithRAG(userQuery) {
  // Step 1: Generate embedding for user query
  const queryEmbedding = await generateEmbedding(userQuery);

  // Step 2: Vector search top 3 relevant chunks
  const relevantDocs = await vectorDatabase.query({
    vector: queryEmbedding,
    topK: 3
  });

  const contextText = relevantDocs.map(d => d.text).join('\\n---\\n');

  // Step 3: Prompt LLM with ground truth context
  const response = await callLLM({
    systemPrompt: "Answer questions using ONLY the provided context. If unsure, say 'I do not know'.",
    userPrompt: \`Context:\\n\${contextText}\\n\\nQuestion: \${userQuery}\`
  });

  return response;
}
\`\`\``,
            durationMinutes: 50,
            order: 2,
            published: true
          },
          {
            _id: new mongoose.Types.ObjectId(),
            title: "Building Autonomous AI Agents with Tool Calling",
            description: "Empowering LLMs to reason, plan, select tools, and execute actions in feedback loops.",
            type: "article",
            videoUrl: "",
            content: `=== Building Autonomous AI Agents with Tool Calling ===

AI Agents combine LLM reasoning capabilities with tools (calculators, web search, database queries) to achieve multi-step objectives autonomously.

1. The ReAct (Reason + Act) Loop:
1. Thought: The agent analyzes the user request and reasons about what to do next.
2. Action: The agent decides which tool to call and with what parameters.
3. Observation: The tool executes and returns real-world output back to the agent.
4. Repeat or Finish: The agent evaluates the output until the goal is achieved.

2. Defining Structured Tools for Function Calling:
\`\`\`javascript
const tools = [
  {
    type: "function",
    function: {
      name: "lookupCoursePrice",
      description: "Returns the current price and discount for a course slug",
      parameters: {
        type: "object",
        properties: {
          slug: { type: "string", description: "The course slug" }
        },
        required: ["slug"]
      }
    }
  }
];
\`\`\`

3. Best Practices for Production Agents:
- Implement a maximum recursion iteration limit (e.g., max 10 steps) to prevent infinite reasoning loops.
- Use structured JSON outputs with schema validation (Zod) for reliable deterministic responses.`,
            durationMinutes: 45,
            order: 3,
            published: true
          }
        ]
      }
    ]
  },

  // 12. Full Stack Web Development
  {
    slug: "complete-fullstack-web-development-masterclass",
    title: "Complete Full Stack Web Development: Modern Web Engineering",
    description: "The definitive guide to becoming a production-ready full-stack software engineer. Covers frontend systems, backend architectures, relational and NoSQL databases, REST & GraphQL APIs, security, and cloud deployment.",
    category: "Web Development",
    instructor: "James O'Connor",
    instructorRole: "VP of Engineering & Tech Author",
    price: 0,
    originalPrice: 4499,
    currency: "INR",
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1000&q=85",
    duration: "32 hours",
    lessons: 3,
    rating: 4.9,
    reviews: 3860,
    students: "27.3k",
    level: "All Levels",
    color: "rose",
    published: true,
    learn: [
      "Architect complete end-to-end full-stack applications with modern web standards",
      "Design robust RESTful and GraphQL APIs with authentication and validation",
      "Implement responsive frontend interfaces with state management and caching",
      "Secure applications against OWASP top vulnerabilities (CSRF, XSS, injection)"
    ],
    modules: [
      {
        number: "01",
        title: "Full Stack Systems Engineering",
        description: "Full-stack system architecture, API security, and deployment pipelines.",
        summary: "3 comprehensive lessons on architecture, security, and cloud deployment.",
        lessons: [
          {
            _id: new mongoose.Types.ObjectId(),
            title: "Modern Full Stack Architecture & End-to-End Workflows",
            description: "How modern full-stack systems coordinate client, edge, server, and database layers.",
            type: "video",
            videoUrl: "https://www.youtube.com/watch?v=nu_pCVPKzTk",
            content: "Understand how large-scale enterprise web applications are structured from top to bottom. Follow the lifecycle of an HTTP request as it traverses DNS, CDN edge caches, reverse proxies, application servers, and persistent data tiers.\n\nHighlights:\n- Monoliths vs Microservices vs Serverless architectures\n- API contract design: REST, GraphQL, and tRPC\n- Database selection criteria: SQL vs Document vs Key-Value\n- Continuous integration and automated deployment",
            durationMinutes: 40,
            order: 1,
            published: true
          },
          {
            _id: new mongoose.Types.ObjectId(),
            title: "API Security, Authentication Protocols & Data Integrity",
            description: "Protecting applications against OWASP Top 10 vulnerabilities, CSRF, XSS, and SQL/NoSQL injection.",
            type: "article",
            videoUrl: "",
            content: `=== API Security, Authentication Protocols & Data Integrity ===

Building full-stack software requires adhering to the principle of defense-in-depth across every architectural tier.

1. Cross-Site Request Forgery (CSRF) Mitigation:
Protect state-changing endpoints (POST/PUT/DELETE) by validating Origin and Sec-Fetch-Site headers:

\`\`\`javascript
export function verifyCsrfOrigin(request) {
  const secFetchSite = request.headers.get('sec-fetch-site');
  if (secFetchSite === 'cross-site') {
    return { ok: false, error: 'Cross-origin request blocked' };
  }

  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (origin && new URL(origin).host !== host) {
    return { ok: false, error: 'Origin mismatch' };
  }

  return { ok: true };
}
\`\`\`

2. Defending Against Injection Attacks:
- For SQL: Always use parameterized queries or trusted ORMs. Never concatenate user strings into raw SQL.
- For NoSQL (MongoDB): Sanitize keys in request bodies to prevent operator injection attacks (e.g. '{"$gt": ""}').`,
            durationMinutes: 45,
            order: 2,
            published: true
          },
          {
            _id: new mongoose.Types.ObjectId(),
            title: "Full Stack Deployment, Monitoring & Performance Audits",
            description: "Web vitals optimization, structured logging, error tracking, and cloud hosting.",
            type: "article",
            videoUrl: "",
            content: `=== Full Stack Deployment, Monitoring & Performance Audits ===

Shipping to production is only the beginning. Monitoring reliability and performance guarantees high user retention.

1. Core Web Vitals to Track:
- LCP (Largest Contentful Paint): Under 2.5 seconds.
- INP (Interaction to Next Paint): Under 200 milliseconds.
- CLS (Cumulative Layout Shift): Under 0.1.

2. Production Error Logging & Telemetry:
Never log raw database connection strings, passwords, or session tokens. Scrub diagnostic payloads before writing to application log streams.

3. Final Deployment Checklist:
- Set 'NODE_ENV=production' to enable production optimizations.
- Verify security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options).
- Ensure database connections use least-privilege credentials and connection pooling.`,
            durationMinutes: 50,
            order: 3,
            published: true
          }
        ]
      }
    ]
  }
];
