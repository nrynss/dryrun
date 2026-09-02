import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createServer } from 'vite';
import {
  ACCEPTED_RESUME_FILE_TYPES,
  hasExtractablePdfText,
  isAcceptedResumeFile,
  isPasswordProtectedPdfError,
  MIN_EXTRACTABLE_PDF_CHARS,
  prepareUploadedResumeText,
} from '../src/lib/resume-input.js';

test('resume upload accepts the documented PDF, TXT, and MD extensions', () => {
  assert.deepEqual(ACCEPTED_RESUME_FILE_TYPES, ['.pdf', '.txt', '.md']);
  for (const name of ['resume.pdf', 'CV.TXT', 'profile.Md']) {
    assert.equal(isAcceptedResumeFile(name), true, name);
  }
  for (const name of ['resume.docx', 'resume.pdf.exe', '', null]) {
    assert.equal(isAcceptedResumeFile(name), false, String(name));
  }
});

test('uploaded text is trimmed and only clips at the resume cap', () => {
  assert.deepEqual(prepareUploadedResumeText('  concise CV  ', 20), {
    text: 'concise CV',
    truncated: false,
  });
  assert.deepEqual(prepareUploadedResumeText('123456789', 5), {
    text: '12345',
    truncated: true,
  });
});

test('PDF scan and password failures are distinct, while short text uploads remain valid', () => {
  assert.equal(hasExtractablePdfText('x'.repeat(MIN_EXTRACTABLE_PDF_CHARS - 1)), false);
  assert.equal(hasExtractablePdfText('x'.repeat(MIN_EXTRACTABLE_PDF_CHARS)), true);
  assert.equal(isPasswordProtectedPdfError({ name: 'PasswordException' }), true);
  assert.equal(isPasswordProtectedPdfError(new Error('broken PDF')), false);

  // The scan threshold is intentionally not a general resume threshold: the
  // downstream fit match is responsible for identifying non-CV content.
  assert.deepEqual(prepareUploadedResumeText('short CV excerpt', 20), {
    text: 'short CV excerpt',
    truncated: false,
  });
});

test('the chooser resolves the PDF worker through Vite and keeps pasted text in session state', () => {
  const chooser = readFileSync(new URL('../src/lib/FileChooser.svelte', import.meta.url), 'utf8');
  const start = readFileSync(new URL('../src/lib/Start.svelte', import.meta.url), 'utf8');
  const practice = readFileSync(new URL('../src/lib/Practice.svelte', import.meta.url), 'utf8');

  assert.match(chooser, /new URL\(\s*'pdfjs-dist\/build\/pdf\.worker\.min\.mjs',\s*import\.meta\.url/);
  assert.match(chooser, /await getDocument\(\{ data \}\)\.promise/);
  assert.match(chooser, /const isPdf = \/\\\.pdf\$\/i\.test\(file\.name\);\s*\n\s*try \{/);
  assert.match(chooser, /if \(isPdf && !hasExtractablePdfText\(text\)\)/);
  assert.match(chooser, /isPasswordProtectedPdfError\(err\) \? copy\.err\.pdf_locked : copy\.err\.pdf_scan/);
  assert.match(chooser, /: copy\.err\.unknown;/);
  assert.match(chooser, /session\.resume = text/);
  assert.match(start, /bind:value=\{session\.resume\}/);
  // Non-CV text is intentionally decided by fit matching, not a brittle file
  // heuristic. Its low-confidence notice leaves the advert-led practice run
  // available, as required by design state 8.
  assert.match(practice, /session\.fitMatch\?\.confidence === 'low'/);
  assert.match(practice, /message=\{copy\.warn\.not_cv\}/);
});

test('the Practice component keeps a low-confidence CV notice non-blocking', async (t) => {
  const vite = await createServer({
    configFile: new URL('../vite.config.js', import.meta.url).pathname,
    server: { middlewareMode: true },
    appType: 'custom',
  });
  t.after(() => vite.close());

  const { session } = await vite.ssrLoadModule('/src/lib/session.svelte.js');
  session.fitMatch = { confidence: 'low' };
  session.current = 0;
  session.questions = [{
    prompt: 'Tell us about your experience.',
    sourceQuote: 'Experience matters.',
    answer: '',
    scores: null,
    missed: [],
  }];
  const { default: Practice } = await vite.ssrLoadModule('/src/lib/Practice.svelte');
  const { render } = await vite.ssrLoadModule('svelte/server');
  const { body } = render(Practice);

  assert.match(body, /class="strip strip-note[^]*?role="status"/);
  assert.match(
    body.replace(/<[^>]+>/g, ''),
    /That file did not read like a CV, so we skipped that part\. Your questions still come from the job advert\./,
  );
  assert.match(body, />Next question</);
});
