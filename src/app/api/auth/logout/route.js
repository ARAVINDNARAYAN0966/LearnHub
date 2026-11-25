import { clearSession, getCurrentUser, revokeUserSessions } from "../../../../lib/auth";
import { authJson, logAuthFailure } from "../../../../lib/auth-http";
import { verifyCsrfOrigin } from "../../../../lib/csrf";

export async function POST(request) {
  const csrf = verifyCsrfOrigin(request);
  if (!csrf.ok) return csrf.response;

  try {
    const user = await getCurrentUser();
    if (user) {
      await revokeUserSessions(user.id);
    }
    await clearSession();
    return authJson({ success: true });
  } catch (error) {
    logAuthFailure("Logout", error);
    return authJson({ error: "Unable to sign out right now." }, 500);
  }
}
