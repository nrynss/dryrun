import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'vite';

const posting = 'Write clear API documentation for people who build software.';

function briefResponse({ withResume = false, sourceQuote = posting, questionPrefix = 'Question' } = {}) {
  return {
    brief: {
      owns: ['Keep API documentation accurate.'],
      study: ['Learn the API release process.'],
      angles: ['Whether you can turn technical changes into useful guidance.'],
      confidence: 'high',
    },
    questions: Array.from({ length: 8 }, (_, index) => ({
      id: `q${index + 1}`,
      prompt: `${questionPrefix} ${index + 1}: how would you explain this change?`,
      sourceQuote,
      targetsGap: withResume && index < 3,
    })),
    fitMatch: withResume
      ? {
        evidenced: [{ requirement: 'Clear writing', evidence: 'Wrote internal guides.' }],
        gaps: [{ requirement: 'API documentation', why: 'The CV does not mention APIs.', size: 3 }],
        confidence: 'high',
      }
      : null,
    meta: { usage: { model: 'mock' } },
  };
}

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function scoreResponse(value = 4) {
  return {
    scores: { specificity: value, evidence: value, structure: value, relevance: value },
    missed: ['Name one concrete example.'],
    modelAnswer: 'Give one relevant example, explain what you did, and name the result.',
    meta: { usage: { model: 'mock' } },
  };
}

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  const removed = [];
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { removed.push(key); values.delete(key); },
    values,
    removed,
  };
}

function deferred() {
  let resolve;
  const promise = new Promise((finish) => { resolve = finish; });
  return { promise, resolve };
}

function reset(session) {
  Object.assign(session, {
    phase: 'idle', posting: null, resume: null, brief: null, fitMatch: null,
    questions: [], current: 0, error: null, agentSeen: false, lastCallAt: null,
    serviceDown: false, isExample: false, scoreFailed: false, scoring: false,
  });
}

test('T25–T27 session capabilities call analysis, retain the contract, and start at Q1', async (t) => {
  const vite = await createServer({
    configFile: new URL('../vite.test.config.js', import.meta.url).pathname,
    // These isolated SSR loaders never call listen(), so HMR has no client to
    // serve. Disabling it avoids every parallel test competing for Vite's
    // default HMR WebSocket port.
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
  });
  t.after(() => vite.close());
  const capabilities = await vite.ssrLoadModule('/src/lib/session.svelte.js');
  const { session, setPosting, setResume, getBrief, startInterview } = capabilities;
  reset(session);

  const calls = [];
  const request = async (url, options) => {
    calls.push({ url, options });
    return response(briefResponse());
  };
  const created = await setPosting(`  ${posting}  `, { request });

  assert.equal(created.ok, true);
  assert.equal(session.phase, 'ready');
  assert.equal(session.posting, posting);
  assert.equal(session.fitMatch, null);
  assert.equal(session.questions.length, 8);
  assert.deepEqual(session.questions[0], {
    id: 'q1', prompt: 'Question 1: how would you explain this change?',
    sourceQuote: posting, targetsGap: false, answer: null, scores: null, missed: [],
  });
  assert.equal(getBrief(), session.brief);
  assert.deepEqual(JSON.parse(calls[0].options.body), { task: 'brief', posting });

  session.questions[0].answer = 'Old answer that must not cross into a re-aimed session.';
  const reaimed = await setResume('  I wrote internal guides.  ', {
    request: async (url, options) => {
      calls.push({ url, options });
      return response(briefResponse({ withResume: true }));
    },
  });
  assert.equal(reaimed.ok, true);
  assert.equal(session.resume, 'I wrote internal guides.');
  assert.equal(session.fitMatch.gaps.length, 1);
  assert.equal(session.questions.filter((question) => question.targetsGap).length, 3);
  assert.equal(session.questions[0].answer, null);
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    task: 'brief', posting, resume: 'I wrote internal guides.',
  });

  session.current = 5;
  const started = startInterview();
  assert.equal(started.ok, true);
  assert.equal(session.phase, 'interviewing');
  assert.equal(session.current, 0);
  assert.equal(started.question.id, 'q1');
});

test('T25–T27 expose validation, server, network, and malformed-response failures without corrupting a session', async (t) => {
  const vite = await createServer({
    configFile: new URL('../vite.test.config.js', import.meta.url).pathname,
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
  });
  t.after(() => vite.close());
  const { session, setPosting, setResume, startInterview, MAX_POSTING_CHARS } = await vite.ssrLoadModule('/src/lib/session.svelte.js');
  reset(session);

  assert.deepEqual(await setPosting('   ', { request: () => assert.fail('request should not run') }), {
    ok: false, error: 'Paste the job advert first.',
  });
  assert.deepEqual(await setPosting('x'.repeat(MAX_POSTING_CHARS + 1), { request: () => assert.fail('request should not run') }), {
    ok: false,
    error: 'That is longer than we can read. Paste just the job title, the duties, and the requirements.',
  });
  assert.deepEqual(await setResume('CV text', { request: () => assert.fail('request should not run') }), {
    ok: false, error: 'Paste the job posting before adding your CV.',
  });
  assert.deepEqual(startInterview(), {
    ok: false, error: 'Build your practice questions before starting the interview.',
  });

  const unavailable = await setPosting(posting, {
    request: async () => response({ error: 'AI Gateway is not active on this deploy.', code: 'gateway_unavailable' }, 503),
  });
  assert.deepEqual(unavailable, {
    ok: false, status: 503, code: 'gateway_unavailable', error: 'AI Gateway is not active on this deploy.',
  });
  assert.equal(session.phase, 'idle');
  assert.equal(session.serviceDown, true);
  assert.equal(session.questions.length, 0);

  const malformed = await setPosting(posting, {
    request: async () => response({ ...briefResponse(), unexpected: true }),
  });
  assert.deepEqual(malformed, {
    ok: false, status: 200, code: 'invalid_response', error: 'The analysis service returned an unusable result. Please try again.',
  });
  assert.equal(session.phase, 'idle');

  const network = await setPosting(posting, {
    request: async () => { throw new TypeError('offline'); },
  });
  assert.deepEqual(network, {
    ok: false, code: 'network_error', error: 'We could not reach the analysis service. Please try again.',
  });
  assert.equal(session.phase, 'idle');
  assert.equal(session.serviceDown, true);
});

test('T25 latest brief request wins across posting and resume overlaps', async (t) => {
  const vite = await createServer({
    configFile: new URL('../vite.test.config.js', import.meta.url).pathname,
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
  });
  t.after(() => vite.close());
  const { session, setPosting, setResume } = await vite.ssrLoadModule('/src/lib/session.svelte.js');
  reset(session);

  const olderPosting = 'Write documentation for the old release.';
  const newerPosting = 'Explain infrastructure incidents to customers.';
  const pending = new Map();
  const signals = new Map();
  const heldRequest = async (url, options) => {
    const body = JSON.parse(options.body);
    const held = deferred();
    pending.set(body.posting, held);
    signals.set(body.posting, options.signal);
    return held.promise; // Intentionally ignores abort: generation remains the authority.
  };

  const older = setPosting(olderPosting, { request: heldRequest });
  const newer = setPosting(newerPosting, { request: heldRequest });
  assert.equal(signals.get(olderPosting).aborted, true);

  pending.get(newerPosting).resolve(response(briefResponse({
    sourceQuote: newerPosting,
    questionPrefix: 'NEW',
  })));
  assert.equal((await newer).ok, true);

  pending.get(olderPosting).resolve(response(briefResponse({
    sourceQuote: olderPosting,
    questionPrefix: 'OLD',
  })));
  assert.deepEqual(await older, { ok: false, code: 'superseded' });
  assert.equal(session.posting, newerPosting);
  assert.equal(session.questions[0].prompt, 'NEW 1: how would you explain this change?');
  assert.equal(session.questions[0].sourceQuote, newerPosting);

  await setPosting(posting, { request: async () => response(briefResponse()) });
  const heldResume = deferred();
  const staleResume = setResume('I wrote internal guides.', {
    request: async () => heldResume.promise,
  });
  const postingAfterResume = 'Manage a warehouse loading team safely.';
  const newerPostingResult = await setPosting(postingAfterResume, {
    request: async () => response(briefResponse({
      sourceQuote: postingAfterResume,
      questionPrefix: 'WAREHOUSE',
    })),
  });
  assert.equal(newerPostingResult.ok, true);

  heldResume.resolve(response({ error: 'Temporary CV failure.', code: 'upstream_failed' }, 503));
  assert.deepEqual(await staleResume, { ok: false, code: 'superseded' });
  assert.equal(session.phase, 'ready');
  assert.equal(session.posting, postingAfterResume);
  assert.equal(session.resume, null);
  assert.equal(session.fitMatch, null);
  assert.equal(session.questions[0].prompt, 'WAREHOUSE 1: how would you explain this change?');
  assert.equal(session.serviceDown, false);
});

test('T26 restores the last coherent session after failed first and replacement CVs', async (t) => {
  const vite = await createServer({
    configFile: new URL('../vite.test.config.js', import.meta.url).pathname,
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
  });
  t.after(() => vite.close());
  const { session, setPosting, setResume } = await vite.ssrLoadModule('/src/lib/session.svelte.js');
  reset(session);

  await setPosting(posting, { request: async () => response(briefResponse()) });
  session.questions[0].answer = 'Keep this no-resume answer.';
  // T32 binds the field straight to the session; reproduce that draft before
  // asking the capability to ensure its rollback target is not the draft.
  session.resume = 'First CV text.';
  const failedFirstCv = await setResume('First CV text.', {
    request: async () => response({ error: 'CV service unavailable.', code: 'upstream_failed' }, 503),
  });
  assert.equal(failedFirstCv.ok, false);
  assert.equal(session.phase, 'ready');
  assert.equal(session.resume, null);
  assert.equal(session.fitMatch, null);
  assert.equal(session.questions[0].answer, 'Keep this no-resume answer.');
  assert.equal(session.questions.some((question) => question.targetsGap), false);
  assert.equal(session.serviceDown, true);

  const acceptedCv = 'I wrote internal guides.';
  await setResume(acceptedCv, {
    request: async () => response(briefResponse({ withResume: true })),
  });
  session.questions[0].answer = 'Keep this re-aimed answer.';
  const previousFitMatch = JSON.parse(JSON.stringify(session.fitMatch));
  const previousQuestions = JSON.parse(JSON.stringify(session.questions));
  session.resume = 'Replacement CV text.';
  const failedReplacementCv = await setResume('Replacement CV text.', {
    request: async () => response({ error: 'Replacement CV failed.', code: 'upstream_failed' }, 503),
  });
  assert.equal(failedReplacementCv.ok, false);
  assert.equal(session.phase, 'ready');
  assert.equal(session.resume, acceptedCv);
  assert.deepEqual(session.fitMatch, previousFitMatch);
  assert.deepEqual(session.questions, previousQuestions);
  assert.equal(session.questions.filter((question) => question.targetsGap).length, 3);
  assert.equal(session.serviceDown, true);
});

test('T25 restores accepted no-resume and resume projections after direct-bound over-limit CV validation', async (t) => {
  const vite = await createServer({
    configFile: new URL('../vite.test.config.js', import.meta.url).pathname,
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
  });
  t.after(() => vite.close());
  const { session, setPosting, setResume, MAX_RESUME_CHARS } = await vite.ssrLoadModule('/src/lib/session.svelte.js');
  reset(session);

  const overLimitDraft = 'x'.repeat(MAX_RESUME_CHARS + 1);
  const expectedError = 'CV is 20,001 characters. The limit is 20,000. Paste the most relevant sections.';
  await setPosting(posting, { request: async () => response(briefResponse()) });
  session.questions[0].answer = 'Keep this no-resume answer.';
  session.current = 2;
  const noResumeQuestions = JSON.parse(JSON.stringify(session.questions));
  session.resume = overLimitDraft;
  const noResumeResult = await setResume(overLimitDraft, {
    request: () => assert.fail('over-limit CV must not be sent'),
  });
  assert.deepEqual(noResumeResult, { ok: false, error: expectedError });
  assert.equal(session.phase, 'ready');
  assert.equal(session.resume, null);
  assert.equal(session.fitMatch, null);
  assert.deepEqual(session.questions, noResumeQuestions);
  assert.equal(session.current, 2);
  assert.equal(session.error, expectedError);
  assert.equal(session.serviceDown, false);

  const acceptedCv = 'I wrote internal guides.';
  await setResume(acceptedCv, {
    request: async () => response(briefResponse({ withResume: true })),
  });
  session.questions[0].answer = 'Keep this resume answer.';
  session.current = 4;
  const acceptedFitMatch = JSON.parse(JSON.stringify(session.fitMatch));
  const acceptedQuestions = JSON.parse(JSON.stringify(session.questions));
  session.resume = overLimitDraft;
  const resumeResult = await setResume(overLimitDraft, {
    request: () => assert.fail('over-limit replacement CV must not be sent'),
  });
  assert.deepEqual(resumeResult, { ok: false, error: expectedError });
  assert.equal(session.phase, 'ready');
  assert.equal(session.resume, acceptedCv);
  assert.deepEqual(session.fitMatch, acceptedFitMatch);
  assert.deepEqual(session.questions, acceptedQuestions);
  assert.equal(session.current, 4);
  assert.equal(session.error, expectedError);
  assert.equal(session.serviceDown, false);
});

test('T25 direct-bound CV validation clears stale service failures for no-resume and resume baselines', async (t) => {
  const vite = await createServer({
    configFile: new URL('../vite.test.config.js', import.meta.url).pathname,
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
  });
  t.after(() => vite.close());
  const { session, setPosting, setResume, MAX_RESUME_CHARS } = await vite.ssrLoadModule('/src/lib/session.svelte.js');
  const overLimitDraft = 'x'.repeat(MAX_RESUME_CHARS + 1);
  const expectedError = 'CV is 20,001 characters. The limit is 20,000. Paste the most relevant sections.';

  for (const baseline of ['no-resume', 'resume']) {
    reset(session);
    await setPosting(posting, { request: async () => response(briefResponse()) });
    if (baseline === 'resume') {
      await setResume('I wrote internal guides.', {
        request: async () => response(briefResponse({ withResume: true })),
      });
    }
    session.questions[0].answer = `Keep this ${baseline} answer.`;
    session.current = baseline === 'resume' ? 4 : 2;
    const expectedResume = session.resume;
    const expectedFitMatch = JSON.parse(JSON.stringify(session.fitMatch));
    const expectedQuestions = JSON.parse(JSON.stringify(session.questions));
    const expectedCurrent = session.current;

    session.resume = 'A valid replacement CV that the service cannot analyse.';
    const failure = await setResume(session.resume, {
      request: async () => response({ error: 'CV service unavailable.', code: 'upstream_failed' }, 503),
    });
    assert.equal(failure.ok, false, baseline);
    assert.equal(session.serviceDown, true, baseline);

    session.resume = overLimitDraft;
    assert.deepEqual(await setResume(overLimitDraft, {
      request: () => assert.fail('over-limit CV must not be sent'),
    }), { ok: false, error: expectedError }, baseline);
    assert.equal(session.phase, 'ready', baseline);
    assert.equal(session.resume, expectedResume, baseline);
    assert.deepEqual(session.fitMatch, expectedFitMatch, baseline);
    assert.deepEqual(session.questions, expectedQuestions, baseline);
    assert.equal(session.current, expectedCurrent, baseline);
    assert.equal(session.error, expectedError, baseline);
    assert.equal(session.serviceDown, false, baseline);
  }
});

test('T25 local CV validation invalidates held CV analysis for every baseline and completion outcome', async (t) => {
  const vite = await createServer({
    configFile: new URL('../vite.test.config.js', import.meta.url).pathname,
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
  });
  t.after(() => vite.close());
  const { session, setPosting, setResume, MAX_RESUME_CHARS } = await vite.ssrLoadModule('/src/lib/session.svelte.js');
  const overLimitDraft = 'x'.repeat(MAX_RESUME_CHARS + 1);
  const expectedError = 'CV is 20,001 characters. The limit is 20,000. Paste the most relevant sections.';

  for (const baseline of ['no-resume', 'resume']) {
    for (const completion of ['success', 'failure']) {
      reset(session);
      await setPosting(posting, { request: async () => response(briefResponse()) });
      if (baseline === 'resume') {
        await setResume('I wrote internal guides.', {
          request: async () => response(briefResponse({ withResume: true })),
        });
      }
      session.questions[0].answer = `Keep this ${baseline} answer.`;
      session.current = baseline === 'resume' ? 4 : 2;
      const expectedResume = session.resume;
      const expectedFitMatch = JSON.parse(JSON.stringify(session.fitMatch));
      const expectedQuestions = JSON.parse(JSON.stringify(session.questions));
      const expectedCurrent = session.current;

      const held = deferred();
      let signal;
      session.resume = 'A valid replacement CV whose response is held.';
      const staleRequest = setResume(session.resume, {
        request: async (url, options) => {
          signal = options.signal;
          return held.promise; // Deliberately ignores abort; generation is authoritative.
        },
      });
      assert.equal(session.phase, 'analysing', `${baseline}/${completion}`);
      assert.equal(signal.aborted, false, `${baseline}/${completion}`);

      session.resume = overLimitDraft;
      assert.deepEqual(await setResume(overLimitDraft, {
        request: () => assert.fail('over-limit CV must not be sent'),
      }), { ok: false, error: expectedError }, `${baseline}/${completion}`);
      assert.equal(signal.aborted, true, `${baseline}/${completion}`);
      assert.equal(session.phase, 'ready', `${baseline}/${completion}`);
      assert.equal(session.resume, expectedResume, `${baseline}/${completion}`);
      assert.deepEqual(session.fitMatch, expectedFitMatch, `${baseline}/${completion}`);
      assert.deepEqual(session.questions, expectedQuestions, `${baseline}/${completion}`);
      assert.equal(session.current, expectedCurrent, `${baseline}/${completion}`);
      assert.equal(session.error, expectedError, `${baseline}/${completion}`);
      assert.equal(session.serviceDown, false, `${baseline}/${completion}`);

      held.resolve(completion === 'success'
        ? response(briefResponse({ withResume: true, questionPrefix: 'STALE' }))
        : response({ error: 'Held CV request failed.', code: 'upstream_failed' }, 503));
      assert.deepEqual(await staleRequest, { ok: false, code: 'superseded' }, `${baseline}/${completion}`);
      assert.equal(session.phase, 'ready', `${baseline}/${completion}`);
      assert.equal(session.resume, expectedResume, `${baseline}/${completion}`);
      assert.deepEqual(session.fitMatch, expectedFitMatch, `${baseline}/${completion}`);
      assert.deepEqual(session.questions, expectedQuestions, `${baseline}/${completion}`);
      assert.equal(session.current, expectedCurrent, `${baseline}/${completion}`);
      assert.equal(session.error, expectedError, `${baseline}/${completion}`);
      assert.equal(session.serviceDown, false, `${baseline}/${completion}`);
    }
  }
});

test('T26 latest failed CV restores the accepted projection after an older valid CV request', async (t) => {
  const vite = await createServer({
    configFile: new URL('../vite.test.config.js', import.meta.url).pathname,
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
  });
  t.after(() => vite.close());
  const { session, setPosting, setResume } = await vite.ssrLoadModule('/src/lib/session.svelte.js');

  for (const baseline of ['no-resume', 'resume']) {
    for (const olderCompletion of ['success', 'failure']) {
      reset(session);
      await setPosting(posting, { request: async () => response(briefResponse()) });
      if (baseline === 'resume') {
        await setResume('Accepted CV text.', {
          request: async () => response(briefResponse({ withResume: true })),
        });
      }
      session.questions[0].answer = `Keep this ${baseline} answer.`;
      session.current = baseline === 'resume' ? 4 : 2;
      const expectedResume = session.resume;
      const expectedFitMatch = JSON.parse(JSON.stringify(session.fitMatch));
      const expectedQuestions = JSON.parse(JSON.stringify(session.questions));
      const expectedCurrent = session.current;

      const heldOlder = deferred();
      let olderSignal;
      session.resume = 'Older valid CV text.';
      const older = setResume(session.resume, {
        request: async (url, options) => {
          olderSignal = options.signal;
          return heldOlder.promise; // Deliberately ignores abort.
        },
      });
      assert.equal(session.phase, 'analysing', `${baseline}/${olderCompletion}`);

      session.resume = 'Newest valid CV text.';
      const newest = await setResume(session.resume, {
        request: async () => response({ error: 'Newest CV request failed.', code: 'upstream_failed' }, 503),
      });
      assert.deepEqual(newest, {
        ok: false, status: 503, code: 'upstream_failed', error: 'Newest CV request failed.',
      }, `${baseline}/${olderCompletion}`);
      assert.equal(olderSignal.aborted, true, `${baseline}/${olderCompletion}`);
      assert.equal(session.phase, 'ready', `${baseline}/${olderCompletion}`);
      assert.equal(session.resume, expectedResume, `${baseline}/${olderCompletion}`);
      assert.deepEqual(session.fitMatch, expectedFitMatch, `${baseline}/${olderCompletion}`);
      assert.deepEqual(session.questions, expectedQuestions, `${baseline}/${olderCompletion}`);
      assert.equal(session.current, expectedCurrent, `${baseline}/${olderCompletion}`);
      assert.equal(session.error, 'Newest CV request failed.', `${baseline}/${olderCompletion}`);
      assert.equal(session.serviceDown, true, `${baseline}/${olderCompletion}`);

      heldOlder.resolve(olderCompletion === 'success'
        ? response(briefResponse({ withResume: true, questionPrefix: 'STALE' }))
        : response({ error: 'Older CV request failed.', code: 'upstream_failed' }, 503));
      assert.deepEqual(await older, { ok: false, code: 'superseded' }, `${baseline}/${olderCompletion}`);
      assert.equal(session.phase, 'ready', `${baseline}/${olderCompletion}`);
      assert.equal(session.resume, expectedResume, `${baseline}/${olderCompletion}`);
      assert.deepEqual(session.fitMatch, expectedFitMatch, `${baseline}/${olderCompletion}`);
      assert.deepEqual(session.questions, expectedQuestions, `${baseline}/${olderCompletion}`);
      assert.equal(session.current, expectedCurrent, `${baseline}/${olderCompletion}`);
      assert.equal(session.error, 'Newest CV request failed.', `${baseline}/${olderCompletion}`);
      assert.equal(session.serviceDown, true, `${baseline}/${olderCompletion}`);
    }
  }
});

test('T25 invalid direct-bound posting supersedes held analysis for every validation and completion outcome', async (t) => {
  const vite = await createServer({
    configFile: new URL('../vite.test.config.js', import.meta.url).pathname,
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
  });
  t.after(() => vite.close());
  const { session, setPosting, MAX_POSTING_CHARS } = await vite.ssrLoadModule('/src/lib/session.svelte.js');
  const invalidCases = [
    { input: '', error: 'Paste the job advert first.' },
    { input: 'x'.repeat(MAX_POSTING_CHARS + 1), error: 'That is longer than we can read. Paste just the job title, the duties, and the requirements.' },
  ];

  for (const { input, error } of invalidCases) {
    for (const olderCompletion of ['success', 'failure']) {
      reset(session);
      const heldOlder = deferred();
      let olderSignal;
      const older = setPosting('A valid posting whose response is held.', {
        request: async (url, options) => {
          olderSignal = options.signal;
          return heldOlder.promise; // Deliberately ignores abort.
        },
      });
      assert.equal(session.phase, 'analysing', `${input.length}/${olderCompletion}`);
      session.serviceDown = true; // A local validation result must clear stale outage status.

      // R1 binds the textarea to session.posting before the button invokes
      // the capability, so simulate the direct write explicitly.
      session.posting = input;
      assert.deepEqual(await setPosting(input, {
        request: () => assert.fail('invalid posting must not be sent'),
      }), { ok: false, error }, `${input.length}/${olderCompletion}`);
      assert.equal(olderSignal.aborted, true, `${input.length}/${olderCompletion}`);
      assert.equal(session.phase, 'idle', `${input.length}/${olderCompletion}`);
      assert.equal(session.posting, input, `${input.length}/${olderCompletion}`);
      assert.equal(session.brief, null, `${input.length}/${olderCompletion}`);
      assert.equal(session.fitMatch, null, `${input.length}/${olderCompletion}`);
      assert.deepEqual(session.questions, [], `${input.length}/${olderCompletion}`);
      assert.equal(session.error, error, `${input.length}/${olderCompletion}`);
      assert.equal(session.serviceDown, false, `${input.length}/${olderCompletion}`);

      heldOlder.resolve(olderCompletion === 'success'
        ? response(briefResponse({ questionPrefix: 'STALE' }))
        : response({ error: 'Older posting request failed.', code: 'upstream_failed' }, 503));
      assert.deepEqual(await older, { ok: false, code: 'superseded' }, `${input.length}/${olderCompletion}`);
      assert.equal(session.phase, 'idle', `${input.length}/${olderCompletion}`);
      assert.equal(session.posting, input, `${input.length}/${olderCompletion}`);
      assert.equal(session.brief, null, `${input.length}/${olderCompletion}`);
      assert.equal(session.fitMatch, null, `${input.length}/${olderCompletion}`);
      assert.deepEqual(session.questions, [], `${input.length}/${olderCompletion}`);
      assert.equal(session.error, error, `${input.length}/${olderCompletion}`);
      assert.equal(session.serviceDown, false, `${input.length}/${olderCompletion}`);
    }
  }
});

test('T26 CV failure superseding the first posting restores its stable idle projection', async (t) => {
  const vite = await createServer({
    configFile: new URL('../vite.test.config.js', import.meta.url).pathname,
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
  });
  t.after(() => vite.close());
  const { session, setPosting, setResume } = await vite.ssrLoadModule('/src/lib/session.svelte.js');

  for (const postingCompletion of ['success', 'failure']) {
    reset(session);
    const heldPosting = deferred();
    let postingSignal;
    const firstPosting = setPosting(posting, {
      request: async (url, options) => {
        postingSignal = options.signal;
        return heldPosting.promise; // Intentionally ignores abort.
      },
    });
    assert.equal(session.phase, 'analysing', postingCompletion);

    session.resume = 'CV that supersedes the first posting.';
    const failedCv = await setResume(session.resume, {
      request: async () => response({ error: 'CV latest failed.', code: 'upstream_failed' }, 503),
    });
    assert.deepEqual(failedCv, {
      ok: false, status: 503, code: 'upstream_failed', error: 'CV latest failed.',
    }, postingCompletion);
    assert.equal(postingSignal.aborted, true, postingCompletion);
    assert.equal(session.phase, 'idle', postingCompletion);
    assert.equal(session.posting, posting, postingCompletion);
    assert.equal(session.resume, null, postingCompletion);
    assert.equal(session.brief, null, postingCompletion);
    assert.equal(session.fitMatch, null, postingCompletion);
    assert.deepEqual(session.questions, [], postingCompletion);
    assert.equal(session.error, 'CV latest failed.', postingCompletion);
    assert.equal(session.serviceDown, true, postingCompletion);

    heldPosting.resolve(postingCompletion === 'success'
      ? response(briefResponse({ questionPrefix: 'STALE' }))
      : response({ error: 'First posting failed.', code: 'upstream_failed' }, 503));
    assert.deepEqual(await firstPosting, { ok: false, code: 'superseded' }, postingCompletion);
    assert.equal(session.phase, 'idle', postingCompletion);
    assert.equal(session.error, 'CV latest failed.', postingCompletion);
    assert.equal(session.serviceDown, true, postingCompletion);
    assert.deepEqual(session.questions, [], postingCompletion);
  }
});

test('T25 invalid CV superseding the first posting restores its stable idle projection', async (t) => {
  const vite = await createServer({
    configFile: new URL('../vite.test.config.js', import.meta.url).pathname,
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
  });
  t.after(() => vite.close());
  const { session, setPosting, setResume, MAX_RESUME_CHARS } = await vite.ssrLoadModule('/src/lib/session.svelte.js');
  const overLimitCv = 'x'.repeat(MAX_RESUME_CHARS + 1);
  const expectedError = 'CV is 20,001 characters. The limit is 20,000. Paste the most relevant sections.';

  for (const postingCompletion of ['success', 'failure']) {
    reset(session);
    const heldPosting = deferred();
    let postingSignal;
    const firstPosting = setPosting(posting, {
      request: async (url, options) => {
        postingSignal = options.signal;
        return heldPosting.promise; // Intentionally ignores abort.
      },
    });
    assert.equal(session.phase, 'analysing', postingCompletion);

    session.resume = overLimitCv;
    assert.deepEqual(await setResume(overLimitCv, {
      request: () => assert.fail('invalid CV must not be sent'),
    }), { ok: false, error: expectedError }, postingCompletion);
    assert.equal(postingSignal.aborted, true, postingCompletion);
    assert.equal(session.phase, 'idle', postingCompletion);
    assert.equal(session.posting, posting, postingCompletion);
    assert.equal(session.resume, null, postingCompletion);
    assert.equal(session.brief, null, postingCompletion);
    assert.equal(session.fitMatch, null, postingCompletion);
    assert.deepEqual(session.questions, [], postingCompletion);
    assert.equal(session.error, expectedError, postingCompletion);
    assert.equal(session.serviceDown, false, postingCompletion);

    heldPosting.resolve(postingCompletion === 'success'
      ? response(briefResponse({ questionPrefix: 'STALE' }))
      : response({ error: 'First posting failed.', code: 'upstream_failed' }, 503));
    assert.deepEqual(await firstPosting, { ok: false, code: 'superseded' }, postingCompletion);
    assert.equal(session.phase, 'idle', postingCompletion);
    assert.equal(session.error, expectedError, postingCompletion);
    assert.equal(session.serviceDown, false, postingCompletion);
    assert.deepEqual(session.questions, [], postingCompletion);
  }
});

test('T28 submits bounded saved context, stores a score, advances, and returns the final verdict', async (t) => {
  const vite = await createServer({
    configFile: new URL('../vite.test.config.js', import.meta.url).pathname,
    server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom',
  });
  t.after(() => vite.close());
  const { session, setPosting, startInterview, submitAnswer, getVerdict } = await vite.ssrLoadModule('/src/lib/session.svelte.js');
  reset(session);
  await setPosting(posting, { request: async () => response(briefResponse()) });
  startInterview();

  const calls = [];
  const first = await submitAnswer('  I fixed a stale API guide after speaking with the engineers.  ', {
    request: async (url, options) => {
      calls.push({ url, options });
      return response(scoreResponse(4));
    },
  });
  assert.equal(first.ok, true);
  assert.equal(first.question.id, 'q2');
  assert.equal(session.current, 1);
  assert.equal(session.phase, 'interviewing');
  assert.equal(session.questions[0].answer, 'I fixed a stale API guide after speaking with the engineers.');
  assert.deepEqual(session.questions[0].scores, scoreResponse(4).scores);
  assert.equal(session.scoring, false);
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    task: 'score',
    answer: 'I fixed a stale API guide after speaking with the engineers.',
    question: {
      id: 'q1', prompt: 'Question 1: how would you explain this change?', sourceQuote: posting, targetsGap: false,
    },
    brief: session.brief,
  });

  for (let index = 1; index < 8; index += 1) {
    const result = await submitAnswer(`Answer ${index + 1}`, { request: async () => response(scoreResponse(4)) });
    if (index < 7) assert.equal(result.question.id, `q${index + 2}`);
    else {
      assert.deepEqual(result.verdict, { band: 'ready', average: 4, answered: 8, total: 8, capped: false });
    }
  }
  assert.equal(session.phase, 'done');
  assert.deepEqual(getVerdict(), { band: 'ready', average: 4, answered: 8, total: 8, capped: false });
});

test('T28 preserves an answer on score failure and rejects stale score completion after navigation or edits', async (t) => {
  const vite = await createServer({
    configFile: new URL('../vite.test.config.js', import.meta.url).pathname,
    server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom',
  });
  t.after(() => vite.close());
  const { session, setPosting, startInterview, submitAnswer, MAX_ANSWER_CHARS } = await vite.ssrLoadModule('/src/lib/session.svelte.js');
  reset(session);
  assert.deepEqual(await submitAnswer('answer', { request: () => assert.fail('unready session must not call') }), {
    ok: false, error: 'Start the interview before submitting an answer.',
  });
  await setPosting(posting, { request: async () => response(briefResponse()) });
  startInterview();
  assert.deepEqual(await submitAnswer('  ', { request: () => assert.fail('empty answer must not call') }), {
    ok: false, error: 'Type your answer first, or skip this question.',
  });
  assert.deepEqual(await submitAnswer('x'.repeat(MAX_ANSWER_CHARS + 1), { request: () => assert.fail('long answer must not call') }), {
    ok: false, error: 'That answer is very long. Shorten it to the part you would actually say out loud.',
  });
  const failed = await submitAnswer('Keep this answer.', {
    request: async () => response({ error: 'Temporary scoring failure.', code: 'upstream_failed' }, 503),
  });
  assert.deepEqual(failed, { ok: false, status: 503, code: 'upstream_failed', error: 'Temporary scoring failure.' });
  assert.equal(session.questions[0].answer, 'Keep this answer.');
  assert.equal(session.questions[0].scores, null);
  assert.equal(session.scoreFailed, true);
  assert.equal(session.scoring, false);

  const held = deferred();
  const stale = submitAnswer('Original answer.', { request: async () => held.promise });
  assert.equal(session.scoring, true);
  session.questions[0].answer = 'Edited while the score was in flight.';
  held.resolve(response(scoreResponse(5)));
  assert.deepEqual(await stale, { ok: false, code: 'superseded' });
  assert.equal(session.questions[0].answer, 'Edited while the score was in flight.');
  assert.equal(session.questions[0].scores, null);
  assert.equal(session.current, 0);
  assert.equal(session.scoring, false);

  const heldReplacement = deferred();
  let scoreSignal;
  const replaced = submitAnswer('Answer for the old posting.', {
    request: async (url, options) => {
      scoreSignal = options.signal;
      return heldReplacement.promise;
    },
  });
  const newerPosting = 'Explain an incident to a warehouse team.';
  await setPosting(newerPosting, {
    request: async () => response(briefResponse({ sourceQuote: newerPosting, questionPrefix: 'NEW' })),
  });
  assert.equal(scoreSignal.aborted, true);
  heldReplacement.resolve(response(scoreResponse(5)));
  assert.deepEqual(await replaced, { ok: false, code: 'superseded' });
  assert.equal(session.posting, newerPosting);
  assert.equal(session.questions[0].answer, null);
  assert.equal(session.questions[0].scores, null);
});

test('T28 restart repro cannot associate a former score with a failed replacement transcript', async (t) => {
  const vite = await createServer({
    configFile: new URL('../vite.test.config.js', import.meta.url).pathname,
    server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom',
  });
  t.after(() => vite.close());
  const { session, setPosting, startInterview, submitAnswer, getVerdict } = await vite.ssrLoadModule('/src/lib/session.svelte.js');
  reset(session);
  await setPosting(posting, { request: async () => response(briefResponse()) });
  assert.equal(startInterview().ok, true);
  assert.equal((await submitAnswer('First transcript.', {
    request: async () => response(scoreResponse(5)),
  })).ok, true);

  // Reviewer reproduction: a public restart call is rejected after scoring,
  // and a replacement transcript clears every old scoring artifact even when
  // the score endpoint returns 503.
  assert.deepEqual(startInterview(), {
    ok: false, error: 'Start a new practice plan before starting another interview.',
  });
  session.current = 0;
  const replacement = await submitAnswer('Replacement answer.', {
    request: async () => response({ error: 'Temporary scoring failure.', code: 'upstream_failed' }, 503),
  });
  assert.equal(replacement.ok, false);
  assert.equal(session.questions[0].answer, 'Replacement answer.');
  assert.equal(session.questions[0].scores, null);
  assert.deepEqual(session.questions[0].missed, []);
  assert.equal(session.questions[0].modelAnswer, undefined);
  assert.deepEqual(getVerdict(), { band: 'not yet', average: 0, answered: 0, total: 8, capped: false });
});

test('T29 calculates from complete valid scores and caps incomplete high-score sessions', async (t) => {
  const vite = await createServer({
    configFile: new URL('../vite.test.config.js', import.meta.url).pathname,
    server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom',
  });
  t.after(() => vite.close());
  const { session, setPosting, getVerdict } = await vite.ssrLoadModule('/src/lib/session.svelte.js');
  reset(session);
  await setPosting(posting, { request: async () => response(briefResponse()) });
  for (let index = 0; index < 3; index += 1) {
    Object.assign(session.questions[index], {
      answer: `Good answer ${index + 1}`,
      scores: scoreResponse(5).scores,
      missed: scoreResponse(5).missed,
      modelAnswer: scoreResponse(5).modelAnswer,
    });
  }
  assert.deepEqual(getVerdict(), { band: 'not yet', average: 5, answered: 3, total: 8, capped: true });

  // A malformed direct mutation is not an answer score and cannot inflate a
  // result that a skipped or incomplete session reports.
  Object.assign(session.questions[3], {
    answer: 'Corrupt score must not count.',
    scores: { specificity: 99 },
    missed: [],
    modelAnswer: 'Broken',
  });
  assert.deepEqual(getVerdict(), { band: 'not yet', average: 5, answered: 3, total: 8, capped: true });
  for (let index = 3; index < 8; index += 1) {
    Object.assign(session.questions[index], {
      answer: `Nearly answer ${index + 1}`,
      scores: scoreResponse(3).scores,
      missed: scoreResponse(3).missed,
      modelAnswer: scoreResponse(3).modelAnswer,
      skipped: false,
    });
  }
  assert.deepEqual(getVerdict(), { band: 'nearly', average: 3.75, answered: 8, total: 8, capped: false });
});

test('T30 restores only versioned valid state and safely discards corrupt or stale storage', async (t) => {
  const vite = await createServer({
    configFile: new URL('../vite.test.config.js', import.meta.url).pathname,
    server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom',
  });
  t.after(() => vite.close());
  const capabilities = await vite.ssrLoadModule('/src/lib/session.svelte.js');
  const { session, setPosting, setResume, persistSession, restoreSession, SESSION_STORAGE_KEY, SESSION_STORAGE_VERSION } = capabilities;
  reset(session);
  await setPosting(posting, { request: async () => response(briefResponse()) });
  session.questions[0].answer = 'A saved answer.';
  session.questions[0].scores = scoreResponse(4).scores;
  session.questions[0].missed = scoreResponse(4).missed;
  session.questions[0].modelAnswer = scoreResponse(4).modelAnswer;
  session.current = 1;
  session.phase = 'interviewing';
  const storage = memoryStorage();
  assert.equal(persistSession(storage), true);
  const saved = JSON.parse(storage.getItem(SESSION_STORAGE_KEY));
  assert.equal(saved.version, SESSION_STORAGE_VERSION);
  assert.equal(Object.hasOwn(saved.session, 'resume'), false);
  assert.equal(saved.session.error, undefined);
  assert.equal(saved.session.scoring, undefined);

  reset(session);
  session.error = 'Transient state must not return.';
  session.agentSeen = true;
  assert.equal(restoreSession(storage), true);
  assert.equal(session.phase, 'interviewing');
  assert.equal(session.current, 1);
  assert.equal(session.questions[0].answer, 'A saved answer.');
  assert.deepEqual(session.questions[0].scores, scoreResponse(4).scores);
  assert.equal(session.error, null);
  assert.equal(session.agentSeen, false);

  const corrupt = memoryStorage({ [SESSION_STORAGE_KEY]: '{not json' });
  assert.equal(restoreSession(corrupt), false);
  assert.deepEqual(corrupt.removed, [SESSION_STORAGE_KEY]);
  const stale = memoryStorage({ [SESSION_STORAGE_KEY]: JSON.stringify({ version: SESSION_STORAGE_VERSION - 1, session: saved.session }) });
  assert.equal(restoreSession(stale), false);
  assert.deepEqual(stale.removed, [SESSION_STORAGE_KEY]);

  // The required copy says the CV is never saved. CV-backed state therefore
  // clears any older snapshot rather than serializing the raw text or its
  // derived fit/gap analysis; old version-1 records are removed on sight.
  const cv = 'Jane Candidate CV: home address 1 Private Street';
  await setResume(cv, { request: async () => response(briefResponse({ withResume: true })) });
  assert.equal(persistSession(storage), false);
  assert.equal(storage.getItem(SESSION_STORAGE_KEY), null);
  const legacy = memoryStorage({
    [SESSION_STORAGE_KEY]: JSON.stringify({
      version: 1,
      session: { ...saved.session, resume: cv, fitMatch: briefResponse({ withResume: true }).fitMatch },
    }),
  });
  assert.equal(restoreSession(legacy), false);
  assert.equal(legacy.getItem(SESSION_STORAGE_KEY), null);
  assert.deepEqual(legacy.removed, [SESSION_STORAGE_KEY]);
});
