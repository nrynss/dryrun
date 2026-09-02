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

function textOf(result) {
  assert.equal(result.content.length, 1);
  assert.equal(result.content[0].type, 'text');
  return result.content[0].text;
}

test('T31 registers the remaining WebMCP tools and wraps session capabilities', async (t) => {
  const previousDocument = globalThis.document;
  const previousFetch = globalThis.fetch;
  const registered = [];
  globalThis.document = {
    modelContext: {
      registerTool(definition, options) {
        registered.push({ definition, options });
      },
    },
  };
  t.after(() => {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    globalThis.fetch = previousFetch;
  });

  const vite = await createServer({
    configFile: new URL('../vite.test.config.js', import.meta.url).pathname,
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
  });
  t.after(() => vite.close());

  const { registerTools } = await vite.ssrLoadModule('/src/lib/webmcp.js');
  const { session } = await vite.ssrLoadModule('/src/lib/session.svelte.js');
  reset(session);

  const teardown = registerTools();
  t.after(() => teardown());

  const byName = Object.fromEntries(registered.map((entry) => [entry.definition.name, entry.definition]));

  await t.test('registers all six tools with schemas, descriptions, and annotations', () => {
    assert.deepEqual(registered.map((entry) => entry.definition.name), [
      'set_posting', 'set_resume', 'get_brief', 'start_interview', 'submit_answer', 'get_verdict',
    ]);

    assert.equal(byName.set_posting.annotations.untrustedContentHint, true);
    assert.equal(byName.set_resume.annotations.untrustedContentHint, true);
    assert.equal(byName.set_posting.annotations.readOnlyHint, undefined);
    assert.equal(byName.set_resume.annotations.readOnlyHint, undefined);
    assert.equal(byName.get_brief.annotations.readOnlyHint, true);
    assert.equal(byName.get_verdict.annotations.readOnlyHint, true);
    assert.equal(byName.start_interview.annotations, undefined);
    assert.equal(byName.submit_answer.annotations, undefined);

    assert.match(byName.submit_answer.description, /transcript is the user'?s spoken answer/i);
    assert.deepEqual(byName.submit_answer.inputSchema.required, ['transcript']);
    assert.equal(byName.submit_answer.inputSchema.properties.transcript.type, 'string');
    assert.deepEqual(byName.set_resume.inputSchema.required, ['resume']);
    assert.equal(byName.set_resume.inputSchema.properties.resume.type, 'string');

    const signal = registered[0].options.signal;
    assert.equal(signal.aborted, false);
    for (const entry of registered) assert.equal(entry.options.signal, signal);
  });

  await t.test('execute records every call and drives a thin interview path', async () => {
    async function call(name, args) {
      session.agentSeen = false;
      session.lastCallAt = null;
      const before = Date.now();
      const result = await byName[name].execute(args);
      assert.equal(session.agentSeen, true);
      assert.equal(typeof session.lastCallAt, 'number');
      assert.ok(session.lastCallAt >= before);
      return textOf(result);
    }

    assert.match(await call('get_brief', {}), /no brief yet/i);

    globalThis.fetch = async (url, options) => {
      assert.equal(url, '/api/analyze');
      const body = JSON.parse(options.body);
      if (body.task === 'brief') {
        return response(briefResponse({ withResume: Boolean(body.resume) }));
      }
      if (body.task === 'score') return response(scoreResponse(4));
      throw new Error(`unexpected task ${body.task}`);
    };

    assert.match(await call('set_posting', { posting }), /Stored the posting, \d+ characters/);
    assert.equal(session.phase, 'ready');

    const resume = 'I wrote internal guides.';
    assert.match(await call('set_resume', { resume }), /Stored the resume, \d+ characters/);
    assert.equal(session.fitMatch.gaps.length, 1);

    const brief = JSON.parse(await call('get_brief', {}));
    assert.deepEqual(brief.owns, ['Keep API documentation accurate.']);
    assert.deepEqual(brief.study, ['Learn the API release process.']);
    assert.deepEqual(brief.angles, ['Whether you can turn technical changes into useful guidance.']);
    assert.equal(brief.confidence, 'high');

    const question = JSON.parse(await call('start_interview', {}));
    assert.equal(question.id, 'q1');
    assert.equal(session.phase, 'interviewing');

    const next = JSON.parse(await call('submit_answer', {
      transcript: 'I fixed a stale API guide after speaking with the engineers.',
    }));
    assert.equal(next.id, 'q2');
    assert.equal(session.current, 1);

    const payload = JSON.parse(await call('get_verdict', {}));
    assert.equal(payload.verdict.answered, 1);
    assert.equal(payload.verdict.total, 8);
    assert.equal(payload.verdict.capped, true);
    assert.equal(payload.questions[0].scores.specificity, 4);
    assert.deepEqual(payload.questions[0].missed, scoreResponse(4).missed);
    assert.equal(payload.questions[0].modelAnswer, scoreResponse(4).modelAnswer);

    reset(session);
    const failedResume = await call('set_resume', { resume: 'CV text without a posting.' });
    assert.match(failedResume, /Paste the job posting before adding your CV/);

    globalThis.fetch = async (url, options) => {
      const body = JSON.parse(options.body);
      if (body.task === 'brief' && !body.resume) return response(briefResponse());
      return response({ error: 'CV analysis failed.', code: 'upstream_failed' }, 503);
    };
    await byName.set_posting.execute({ posting });
    const failedAnalysis = await call('set_resume', { resume });
    assert.match(failedAnalysis, /CV analysis failed/);
  });

  await t.test('overlapping set_posting execute returns string text when superseded', async () => {
    reset(session);

    function assertSupersededToolText(result) {
      const text = textOf(result);
      assert.equal(typeof text, 'string');
      assert.notEqual(text, undefined);
      assert.ok(text.length > 0);
      assert.match(text, /superseded|The request could not be completed\./);
      assert.doesNotMatch(text, /Stored the posting|Stored the resume/);
      const serialized = JSON.stringify(result);
      assert.match(serialized, /"text":/);
      assert.equal(JSON.parse(serialized).content[0].text, text);
      return text;
    }

    const olderPosting = 'Write documentation for the old release.';
    const newerPosting = 'Explain infrastructure incidents to customers.';
    const pending = new Map();
    globalThis.fetch = async (url, options) => {
      assert.equal(url, '/api/analyze');
      const body = JSON.parse(options.body);
      const held = deferred();
      pending.set(body.posting, held);
      return held.promise; // Intentionally ignores abort: generation remains the authority.
    };

    const first = byName.set_posting.execute({ posting: olderPosting });
    const second = byName.set_posting.execute({ posting: newerPosting });

    pending.get(newerPosting).resolve(response(briefResponse({
      sourceQuote: newerPosting,
      questionPrefix: 'NEW',
    })));
    assert.match(textOf(await second), /Stored the posting, \d+ characters/);
    assert.equal(session.posting, newerPosting);
    assert.equal(session.phase, 'ready');

    pending.get(olderPosting).resolve(response(briefResponse({
      sourceQuote: olderPosting,
      questionPrefix: 'OLD',
    })));
    assertSupersededToolText(await first);
    assert.equal(session.posting, newerPosting);

    const olderResume = 'I wrote internal guides.';
    const newerResume = 'I led incident reviews for production APIs.';
    const resumePending = new Map();
    globalThis.fetch = async (url, options) => {
      const body = JSON.parse(options.body);
      const held = deferred();
      resumePending.set(body.resume, held);
      return held.promise;
    };

    const firstResume = byName.set_resume.execute({ resume: olderResume });
    const secondResume = byName.set_resume.execute({ resume: newerResume });

    resumePending.get(newerResume).resolve(response(briefResponse({
      withResume: true,
      sourceQuote: newerPosting,
    })));
    assert.match(textOf(await secondResume), /Stored the resume, \d+ characters/);

    resumePending.get(olderResume).resolve(response(briefResponse({
      withResume: true,
      sourceQuote: newerPosting,
    })));
    assertSupersededToolText(await firstResume);
  });

  await t.test('submit_answer on the last question returns the verdict object', async () => {
    reset(session);
    globalThis.fetch = async (url, options) => {
      assert.equal(url, '/api/analyze');
      const body = JSON.parse(options.body);
      if (body.task === 'brief') return response(briefResponse());
      if (body.task === 'score') return response(scoreResponse(4));
      throw new Error(`unexpected task ${body.task}`);
    };

    assert.match(textOf(await byName.set_posting.execute({ posting })), /Stored the posting/);
    const firstQuestion = JSON.parse(textOf(await byName.start_interview.execute({})));
    assert.equal(firstQuestion.id, 'q1');
    assert.equal(session.phase, 'interviewing');

    session.current = session.questions.length - 1;
    const text = textOf(await byName.submit_answer.execute({
      transcript: 'I fixed a stale API guide after speaking with the engineers.',
    }));
    assert.equal(typeof text, 'string');
    const verdict = JSON.parse(text);
    assert.equal(verdict.band, 'not yet');
    assert.equal(verdict.average, 4);
    assert.equal(verdict.answered, 1);
    assert.equal(verdict.total, 8);
    assert.equal(verdict.capped, true);
    assert.equal(verdict.id, undefined);
    assert.equal(verdict.prompt, undefined);
    assert.equal(session.phase, 'done');
  });

  await t.test('HMR teardown abort is safe without Chrome', () => {
    teardown();
    assert.equal(registered[0].options.signal.aborted, true);
    teardown();
    assert.equal(registered[0].options.signal.aborted, true);
  });
});
