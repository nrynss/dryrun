// Small, browser-independent pieces of resume ingestion. Keeping these here
// lets the UI own PDF decoding while the file type and text handling remain
// easy to exercise without a DOM or a real file picker.

export const ACCEPTED_RESUME_FILE_TYPES = Object.freeze([
  '.pdf',
  '.txt',
  '.md',
]);

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
