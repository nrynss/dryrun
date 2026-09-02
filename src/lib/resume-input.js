// Small, browser-independent pieces of resume ingestion. Keeping these here
// lets the UI own PDF decoding while the file type and text handling remain
// easy to exercise without a DOM or a real file picker.

export const ACCEPTED_RESUME_FILE_TYPES = Object.freeze([
  '.pdf',
  '.txt',
  '.md',
]);

// A PDF with fewer than this many extracted characters is almost certainly an
// image-only scan. This belongs to PDFs only: a person may deliberately paste
// a short CV excerpt into a TXT or MD file.
export const MIN_EXTRACTABLE_PDF_CHARS = 40;

export function isAcceptedResumeFile(fileName) {
  return typeof fileName === 'string' && /\.(pdf|txt|md)$/i.test(fileName);
}

export function prepareUploadedResumeText(rawText, maxChars) {
  const text = String(rawText ?? '').trim();
  return {
    text: text.slice(0, maxChars),
    truncated: text.length > maxChars,
  };
}

export function hasExtractablePdfText(text) {
  return String(text ?? '').trim().length >= MIN_EXTRACTABLE_PDF_CHARS;
}

// PDF.js identifies password-protected documents with this stable error name.
// Keep the check isolated so other extraction errors remain scan/read failures
// instead of accidentally claiming a password was supplied.
export function isPasswordProtectedPdfError(error) {
  return error?.name === 'PasswordException';
}
