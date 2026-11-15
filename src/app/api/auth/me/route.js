import { getCurrentUser } from "../../../../lib/auth";
import { authJson, logAuthFailure } from "../../../../lib/auth-http";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return authJson({ error: "Authentication required." }, 401);
    }

    return authJson({ user });
  } catch (error) {
    logAuthFailure("Session lookup", error);
    return authJson({ error: "Unable to verify your session." }, 500);
  }
}
