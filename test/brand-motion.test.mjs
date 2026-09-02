import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import test from 'node:test';

const workspace = new URL('..', import.meta.url).pathname;

// Static component sources
const brandSource = readFileSync(new URL('../src/lib/Brand.svelte', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../src/App.svelte', import.meta.url), 'utf8');
const startSource = readFileSync(new URL('../src/lib/Start.svelte', import.meta.url), 'utf8');
const gettingReadySource = readFileSync(new URL('../src/lib/GettingReady.svelte', import.meta.url), 'utf8');
const planSource = readFileSync(new URL('../src/lib/Plan.svelte', import.meta.url), 'utf8');
const practiceSource = readFileSync(new URL('../src/lib/Practice.svelte', import.meta.url), 'utf8');
const tipsSource = readFileSync(new URL('../src/lib/Tips.svelte', import.meta.url), 'utf8');
const pathPulseSource = readFileSync(new URL('../src/lib/PathPulse.svelte', import.meta.url), 'utf8');
const chatGptLineSource = readFileSync(new URL('../src/lib/ChatGPTLine.svelte', import.meta.url), 'utf8');
const feedbackNoteSource = readFileSync(new URL('../src/lib/FeedbackNote.svelte', import.meta.url), 'utf8');
const resultPanelSource = readFileSync(new URL('../src/lib/ResultPanel.svelte', import.meta.url), 'utf8');

test('Brand.svelte accessibility: semantic text for Dry Run and decorative SVG', () => {
  // Brand must contain semantic real text 'Dry' and 'Run'
  assert.match(brandSource, />Dry<\/span>/, 'Brand must have Dry as text');
  assert.match(brandSource, />Run<\/span>/, 'Brand must have Run as text');
  // Must NOT render product name as an SVG <text> or <path>
  assert.doesNotMatch(brandSource, /<text[^>]*>Dry/i, 'Product name must not be an SVG text node');
  assert.doesNotMatch(brandSource, /<text/i, 'No SVG text tags in Brand.svelte');

  // Lexend 500 for Dry and Lexend 600 for Run, --strong
  assert.match(brandSource, /\.dry\s*\{[^}]*font-weight:\s*500/);
  assert.match(brandSource, /\.run\s*\{[^}]*font-weight:\s*600/);
  assert.match(brandSource, /color:\s*var\(--strong\)/);

  // SVG must have aria-hidden="true" and focusable="false"
  assert.match(brandSource, /<svg[^>]*aria-hidden="true"/);
  assert.match(brandSource, /<svg[^>]*focusable="false"/);

  // viewBox 0 0 28 28, 28x28 CSS px
  assert.match(brandSource, /viewBox="0 0 28 28"/);
  assert.match(brandSource, /width="28"/);
  assert.match(brandSource, /height="28"/);

  // Uses currentColor
  assert.match(brandSource, /stroke="currentColor"/);
  assert.match(brandSource, /fill="currentColor"/);
});

test('App.svelte mounts Brand once in shell, and screens have no per-screen wordmarks', () => {
  // App.svelte imports and renders Brand in shell above session.phase block
  assert.match(appSource, /import Brand from '\.\/lib\/Brand\.svelte'/);
  assert.match(appSource, /<header class="shell column">\s*<Brand \/>\s*<\/header>/);
  assert.ok(
    appSource.indexOf('<Brand />') < appSource.indexOf('{#if session.phase'),
    'Brand must be mounted above the session.phase block',
  );

  // Shell maintains 24px screen-top padding
  assert.match(appSource, /\.shell\s*\{[^}]*padding-top:\s*24px/);

  // Start, GettingReady, Plan, Practice, and Tips must NOT render per-screen wordmark
  const screens = [
    { name: 'Start.svelte', source: startSource },
    { name: 'GettingReady.svelte', source: gettingReadySource },
    { name: 'Plan.svelte', source: planSource },
    { name: 'Practice.svelte', source: practiceSource },
    { name: 'Tips.svelte', source: tipsSource },
  ];

  for (const { name, source } of screens) {
    assert.doesNotMatch(
      source,
      /<p class="t-h2 wordmark">\{copy\.app\.name\}<\/p>/,
      `${name} must not contain per-screen wordmark element`,
    );
    assert.doesNotMatch(
      source,
      /\.wordmark\s*\{/,
      `${name} must not contain .wordmark styles`,
    );
  }
});

test('All SVG components contain static @media (prefers-reduced-motion: reduce) fallbacks', () => {
  const components = [
    { name: 'Brand.svelte', source: brandSource },
    { name: 'PathPulse.svelte', source: pathPulseSource },
    { name: 'ChatGPTLine.svelte', source: chatGptLineSource },
    { name: 'FeedbackNote.svelte', source: feedbackNoteSource },
    { name: 'ResultPanel.svelte', source: resultPanelSource },
  ];

  for (const { name, source } of components) {
    assert.match(
      source,
      /@media\s*\(prefers-reduced-motion:\s*reduce\)/,
      `${name} must have its own @media (prefers-reduced-motion: reduce) block`,
    );
    assert.match(
      source,
      /stroke-dashoffset:\s*0/,
      `${name} must set stroke-dashoffset: 0 in reduced motion fallback`,
    );
  }

  // PathPulse specifically places pulse dot at rest
  assert.match(
    pathPulseSource,
    /offset-distance:\s*0%/,
    'PathPulse must place pulse dot at rest under reduced motion',
  );
});

test('All new inline SVGs are purely decorative with aria-hidden="true" and focusable="false"', () => {
  const svgs = [
    { name: 'Brand.svelte', source: brandSource },
    { name: 'PathPulse.svelte', source: pathPulseSource },
    { name: 'ChatGPTLine.svelte', source: chatGptLineSource },
    { name: 'FeedbackNote.svelte', source: feedbackNoteSource },
    { name: 'ResultPanel.svelte', source: resultPanelSource },
  ];

  for (const { name, source } of svgs) {
    const svgMatches = source.match(/<svg[^>]*>/g) ?? [];
    assert.ok(svgMatches.length > 0, `${name} must contain at least one SVG`);
    for (const tag of svgMatches) {
      assert.match(tag, /aria-hidden="true"/, `SVG in ${name} must be aria-hidden="true"`);
      assert.match(tag, /focusable="false"/, `SVG in ${name} must be focusable="false"`);
    }
  }
});

// Browser layout and viewport tests
function start(command, args) {
  return spawn(command, args, { cwd: workspace, stdio: 'ignore' });
}

function availablePort(min = 15000, max = 55000) {
  return new Promise((resolve, reject) => {
    const port = Math.floor(Math.random() * (max - min)) + min;
    const server = createServer();
    server.once('error', () => availablePort(min, max).then(resolve, reject));
    server.listen(port, '127.0.0.1', () => {
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
      close() {
        return new Promise((res) => {
          if (socket.readyState === WebSocket.CLOSED) return res();
          socket.addEventListener('close', () => res(), { once: true });
          socket.close();
        });
      },
    }));
    socket.addEventListener('error', reject, { once: true });
  });
}

test('Brand and shell viewport sanity at 360px, 200% zoom, and 900px without horizontal scroll', async (t) => {
  const [appPort, debugPort] = await Promise.all([availablePort(), availablePort()]);
  const profile = await mkdtemp(join(tmpdir(), 'dryrun-brand-test-'));
  const server = start('./node_modules/.bin/vite', ['--config', 'vite.test.config.js', '--host', '127.0.0.1', '--port', String(appPort), '--strictPort']);
  const chrome = start('/usr/bin/google-chrome-stable', [
    '--headless=new', '--no-sandbox', '--disable-gpu', `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profile}`, 'about:blank',
  ]);

  let cdp;
  t.after(async () => {
    try {
      if (cdp) await cdp.close();
    } catch {}
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

  cdp = await connect(version.webSocketDebuggerUrl);

  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Page.enable', {}, sessionId);
  const loaded = cdp.once('Page.loadEventFired');
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${appPort}/` }, sessionId);
  await loaded;

  await waitFor(async () => {
    const result = await cdp.send('Runtime.evaluate', {
      expression: 'Boolean(document.querySelector(".brand") && document.querySelector(".mark"))',
      returnByValue: true,
    }, sessionId);
    if (!result.result.value) throw new Error('Brand has not rendered');
  }, 'the Brand component');

  // Verify Brand semantics in browser
  const brandInfo = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const brand = document.querySelector('.brand');
      const text = brand.textContent.trim().replace(/\\s+/g, ' ');
      const svg = brand.querySelector('svg.mark');
      return {
        text,
        ariaHidden: svg.getAttribute('aria-hidden'),
        focusable: svg.getAttribute('focusable'),
        svgWidth: svg.clientWidth,
        svgHeight: svg.clientHeight,
      };
    })()`,
    returnByValue: true,
  }, sessionId);

  assert.equal(brandInfo.result.value.text, 'Dry Run');
  assert.equal(brandInfo.result.value.ariaHidden, 'true');
  assert.equal(brandInfo.result.value.focusable, 'false');

  // Viewport 1: Mobile 360px
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 360,
    height: 640,
    deviceScaleFactor: 1,
    mobile: true,
  }, sessionId);

  const checkOverflow = async () => {
    const result = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const el = document.documentElement;
        return {
          clientWidth: el.clientWidth,
          scrollWidth: el.scrollWidth,
          noHorizontalOverflow: el.scrollWidth <= el.clientWidth,
        };
      })()`,
      returnByValue: true,
    }, sessionId);
    return result.result.value;
  };

  const mobileResult = await checkOverflow();
  assert.equal(mobileResult.noHorizontalOverflow, true, `At 360px: scrollWidth ${mobileResult.scrollWidth} must be <= clientWidth ${mobileResult.clientWidth}`);

  // Viewport 2: 200% zoom at 360px (equivalent to 180px viewport width)
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 180,
    height: 320,
    deviceScaleFactor: 2,
    mobile: true,
  }, sessionId);

  const zoomResult = await checkOverflow();
  assert.equal(zoomResult.noHorizontalOverflow, true, `At 200% zoom (180px): scrollWidth ${zoomResult.scrollWidth} must be <= clientWidth ${zoomResult.clientWidth}`);

  // Viewport 3: Desktop 900px
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 900,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false,
  }, sessionId);

  const desktopResult = await checkOverflow();
  assert.equal(desktopResult.noHorizontalOverflow, true, `At 900px: scrollWidth ${desktopResult.scrollWidth} must be <= clientWidth ${desktopResult.clientWidth}`);

  // Emulate reduced motion and verify static properties in browser
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  }, sessionId);

  const motionResult = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const path = document.querySelector('.brand .path');
      const point = document.querySelector('.brand .point');
      const pathStyle = window.getComputedStyle(path);
      const pointStyle = window.getComputedStyle(point);
      return {
        dashOffset: pathStyle.strokeDashoffset,
        opacity: pointStyle.opacity,
      };
    })()`,
    returnByValue: true,
  }, sessionId);

  assert.equal(motionResult.result.value.dashOffset, '0px', 'Path stroke-dashoffset must be 0 in reduced motion');
  assert.equal(motionResult.result.value.opacity, '1', 'Point opacity must be 1 in reduced motion');
});
