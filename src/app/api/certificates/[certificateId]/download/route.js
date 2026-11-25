import Certificate from "../../../../../models/Certificate";
import { generateCertificatePdf } from "../../../../../lib/certificate-pdf";
import {
  connectToDatabase,
  isDatabaseConnectionError,
} from "../../../../../lib/mongodb";

function databaseFailureStatus(error) {
  return isDatabaseConnectionError(error) ? 503 : 500;
}

export async function GET(request, { params }) {
  const { certificateId } = await params;
  const cleanId =
    typeof certificateId === "string" ? certificateId.trim().toUpperCase() : "";

  if (!cleanId || cleanId.length < 5 || cleanId.length > 50) {
    return new Response(
      JSON.stringify({ error: "A valid certificate ID is required." }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  try {
    await connectToDatabase();

    const cert = await Certificate.findOne({ certificateId: cleanId }).lean();
    if (!cert) {
      return new Response(
        JSON.stringify({ error: "Certificate not found or invalid." }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const host =
      request?.headers?.get?.("host") ||
      request?.headers?.get?.("x-forwarded-host") ||
      "learnhub.example";
    const proto =
      request?.headers?.get?.("x-forwarded-proto") ||
      (host.includes("localhost") ? "http" : "https");
    const verificationUrl = `${proto}://${host}/certificates/verify?id=${cleanId}`;

    const pdfBuffer = generateCertificatePdf({
      certificateId: cert.certificateId,
      recipientName: cert.recipientName,
      courseTitle: cert.courseTitle,
      instructorName: cert.instructorName,
      issuedAt: cert.issuedAt || cert.createdAt,
      verificationUrl,
    });

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="learnhub-certificate-${cleanId}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Unable to generate certificate PDF." }),
      {
        status: databaseFailureStatus(error),
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
