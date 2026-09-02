import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import test from 'node:test';

const workspace = new URL('..', import.meta.url).pathname;

function start(command, args) {
  return spawn(command, args, { cwd: workspace, stdio: 'ignore' });
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
  const server = start('./node_modules/.bin/vite', ['--host', '127.0.0.1', '--port', String(appPort), '--strictPort']);
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
