/**
 * Generates a clean, valid, professional vector PDF (PDF-1.4) certificate of completion.
 * No external native binaries or npm packages required.
 */

function escapePdfText(str) {
  if (!str) return "";
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

export function generateCertificatePdf({
  certificateId,
  recipientName,
  courseTitle,
  instructorName,
  issuedAt,
  verificationUrl,
}) {
  const safeId = escapePdfText(certificateId || "LH-UNKNOWN");
  const safeRecipient = escapePdfText(recipientName || "Learner");
  const safeCourse = escapePdfText(courseTitle || "Course");
  const safeInstructor = escapePdfText(instructorName || "LearnHub Instructor");
  const dateStr = issuedAt
    ? new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date(issuedAt))
    : new Date().toLocaleDateString("en-US");
  const safeDate = escapePdfText(dateStr);
  const safeVerify = escapePdfText(
    verificationUrl || `https://learnhub.example/certificates/verify?id=${certificateId}`,
  );

  // Landscape A4 dimensions: 842 pt width x 595 pt height
  const width = 842;
  const height = 595;

  // Stream content drawing background borders, accents, and text
  const streamContent = [
    // Background fill (light parchment / clean ivory)
    "q",
    "0.988 0.984 0.976 rg",
    `0 0 ${width} ${height} re f`,

    // Outer gold border (stroke 4pt)
    "0.85 0.58 0.12 RG",
    "4 w",
    `28 28 ${width - 56} ${height - 56} re S`,

    // Inner thin border (stroke 1pt)
    "0.7 0.65 0.6 RG",
    "1 w",
    `36 36 ${width - 72} ${height - 72} re S`,

    // Corner decorative accents
    "0.85 0.58 0.12 RG",
    "2 w",
    "44 44 m 60 44 l S",
    "44 44 m 44 60 l S",
    `${width - 44} 44 m ${width - 60} 44 l S`,
    `${width - 44} 44 m ${width - 44} 60 l S`,
    `44 ${height - 44} m 60 ${height - 44} l S`,
    `44 ${height - 44} m 44 ${height - 60} l S`,
    `${width - 44} ${height - 44} m ${width - 60} ${height - 44} l S`,
    `${width - 44} ${height - 44} m ${width - 44} ${height - 60} l S`,
    "Q",

    // Header: LEARNHUB
    "BT",
    "/F2 20 Tf",
    "0.85 0.52 0.08 rg",
    "1 0 0 1 370 515 Tm",
    "(LEARNHUB) Tj",
    "ET",

    // Eyebrow: CERTIFICATE OF COMPLETION
    "BT",
    "/F2 10 Tf",
    "0.45 0.42 0.5 rg",
    "1 0 0 1 315 488 Tm",
    "(OFFICIAL CERTIFICATE OF COURSE COMPLETION) Tj",
    "ET",

    // Presentation intro
    "BT",
    "/F1 13 Tf",
    "0.35 0.32 0.4 rg",
    "1 0 0 1 350 440 Tm",
    "(This is proudly presented to) Tj",
    "ET",

    // Recipient Name
    "BT",
    "/F2 28 Tf",
    "0.12 0.1 0.18 rg",
    `1 0 0 1 ${Math.max(60, 421 - safeRecipient.length * 7)} 390 Tm`,
    `(${safeRecipient}) Tj`,
    "ET",

    // Underline beneath name
    "q",
    "0.85 0.58 0.12 RG",
    "1.5 w",
    "240 375 m 602 375 l S",
    "Q",

    // Completion explanation
    "BT",
    "/F1 11 Tf",
    "0.4 0.38 0.45 rg",
    "1 0 0 1 200 340 Tm",
    "(for successfully fulfilling all lessons, assignments, and verified requirements of:) Tj",
    "ET",

    // Course Title
    "BT",
    "/F2 20 Tf",
    "0.15 0.12 0.22 rg",
    `1 0 0 1 ${Math.max(60, 421 - safeCourse.length * 5.5)} 295 Tm`,
    `(${safeCourse}) Tj`,
    "ET",

    // Instructor and Date section
    "q",
    "0.75 0.72 0.7 RG",
    "0.8 w",
    "120 200 m 722 200 l S",
    "Q",

    // Column 1: Instructor
    "BT",
    "/F1 9 Tf",
    "0.5 0.48 0.55 rg",
    "1 0 0 1 140 180 Tm",
    "(COURSE INSTRUCTOR) Tj",
    "ET",
    "BT",
    "/F2 12 Tf",
    "0.15 0.12 0.2 rg",
    "1 0 0 1 140 162 Tm",
    `(${safeInstructor}) Tj`,
    "ET",

    // Column 2: Date Issued
    "BT",
    "/F1 9 Tf",
    "0.5 0.48 0.55 rg",
    "1 0 0 1 370 180 Tm",
    "(DATE OF ISSUANCE) Tj",
    "ET",
    "BT",
    "/F2 12 Tf",
    "0.15 0.12 0.2 rg",
    "1 0 0 1 370 162 Tm",
    `(${safeDate}) Tj`,
    "ET",

    // Column 3: Credential ID
    "BT",
    "/F1 9 Tf",
    "0.5 0.48 0.55 rg",
    "1 0 0 1 580 180 Tm",
    "(CREDENTIAL ID) Tj",
    "ET",
    "BT",
    "/F2 12 Tf",
    "0.15 0.12 0.2 rg",
    "1 0 0 1 580 162 Tm",
    `(${safeId}) Tj`,
    "ET",

    // Footer verification text
    "BT",
    "/F1 8 Tf",
    "0.55 0.52 0.6 rg",
    "1 0 0 1 230 75 Tm",
    `(${safeVerify}) Tj`,
    "ET",
    "BT",
    "/F1 7.5 Tf",
    "0.6 0.58 0.65 rg",
    "1 0 0 1 290 60 Tm",
    "(Issued by LearnHub Platform · Verified Academic Placement Portfolio Release) Tj",
    "ET",
  ].join("\n");

  const streamLength = Buffer.byteLength(streamContent, "utf8");

  // Construct standard PDF objects
  const objects = [];

  // Object 1: Catalog
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");

  // Object 2: Pages
  objects.push(
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj",
  );

  // Object 3: Page
  objects.push(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj`,
  );

  // Object 4: Font F1 (Helvetica regular)
  objects.push(
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj",
  );

  // Object 5: Font F2 (Helvetica bold)
  objects.push(
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj",
  );

  // Object 6: Stream content
  objects.push(
    `6 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj`,
  );

  // Build binary buffer with precise byte offsets for xref
  let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets = [];

  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${obj}\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

  for (const off of offsets) {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "utf8");
}
