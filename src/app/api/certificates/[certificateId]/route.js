import Certificate from "../../../../models/Certificate";
import { authJson } from "../../../../lib/auth-http";
import {
  connectToDatabase,
  isDatabaseConnectionError,
} from "../../../../lib/mongodb";

function databaseFailureStatus(error) {
  return isDatabaseConnectionError(error) ? 503 : 500;
}

export async function GET(_request, { params }) {
  const { certificateId } = await params;
  const cleanId = typeof certificateId === "string" ? certificateId.trim().toUpperCase() : "";

  if (!cleanId || cleanId.length < 5 || cleanId.length > 50) {
    return authJson({ error: "A valid certificate ID is required." }, 400);
  }

  try {
    await connectToDatabase();

    const cert = await Certificate.findOne({ certificateId: cleanId }).lean();
    if (!cert) {
      return authJson(
        { valid: false, error: "Certificate not found or invalid." },
        404,
      );
    }

    return authJson({
      valid: true,
      certificate: {
        certificateId: cert.certificateId,
        recipientName: cert.recipientName,
        courseTitle: cert.courseTitle,
        instructorName: cert.instructorName,
        issuedAt: (cert.issuedAt || cert.createdAt).toISOString(),
        verificationUrl: `/certificates/verify?id=${cert.certificateId}`,
        downloadUrl: `/api/certificates/${cert.certificateId}/download`,
      },
    });
  } catch (error) {
    return authJson(
      { error: "Unable to verify certificate right now." },
      databaseFailureStatus(error),
    );
  }
}
