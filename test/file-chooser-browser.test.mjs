import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import test from 'node:test';

const workspace = new URL('..', import.meta.url).pathname;

function start(command, args) {
  return spawn(command, args, { cwd: workspace, stdio: 'ignore' });
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { cwd: workspace, stdio: 'ignore' });
    process.once('error', reject);
    process.once('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${code}`));
    });
  });
}

function availablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function stop(process) {
  if (process.exitCode !== null) return;
  const exited = new Promise((resolve) => process.once('exit', resolve));
  process.kill();
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 5_000))]);
}

async function waitFor(check, description) {
  const deadline = Date.now() + 15_000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      return await check();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`Timed out waiting for ${description}: ${lastError?.message ?? 'unknown error'}`);
}

function connect(url) {
  const socket = new WebSocket(url);
  let nextId = 1;
  const requests = new Map();
  const events = new Map();

  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const request = requests.get(message.id);
      requests.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
      return;
    }
    for (const listener of events.get(message.method) ?? []) listener(message);
  });

  return new Promise((resolve, reject) => {
    socket.addEventListener('open', () => resolve({
      send(method, params = {}, sessionId) {
        return new Promise((requestResolve, requestReject) => {
          const id = nextId++;
          requests.set(id, { resolve: requestResolve, reject: requestReject });
          socket.send(JSON.stringify({ id, method, params, sessionId }));
        });
      },
      once(method) {
        return new Promise((eventResolve) => {
          const listener = (message) => {
            events.set(method, (events.get(method) ?? []).filter((item) => item !== listener));
            eventResolve(message);
          };
          events.set(method, [...(events.get(method) ?? []), listener]);
        });
      },
      close() { socket.close(); },
    }));
    socket.addEventListener('error', reject, { once: true });
  });
}

test('Choose a file label activates its associated hidden file input in a real browser', async (t) => {
  const [appPort, debugPort] = await Promise.all([availablePort(), availablePort()]);
  const profile = await mkdtemp(join(tmpdir(), 'dryrun-file-chooser-'));
  const server = start('./node_modules/.bin/vite', ['--config', 'vite.test.config.js', '--host', '127.0.0.1', '--port', String(appPort), '--strictPort']);
  const chrome = start('/usr/bin/google-chrome-stable', [
    '--headless=new', '--no-sandbox', '--disable-gpu', `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profile}`, 'about:blank',
  ]);

  t.after(async () => {
    await Promise.all([stop(server), stop(chrome)]);
    await rm(profile, { recursive: true, force: true });
  });

  await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${appPort}/`);
    if (!response.ok) throw new Error(`Vite returned ${response.status}`);
  }, 'the Vite test server');
  const version = await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
    if (!response.ok) throw new Error(`Chrome returned ${response.status}`);
    return response.json();
  }, 'Chrome DevTools');
  const cdp = await connect(version.webSocketDebuggerUrl);
  t.after(() => cdp.close());

  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Page.enable', {}, sessionId);
  const loaded = cdp.once('Page.loadEventFired');
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${appPort}/` }, sessionId);
  await loaded;
  await waitFor(async () => {
    const result = await cdp.send('Runtime.evaluate', {
      expression: 'Boolean(document.querySelector("label.file-btn") && document.querySelector("input[type=file]"))',
      returnByValue: true,
    }, sessionId);
    if (!result.result.value) throw new Error('File chooser has not rendered');
  }, 'the file chooser');

  const result = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const label = document.querySelector('label.file-btn');
      const input = document.querySelector('input[type=file]');
      let inputClicks = 0;
      input.addEventListener('click', () => inputClicks++);
      label.click();
      return {
        inputId: input.id,
        labelFor: label.htmlFor,
        associated: label.control === input,
        inputClicks,
      };
    })()`,
    returnByValue: true,
  }, sessionId);

  assert.deepEqual(result.result.value, {
    inputId: result.result.value.labelFor,
    labelFor: result.result.value.labelFor,
    associated: true,
    inputClicks: 1,
  });
});

test('the live chooser exposes the exact always-visible privacy copy and warns when it truncates a CV', async (t) => {
  const [appPort, debugPort] = await Promise.all([availablePort(), availablePort()]);
  const profile = await mkdtemp(join(tmpdir(), 'dryrun-file-chooser-'));
  const fixtureDir = await mkdtemp(join(tmpdir(), 'dryrun-resume-fixture-'));
  const resumePath = join(fixtureDir, 'long-resume.txt');
  const unsupportedPath = join(fixtureDir, 'not-a-resume.docx');
  await writeFile(resumePath, 'A'.repeat(20_001));
  await writeFile(unsupportedPath, 'not actually a Word document');
  const server = start('./node_modules/.bin/vite', ['--config', 'vite.test.config.js', '--host', '127.0.0.1', '--port', String(appPort), '--strictPort']);
  const chrome = start('/usr/bin/google-chrome-stable', [
    '--headless=new', '--no-sandbox', '--disable-gpu', `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profile}`, 'about:blank',
  ]);

  t.after(async () => {
    await Promise.all([stop(server), stop(chrome)]);
    await Promise.all([
      rm(profile, { recursive: true, force: true }),
      rm(fixtureDir, { recursive: true, force: true }),
    ]);
  });

  await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${appPort}/`);
    if (!response.ok) throw new Error(`Vite returned ${response.status}`);
  }, 'the Vite test server');
  const version = await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
    if (!response.ok) throw new Error(`Chrome returned ${response.status}`);
    return response.json();
  }, 'Chrome DevTools');
  const cdp = await connect(version.webSocketDebuggerUrl);
  t.after(() => cdp.close());

  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Page.enable', {}, sessionId);
  const loaded = cdp.once('Page.loadEventFired');
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${appPort}/` }, sessionId);
  await loaded;
  await waitFor(async () => {
    const result = await cdp.send('Runtime.evaluate', {
      expression: 'document.querySelector(".privacy")?.textContent.trim()', returnByValue: true,
    }, sessionId);
    if (!result.result.value) throw new Error('privacy note has not rendered');
    return result;
  }, 'the privacy note');

  const document = await cdp.send('DOM.getDocument', {}, sessionId);
  const queried = await cdp.send('DOM.querySelector', {
    nodeId: document.root.nodeId,
    selector: 'input[type=file]',
  }, sessionId);
  await cdp.send('DOM.setFileInputFiles', { files: [resumePath], nodeId: queried.nodeId }, sessionId);

  await waitFor(async () => {
    const result = await cdp.send('Runtime.evaluate', {
      expression: 'document.querySelector(".strip-almost")?.textContent.trim()', returnByValue: true,
    }, sessionId);
    if (!result.result.value) throw new Error('truncation warning has not rendered');
    return result;
  }, 'the truncation warning');

  const result = await cdp.send('Runtime.evaluate', {
    expression: `({
      privacy: document.querySelector('.privacy')?.textContent.trim(),
      warning: document.querySelector('.strip-almost')?.textContent.trim(),
      fileName: document.querySelector('.file-row .name')?.textContent.trim(),
    })`,
    returnByValue: true,
  }, sessionId);

  assert.deepEqual(result.result.value, {
    privacy: 'Your CV stays on your phone or computer. We read the words in it here in your browser. We never save it and there is no account.',
    warning: 'Your CV was long, so we used the first part of it. That is usually enough.',
    fileName: '✓ long-resume.txt',
  });

  // A failed file attempt must not erase a CV that was already pasted. Reset
  // the page to make the picker visible again, reveal the text box, then feed
  // it an unsupported file through the real browser file-input protocol.
  const reloaded = cdp.once('Page.loadEventFired');
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${appPort}/` }, sessionId);
  await reloaded;
  await waitFor(async () => {
    const click = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const button = [...document.querySelectorAll('button')]
          .find((element) => element.textContent.trim() === 'Or paste your CV as text');
        button?.click();
        return Boolean(button);
      })()`,
      returnByValue: true,
    }, sessionId);
    if (!click.result.value) throw new Error('paste-CV button has not rendered');
    const visible = await cdp.send('Runtime.evaluate', {
      expression: 'document.querySelectorAll("textarea").length === 2', returnByValue: true,
    }, sessionId);
    if (!visible.result.value) throw new Error('CV text box has not rendered');
  }, 'the pasted CV text box');
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const cv = document.querySelectorAll('textarea')[1];
      cv.value = 'Existing pasted CV text must stay here.';
      cv.dispatchEvent(new Event('input', { bubbles: true }));
    })()`,
  }, sessionId);
  const afterResetDocument = await cdp.send('DOM.getDocument', {}, sessionId);
  const afterResetInput = await cdp.send('DOM.querySelector', {
    nodeId: afterResetDocument.root.nodeId,
    selector: 'input[type=file]',
  }, sessionId);
  await cdp.send('DOM.setFileInputFiles', { files: [unsupportedPath], nodeId: afterResetInput.nodeId }, sessionId);
  await waitFor(async () => {
    const failure = await cdp.send('Runtime.evaluate', {
      expression: 'document.querySelector(".strip-stop")?.textContent.trim()', returnByValue: true,
    }, sessionId);
    if (!failure.result.value) throw new Error('file-type failure has not rendered');
  }, 'the file-type failure');
  const preserved = await cdp.send('Runtime.evaluate', {
    expression: `({
      error: document.querySelector('.strip-stop')?.textContent.trim(),
      resume: document.querySelectorAll('textarea')[1]?.value,
    })`,
    returnByValue: true,
  }, sessionId);
  assert.deepEqual(preserved.result.value, {
    error: 'We can read PDF, TXT and MD files. For anything else, copy the text and paste it.',
    resume: 'Existing pasted CV text must stay here.',
  });
});

test('the live chooser keeps PDF-specific failures separate and preserves a pasted CV', async (t) => {
  const [appPort, debugPort] = await Promise.all([availablePort(), availablePort()]);
  const profile = await mkdtemp(join(tmpdir(), 'dryrun-file-chooser-'));
  const fixtureDir = await mkdtemp(join(tmpdir(), 'dryrun-resume-fixture-'));
  const scannedPdfPath = join(fixtureDir, 'scanned.pdf');
  const lockedPdfPath = join(fixtureDir, 'locked.pdf');
  const rejectedTextPath = join(fixtureDir, 'short.txt');
  await run('gs', [
    '-q', '-dBATCH', '-dNOPAUSE', '-sDEVICE=pdfwrite',
    `-sOutputFile=${scannedPdfPath}`, '-c', 'showpage',
  ]);
  await run('gs', [
    '-q', '-dBATCH', '-dNOPAUSE', '-sDEVICE=pdfwrite',
    `-sOutputFile=${lockedPdfPath}`, '-sOwnerPassword=owner', '-sUserPassword=user',
    '-dEncryptionR=3', '-dKeyLength=128', '-dPermissions=-4', scannedPdfPath,
  ]);
  await writeFile(rejectedTextPath, 'Short CV text');

  const server = start('./node_modules/.bin/vite', ['--config', 'vite.test.config.js', '--host', '127.0.0.1', '--port', String(appPort), '--strictPort']);
  const chrome = start('/usr/bin/google-chrome-stable', [
    '--headless=new', '--no-sandbox', '--disable-gpu', `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profile}`, 'about:blank',
  ]);

  t.after(async () => {
    await Promise.all([stop(server), stop(chrome)]);
    await Promise.all([
      rm(profile, { recursive: true, force: true }),
      rm(fixtureDir, { recursive: true, force: true }),
    ]);
  });

  await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${appPort}/`);
    if (!response.ok) throw new Error(`Vite returned ${response.status}`);
  }, 'the Vite test server');
  const version = await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
    if (!response.ok) throw new Error(`Chrome returned ${response.status}`);
    return response.json();
  }, 'Chrome DevTools');
  const cdp = await connect(version.webSocketDebuggerUrl);
  t.after(() => cdp.close());

  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Page.enable', {}, sessionId);
  const loaded = cdp.once('Page.loadEventFired');
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${appPort}/` }, sessionId);
  await loaded;

  await waitFor(async () => {
    const result = await cdp.send('Runtime.evaluate', {
      expression: `[...document.querySelectorAll('button')]
        .some((element) => element.textContent.trim() === 'Or paste your CV as text')`,
      returnByValue: true,
    }, sessionId);
    if (!result.result.value) throw new Error('paste-CV button has not rendered');
  }, 'the paste-CV button');
  await cdp.send('Runtime.evaluate', {
    expression: `[...document.querySelectorAll('button')]
      .find((element) => element.textContent.trim() === 'Or paste your CV as text').click()`,
  }, sessionId);
  await waitFor(async () => {
    const result = await cdp.send('Runtime.evaluate', {
      expression: 'document.querySelectorAll("textarea").length === 2',
      returnByValue: true,
    }, sessionId);
    if (!result.result.value) throw new Error('pasted CV text box has not rendered');
    return result;
  }, 'the pasted CV text box');
  await cdp.send('Runtime.evaluate', {
    expression: `document.querySelectorAll('textarea')[1].focus()`,
  }, sessionId);
  await cdp.send('Input.insertText', {
    text: 'Existing pasted CV survives file failures.',
  }, sessionId);

  async function selectFile(path) {
    const document = await cdp.send('DOM.getDocument', {}, sessionId);
    const input = await cdp.send('DOM.querySelector', {
      nodeId: document.root.nodeId,
      selector: 'input[type=file]',
    }, sessionId);
    await cdp.send('DOM.setFileInputFiles', { files: [path], nodeId: input.nodeId }, sessionId);
  }

  async function expectFailure(message, description) {
    await waitFor(async () => {
      const result = await cdp.send('Runtime.evaluate', {
        expression: 'document.querySelector(".strip-stop")?.textContent.trim()',
        returnByValue: true,
      }, sessionId);
      if (result.result.value !== message) throw new Error('expected failure has not rendered');
    }, description);
    const result = await cdp.send('Runtime.evaluate', {
      expression: `({
        error: document.querySelector('.strip-stop')?.textContent.trim(),
        resume: document.querySelectorAll('textarea')[1]?.value,
        textareaCount: document.querySelectorAll('textarea').length,
      })`,
      returnByValue: true,
    }, sessionId);
    assert.deepEqual(result.result.value, {
      error: message,
      resume: 'Existing pasted CV survives file failures.',
      textareaCount: 2,
    });

    // Collapse and re-open the start panel. That unmounts/remounts the CV
    // field, so its value now proves the shared session state survived rather
    // than merely remaining in an untouched DOM control.
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const choice = document.querySelector('.choice');
        choice.click();
        choice.click();
      })()`,
    }, sessionId);
    await waitFor(async () => {
      const restored = await cdp.send('Runtime.evaluate', {
        expression: `({
          resume: document.querySelectorAll('textarea')[1]?.value,
          textareaCount: document.querySelectorAll('textarea').length,
        })`,
        returnByValue: true,
      }, sessionId);
      if (restored.result.value?.resume !== 'Existing pasted CV survives file failures.') {
        throw new Error('pasted CV has not survived the field remount');
      }
      return restored;
    }, 'the remounted pasted CV field');
  }

  await selectFile(scannedPdfPath);
  await expectFailure(
    'We could not find any words in that file. It looks like a photo or a scan. Copy your CV text and paste it instead.',
    'the scanned-PDF failure',
  );

  await selectFile(lockedPdfPath);
  await expectFailure(
    'That file is locked with a password. Upload a copy without the password, or paste the text instead.',
    'the locked-PDF failure',
  );

  await cdp.send('Runtime.evaluate', {
    expression: `Object.defineProperty(File.prototype, 'text', {
      configurable: true,
      value() { return Promise.reject(new Error('synthetic text read failure')); },
    })`,
  }, sessionId);
  await selectFile(rejectedTextPath);
  await expectFailure('Something went wrong. Try again in a minute.', 'the TXT read failure');

});
