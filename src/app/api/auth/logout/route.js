import { clearSession } from "../../../../lib/auth";
import { authJson, logAuthFailure } from "../../../../lib/auth-http";

export async function POST() {
  try {
    await clearSession();
    return authJson({ success: true });
  } catch (error) {
    logAuthFailure("Logout", error);
    return authJson({ error: "Unable to sign out right now." }, 500);
  }
}
