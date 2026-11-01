"use client";

/** Opens the browser's print dialog; "Save as PDF" there gives a PDF of the CV (print styles hide the site chrome). */
export function PrintButton({ className }: { className?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      ⤓ Download PDF
    </button>
  );
}
