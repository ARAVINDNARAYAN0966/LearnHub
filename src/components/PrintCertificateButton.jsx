"use client";

export default function PrintCertificateButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="button button-primary cursor-pointer text-sm py-2 px-4 rounded-lg font-medium shadow-sm hover:opacity-90 transition-opacity"
    >
      Print / Save as PDF
    </button>
  );
}
