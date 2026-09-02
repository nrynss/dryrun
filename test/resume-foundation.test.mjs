import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  ACCEPTED_RESUME_FILE_TYPES,
  isAcceptedResumeFile,
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

test('the chooser resolves the PDF worker through Vite and keeps pasted text in session state', () => {
  const chooser = readFileSync(new URL('../src/lib/FileChooser.svelte', import.meta.url), 'utf8');
  const start = readFileSync(new URL('../src/lib/Start.svelte', import.meta.url), 'utf8');

  assert.match(chooser, /new URL\(\s*'pdfjs-dist\/build\/pdf\.worker\.min\.mjs',\s*import\.meta\.url/);
  assert.match(chooser, /await getDocument\(\{ data \}\)\.promise/);
  assert.match(start, /bind:value=\{session\.resume\}/);
});
