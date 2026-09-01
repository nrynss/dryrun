<script>
  // File chooser — dev-diary/design.md 8.4. A secondary-button look on a
  // <label> wired to a visually hidden <input type="file"> (a label cannot
  // nest a <button>, and 8.4 requires the label wiring). Extracted text goes
  // straight into session.resume — R1 — which the CV text box binds, so the
  // box shows the file without a local copy of the text.
  //
  // T16 scope handles the scan, locked and too-long cases. The full
  // four-mode matrix (including err.file_type) is T23's job.
  import Button from './Button.svelte';
  import MessageStrip from './MessageStrip.svelte';
  import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
  import { copy } from './copy.js';
  import { session, MAX_RESUME_CHARS } from './session.svelte.js';

  // Same-origin worker for pdf.js (pdfjs-dist is a declared dependency).
  GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).href;

  let fileName = $state(null); // non-null once a file has been read
  let error = $state(null); // copy string for a --stop strip, or null
  let warning = $state(null); // copy string for a --almost strip, or null

  let inputId = `file-${Math.random().toString(36).slice(2)}`;

  async function readFile(file) {
    error = null;
    warning = null;
    try {
      let text = /\.pdf$/i.test(file.name) ? await extractPdf(file) : await file.text();
      text = text.trim();

      // State 4: under 40 characters trimmed reads as no words at all.
      if (text.length < 40) {
        error = copy.err.pdf_scan;
        return;
      }

      // State 7: over the cap, keep the first 20,000 characters.
      if (text.length > MAX_RESUME_CHARS) {
        text = text.slice(0, MAX_RESUME_CHARS);
        warning = copy.warn.cv_long;
      }

      session.resume = text;
      fileName = file.name;
    } catch (err) {
      // One catch covers the extraction modes in T16's scope: a password
      // exception is its own message, everything else is a scan failure.
      // State 5 (locked) and state 4 (scan); T23 owns the full matrix.
      error = err?.name === 'PasswordException' ? copy.err.pdf_locked : copy.err.pdf_scan;
    }
  }

  async function extractPdf(file) {
    const data = await file.arrayBuffer();
    const pdf = await getDocument({ data }).promise;
    let text = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      text += content.items.map((item) => item.str).join(' ') + '\n';
    }
    return text;
  }

  function onRemove() {
    // Remove clears the CV box too: the box binds session.resume (R1).
    session.resume = null;
    fileName = null;
    error = null;
    warning = null;
  }
</script>

<div class="chooser">
  {#if fileName}
    <div class="file-row">
      <span class="t-small name">
        <span class="tick" aria-hidden="true">✓</span>
        {fileName}
      </span>
      <Button variant="quiet" onclick={onRemove}>{copy.btn.remove_file}</Button>
    </div>
  {:else}
    <input
      {inputId}
      class="sr-only"
      type="file"
      accept=".pdf,.txt,.md,text/plain,text/markdown,application/pdf"
      onchange={(event) => {
        const file = event.currentTarget.files?.[0];
        if (file) readFile(file);
      }}
    />
    <!-- The label is the visible control; the input is hidden behind it. -->
    <label for={inputId} class="file-btn t-button">{copy.btn.choose_file}</label>
  {/if}

  <!-- 8.4: the privacy note is always visible, 12px below the control. -->
  <p class="t-small privacy">{copy.start.privacy}</p>

  {#if error}
    <MessageStrip kind="stop" role="alert" message={error} />
  {/if}
  {#if warning}
    <MessageStrip kind="almost" role="status" message={warning} />
  {/if}
</div>

<style>
  .chooser {
    width: 100%;
  }

  /* The file input is hidden from view but stays focusable, so keyboard
     users reach the label's control; the focus ring lands on the label. */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    overflow: hidden;
    white-space: nowrap;
  }

  /* Same look as Button's secondary variant (8.2 table): a <label> cannot
     nest a <button>, so the secondary-button styles are restated here. */
  .file-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--card);
    color: var(--ink);
    border: 1px solid var(--edge-firm);
    height: 48px;
    width: 100%;
    border-radius: 10px;
    padding-inline: 20px;
    cursor: pointer;
    text-align: center;
  }
  .file-btn:hover {
    background: var(--band);
  }
  .sr-only:focus-visible + .file-btn {
    outline: 3px solid var(--ink);
    outline-offset: 2px;
    border-radius: 6px;
  }

  /* 8.4: after a successful read the button is replaced by this row. */
  .file-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 48px; /* the Remove button is 48px; keep the row honest */
  }
  .name {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--ink);
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .tick {
    color: var(--strong);
  }

  .privacy {
    margin: 12px 0 0 0;
    padding: 12px;
    background: var(--band);
    border-radius: 8px;
    color: var(--ink-quiet);
  }

  .chooser :global(.strip) {
    margin-top: 12px;
  }
</style>
