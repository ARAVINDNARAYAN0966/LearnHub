import mongoose from "mongoose";
import User from "../../../models/User";
import { getCurrentUser } from "../../../lib/auth";
import { authJson, logAuthFailure } from "../../../lib/auth-http";
import { verifyCsrfOrigin } from "../../../lib/csrf";
import { getUserProfile } from "../../../lib/profile-data";
import { connectToDatabase, isDatabaseConnectionError } from "../../../lib/mongodb";

function databaseFailureStatus(error) {
  return isDatabaseConnectionError(error) ? 503 : 500;
}

export async function GET() {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    logAuthFailure("Profile session check", error);
    return authJson({ error: "Unable to verify your session." }, databaseFailureStatus(error));
  }

  if (!user) {
    return authJson({ error: "Authentication required." }, 401);
  }

  try {
    const profile = await getUserProfile(user.id);
    if (!profile) {
      return authJson({ error: "User profile not found." }, 404);
    }
    return authJson({ profile });
  } catch (error) {
    logAuthFailure("Profile retrieval", error);
    return authJson({ error: "Unable to load profile right now." }, databaseFailureStatus(error));
  }
}

export async function PATCH(request) {
  const csrf = verifyCsrfOrigin(request);
  if (!csrf.ok) return csrf.response;

  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    logAuthFailure("Profile update session check", error);
    return authJson({ error: "Unable to verify your session." }, databaseFailureStatus(error));
  }

  if (!user) {
    return authJson({ error: "Authentication required." }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return authJson({ error: "Invalid request body." }, 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return authJson({ error: "Invalid request body." }, 400);
  }

  // Security: Prevent Mass Assignment - Explicitly block forbidden fields
  if ("email" in body || "role" in body || "passwordHash" in body || "tokenVersion" in body || "_id" in body || "id" in body) {
    return authJson(
      { error: "Email, role, and system credentials cannot be modified through profile settings." },
      400,
    );
  }

  const updateFields = {};

  // 1. Name validation
  if ("name" in body) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return authJson({ error: "A non-empty full name is required." }, 400);
    }
    const trimmedName = body.name.trim();
    if (trimmedName.length > 100) {
      return authJson({ error: "Name must be 100 characters or fewer." }, 400);
    }
    updateFields.name = trimmedName;
  }

  // 2. Headline
  if ("headline" in body) {
    if (typeof body.headline !== "string") {
      return authJson({ error: "Headline must be text." }, 400);
    }
    const trimmedHeadline = body.headline.trim();
    if (trimmedHeadline.length > 120) {
      return authJson({ error: "Headline must be 120 characters or fewer." }, 400);
    }
    updateFields.headline = trimmedHeadline;
  }

  // 3. Bio
  if ("bio" in body) {
    if (typeof body.bio !== "string") {
      return authJson({ error: "Bio must be text." }, 400);
    }
    const trimmedBio = body.bio.trim();
    if (trimmedBio.length > 1000) {
      return authJson({ error: "Bio must be 1000 characters or fewer." }, 400);
    }
    updateFields.bio = trimmedBio;
  }

  // 4. Location
  if ("location" in body) {
    if (typeof body.location !== "string") {
      return authJson({ error: "Location must be text." }, 400);
    }
    const trimmedLocation = body.location.trim();
    if (trimmedLocation.length > 100) {
      return authJson({ error: "Location must be 100 characters or fewer." }, 400);
    }
    updateFields.location = trimmedLocation;
  }

  // 5. Website
  if ("website" in body) {
    if (typeof body.website !== "string") {
      return authJson({ error: "Website must be a valid URL string." }, 400);
    }
    const trimmedWebsite = body.website.trim();
    if (trimmedWebsite.length > 250) {
      return authJson({ error: "Website URL must be 250 characters or fewer." }, 400);
    }
    if (trimmedWebsite && !/^https?:\/\//i.test(trimmedWebsite)) {
      return authJson({ error: "Website URL must start with http:// or https://." }, 400);
    }
    updateFields.website = trimmedWebsite;
  }

  // 6. GitHub
  if ("github" in body) {
    if (typeof body.github !== "string") {
      return authJson({ error: "GitHub handle must be text." }, 400);
    }
    const trimmedGithub = body.github.trim().replace(/^@/, "");
    if (trimmedGithub.length > 100) {
      return authJson({ error: "GitHub handle must be 100 characters or fewer." }, 400);
    }
    updateFields.github = trimmedGithub;
  }

  // 7. LinkedIn
  if ("linkedin" in body) {
    if (typeof body.linkedin !== "string") {
      return authJson({ error: "LinkedIn handle must be text." }, 400);
    }
    const trimmedLinkedin = body.linkedin.trim();
    if (trimmedLinkedin.length > 100) {
      return authJson({ error: "LinkedIn handle must be 100 characters or fewer." }, 400);
    }
    updateFields.linkedin = trimmedLinkedin;
  }

  // 8. Avatar URL
  if ("avatarUrl" in body) {
    if (typeof body.avatarUrl !== "string") {
      return authJson({ error: "Avatar URL must be a valid string." }, 400);
    }
    const trimmedAvatar = body.avatarUrl.trim();
    if (trimmedAvatar.length > 2048) {
      return authJson({ error: "Avatar URL must be 2048 characters or fewer." }, 400);
    }
    if (trimmedAvatar && !/^https:\/\//i.test(trimmedAvatar)) {
      return authJson({ error: "Avatar URL must use secure HTTPS." }, 400);
    }
    updateFields.avatarUrl = trimmedAvatar;
  }

  if (Object.keys(updateFields).length === 0) {
    return authJson({ error: "No editable profile fields provided." }, 400);
  }

  try {
    await connectToDatabase();
    const updatedUser = await User.findByIdAndUpdate(
      user.id,
      { $set: updateFields },
      { new: true, runValidators: true },
    )
      .select("name email username role headline bio location website github linkedin avatarUrl updatedAt")
      .lean();

    if (!updatedUser) {
      return authJson({ error: "User account not found." }, 404);
    }

    return authJson({
      message: "Profile updated successfully.",
      profile: {
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        username: updatedUser.username || "",
        role: updatedUser.role,
        headline: updatedUser.headline || "",
        bio: updatedUser.bio || "",
        location: updatedUser.location || "",
        website: updatedUser.website || "",
        github: updatedUser.github || "",
        linkedin: updatedUser.linkedin || "",
        avatarUrl: updatedUser.avatarUrl || "",
        updatedAt: updatedUser.updatedAt?.toISOString() || null,
      },
    });
  } catch (error) {
    logAuthFailure("Profile update execution", error);
    return authJson(
      { error: "Unable to update profile right now." },
      databaseFailureStatus(error),
    );
  }
}
