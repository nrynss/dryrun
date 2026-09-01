import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { APIConnectionError, APIConnectionTimeoutError } from 'openai';
import fixture from '../src/lib/example.json' with { type: 'json' };
import t12Fixture from '../dev-diary/t12-bounded-preview-fixture.json' with { type: 'json' };
import {
  MAX_POSTING_CHARS,
  MAX_RESUME_CHARS,
  MAX_SCORE_INPUT_CHARS,
  validateBriefResponse,
  validateScoreResponse,
} from '../src/lib/shapes.js';
import {
  BRIEF_MAX_OUTPUT_TOKENS,
  SCORE_MAX_OUTPUT_TOKENS,
  MODEL_TIMEOUT_MS,
  createAnalyzeHandler,
} from '../netlify/functions/analyze.mts';

process.env.OPENAI_BASE_URL = 'http://mock-gateway.invalid';

const posting = 'Build precise API documentation and collaborate with engineers.';
const question = { id: 'q1', prompt: 'How would you document this API?', sourceQuote: 'API documentation', targetsGap: false };
const brief = { owns: ['API documentation'], study: ['The API'], angles: ['Accuracy'], confidence: 'high' };
const validBrief = (withResume = false) => ({
  brief: structuredClone(brief),
  questions: Array.from({ length: 8 }, (_, index) => ({ id: `q${index + 1}`, prompt: `Question ${index + 1}`, sourceQuote: 'API documentation', targetsGap: withResume && index === 0 })),
  fitMatch: withResume ? { evidenced: [{ requirement: 'Writing', evidence: 'Resume says writing.' }], gaps: [], confidence: 'high' } : null,
});
const validScore = { scores: { specificity: 4, evidence: 3, structure: 4, relevance: 5 }, missed: ['Add a concrete result.'], modelAnswer: 'Give a concise, role-grounded example.' };
const complete = (data, usage = {}) => ({
  status: 'completed', model: 'gpt-5.6-luna', output_text: JSON.stringify(data), output: [],
  usage: { input_tokens: 123, output_tokens: 45, total_tokens: 168, ...usage },
});
const mockHandler = (outcomes, calls = []) => createAnalyzeHandler({
  retryBackoffMs: 0,
  clientFactory: () => ({ responses: { create: async (request) => {
    calls.push(request);
    const outcome = outcomes.shift();
    if (outcome instanceof Error) throw outcome;
    return outcome;
  } } }),
});
const call = (handler, body) => handler(new Request('http://localhost/api/analyze', { method: 'POST', body: JSON.stringify(body) }));
const scoreBody = () => ({ task: 'score', answer: 'I documented an API with engineers.', question, brief });

test('fixture satisfies the shared response contracts when it represents a resume session', () => {
  const { brief, questions, fitMatch } = fixture;
  const briefResponse = { brief, questions, fitMatch };
  const { scores, missed, modelAnswer } = fixture.scores[0];
  const scoreResponse = { scores, missed, modelAnswer };
  assert.deepEqual(validateBriefResponse(briefResponse, { requireFitMatch: true }), []);
  assert.deepEqual(validateScoreResponse(scoreResponse), []);
});

test('T12 fixture uses the exact documented worked-example posting', () => {
  const source = readFileSync(new URL('../dev-diary/example-posting.md', import.meta.url));
  assert.equal(t12Fixture.briefRequest.posting, source.toString());
  assert.equal(Buffer.byteLength(t12Fixture.briefRequest.posting), 3_020);
  assert.equal(createHash('sha256').update(source).digest('hex'), '0f7263eaebdde2bc4416903daa091540dd05c7ccf6fb83a1101716d9a9ac1fd6');
});

test('brief validator rejects invented quotes and all no-resume fit/gap output', () => {
  const response = validBrief();
  response.questions[0].sourceQuote = 'not in posting';
  response.questions[1].targetsGap = true;
  response.fitMatch = { evidenced: [], gaps: [], confidence: 'low' };
  const problems = validateBriefResponse(response, { posting, requireFitMatch: false });
  assert.ok(problems.some((problem) => problem.includes('not verbatim')));
  assert.ok(problems.some((problem) => problem.includes('cannot target a gap')));
  assert.ok(problems.some((problem) => problem.includes('must be null')));
});

test('brief validator requires a fit match when a resume exists', () => {
  assert.ok(validateBriefResponse(validBrief(), { posting, requireFitMatch: true }).some((problem) => problem.includes('Missing fit match')));
});

test('score validator rejects fractional axis values', () => {
  const score = structuredClone(validScore);
  score.scores.evidence = 3.5;
  assert.ok(validateScoreResponse(score).some((problem) => problem.includes('evidence')));
});

test('post-parse validators enforce strict object shapes and all schema bounds', () => {
  const response = validBrief(true);
  response.unexpected = true;
  response.brief.owns = Array.from({ length: 7 }, () => 'Own a documented capability.');
  response.questions[0] = { ...response.questions[0], prompt: 'p'.repeat(361), sourceQuote: 'q'.repeat(601), unexpected: true };
  response.fitMatch = {
    evidenced: {},
    gaps: [{ requirement: 'r'.repeat(241), why: 'w'.repeat(301), size: 3, unexpected: true }],
    confidence: 'high',
    unexpected: true,
  };
  assert.ok(validateBriefResponse(response, { posting, requireFitMatch: true }).length > 0);

  const score = structuredClone(validScore);
  score.unexpected = true;
  score.scores.unexpected = 5;
  score.missed = Array.from({ length: 7 }, () => 'm'.repeat(241));
  score.modelAnswer = 'a'.repeat(901);
  assert.ok(validateScoreResponse(score).length > 0);
});

test('analysis endpoint rejects invalid requests before contacting the provider', async () => {
  const calls = [];
  const response = await call(mockHandler([], calls), { task: 'score', answer: 'I did the work.' });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, 'invalid_request');
  assert.equal(calls.length, 0);
});

test('score requires the exact saved Question and brief shapes before contacting the provider', async () => {
  const calls = [];
  const handler = mockHandler([], calls);
  for (const body of [
    { ...scoreBody(), question: { ...question, unexpected: true } },
    { ...scoreBody(), question: { id: question.id, prompt: question.prompt, sourceQuote: question.sourceQuote } },
    { ...scoreBody(), question: { ...question, targetsGap: 'false' } },
    { ...scoreBody(), brief: { ...brief, unexpected: true } },
  ]) {
    const response = await call(handler, body);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, 'invalid_request');
  }
  assert.equal(calls.length, 0);
});

test('brief caps are per documented field, not a hidden aggregate', async () => {
  const calls = [];
  const handler = mockHandler([complete(validBrief(true))], calls);
  const response = await call(handler, { task: 'brief', posting: `${posting}${'x'.repeat(MAX_POSTING_CHARS - posting.length)}`, resume: 'r'.repeat(MAX_RESUME_CHARS) });
  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.equal((await call(mockHandler([]), { task: 'brief', posting: 'x'.repeat(MAX_POSTING_CHARS + 1) })).status, 413);
  assert.equal((await call(mockHandler([]), { task: 'brief', posting, resume: 'r'.repeat(MAX_RESUME_CHARS + 1) })).status, 413);
});

test('score input has its own explicit aggregate cap', async () => {
  const response = await call(mockHandler([]), { ...scoreBody(), answer: 'x'.repeat(MAX_SCORE_INPUT_CHARS) });
  assert.equal(response.status, 413);
});

test('successful mocked brief call sends bounded structured output and complete usage evidence', async () => {
  const calls = [];
  const handler = mockHandler([complete(validBrief(), { input_tokens_details: { cached_tokens: 12, cache_write_tokens: 7 }, output_tokens_details: { reasoning_tokens: 9 } })], calls);
  const response = await call(handler, { task: 'brief', posting });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(calls[0].max_output_tokens, BRIEF_MAX_OUTPUT_TOKENS);
  assert.equal(calls[0].text.format.strict, true);
  assert.equal(calls[0].text.format.schema.properties.questions.maxItems, 8);
  assert.equal(calls[0].text.format.schema.properties.questions.items.properties.prompt.maxLength, 360);
  assert.deepEqual(result.meta.usage, {
    model: 'gpt-5.6-luna', attempts: 1, inputTokens: 123, outputTokens: 45, totalTokens: 168,
    inputTokensDetails: { cachedTokens: 12, cacheWriteTokens: 7 }, outputTokensDetails: { reasoningTokens: 9 },
  });
  assert.equal(MODEL_TIMEOUT_MS, 10_000);
});

test('a returned full brief question forwards to score, while only scoring context reaches the provider', async () => {
  const calls = [];
  const handler = mockHandler([complete(validBrief(true)), complete(validScore)], calls);
  const briefResponse = await call(handler, { task: 'brief', posting, resume: 'I write API documentation.' });
  const briefResult = await briefResponse.json();
  assert.equal(briefResponse.status, 200);

  // This is the exact canonical Question shape returned above, not a client-made
  // three-field projection. Future sessions can forward the saved object intact.
  const scoreResponse = await call(handler, {
    task: 'score',
    answer: 'I partnered with engineers to make the API reference easier to use.',
    question: briefResult.questions[0],
    brief: briefResult.brief,
  });
  const scoreResult = await scoreResponse.json();
  assert.equal(scoreResponse.status, 200);
  assert.deepEqual(scoreResult.scores, validScore.scores);
  assert.equal(scoreResult.meta.usage.outputTokens, 45);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].max_output_tokens, SCORE_MAX_OUTPUT_TOKENS);
  const scoreInput = JSON.parse(calls[1].input);
  assert.deepEqual(scoreInput.question, {
    prompt: briefResult.questions[0].prompt,
    sourceQuote: briefResult.questions[0].sourceQuote,
  });
  assert.equal(Object.hasOwn(scoreInput.question, 'id'), false);
  assert.equal(Object.hasOwn(scoreInput.question, 'targetsGap'), false);
});

test('malformed no-resume fit output retries and then returns a valid score response', async () => {
  const calls = [];
  const malformed = complete(validBrief());
  malformed.output_text = JSON.stringify({ ...validBrief(), fitMatch: { evidenced: [], gaps: [], confidence: 'low' } });
  const response = await call(mockHandler([malformed, complete(validBrief())], calls), { task: 'brief', posting });
  assert.equal(response.status, 200);
  assert.equal(calls.length, 2);
});

test('schema-invalid brief output is retried before a valid response is returned', async () => {
  const calls = [];
  const invalid = validBrief();
  invalid.unexpected = true;
  invalid.brief.owns = Array.from({ length: 7 }, () => 'Own a documented capability.');
  const response = await call(mockHandler([complete(invalid), complete(validBrief())], calls), { task: 'brief', posting });
  assert.equal(response.status, 200);
  assert.equal(calls.length, 2);
});

test('schema-invalid score output exhausts retries with the safe public error', async () => {
  const calls = [];
  const invalid = structuredClone(validScore);
  invalid.scores.unexpected = 5;
  invalid.missed = Array.from({ length: 7 }, () => 'A point that exceeds the schema array limit.');
  const response = await call(mockHandler([complete(invalid), complete(invalid)], calls), scoreBody());
  assert.equal(response.status, 502);
  assert.equal((await response.json()).code, 'invalid_provider_output');
  assert.equal(calls.length, 2);
});

test('malformed output exhaustion is a fixed public error', async () => {
  const malformed = { status: 'completed', output_text: '{not json', output: [] };
  const response = await call(mockHandler([malformed, malformed]), scoreBody());
  assert.equal(response.status, 502);
  assert.equal((await response.json()).code, 'invalid_provider_output');
});

test('provider refusal is not retried and receives its fixed public response', async () => {
  const calls = [];
  const refusal = { status: 'completed', output_text: '', output: [{ type: 'message', content: [{ type: 'refusal' }] }] };
  const response = await call(mockHandler([refusal], calls), scoreBody());
  assert.equal(response.status, 422);
  assert.equal((await response.json()).code, 'provider_refusal');
  assert.equal(calls.length, 1);
});

test('connection, timeout, and retryable HTTP failures take the bounded second attempt', async () => {
  for (const error of [
    new APIConnectionError({ message: 'secret connection detail' }),
    new APIConnectionTimeoutError({ message: 'secret timeout detail' }),
    Object.assign(new Error('secret upstream detail'), { status: 503 }),
  ]) {
    const calls = [];
    const response = await call(mockHandler([error, complete(validScore)], calls), scoreBody());
    assert.equal(response.status, 200);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].max_output_tokens, SCORE_MAX_OUTPUT_TOKENS);
  }
});

test('exhausted retryable provider failure redacts provider details', async () => {
  const secret = Object.assign(new Error('do not expose provider diagnostics'), { status: 500 });
  const response = await call(mockHandler([secret, secret]), scoreBody());
  const result = await response.json();
  assert.equal(response.status, 503);
  assert.equal(result.code, 'provider_unavailable');
  assert.doesNotMatch(result.error, /diagnostics|provider detail/i);
});

test('gateway-unavailable, method, and invalid-JSON boundaries are deterministic and never call the provider', async () => {
  const savedGateway = process.env.OPENAI_BASE_URL;
  try {
    delete process.env.OPENAI_BASE_URL;
    const gatewayCalls = [];
    const gatewayResponse = await call(mockHandler([], gatewayCalls), scoreBody());
    assert.equal(gatewayResponse.status, 503);
    assert.equal((await gatewayResponse.json()).code, 'gateway_unavailable');
    assert.equal(gatewayCalls.length, 0);
  } finally {
    if (savedGateway === undefined) delete process.env.OPENAI_BASE_URL;
    else process.env.OPENAI_BASE_URL = savedGateway;
  }

  const methodCalls = [];
  const methodResponse = await mockHandler([], methodCalls)(new Request('http://localhost/api/analyze', { method: 'GET' }));
  assert.equal(methodResponse.status, 405);
  assert.equal((await methodResponse.json()).code, 'method_not_allowed');
  assert.equal(methodResponse.headers.get('Allow'), 'POST');
  assert.equal(methodCalls.length, 0);

  const jsonCalls = [];
  const jsonResponse = await mockHandler([], jsonCalls)(new Request('http://localhost/api/analyze', { method: 'POST', body: '{not json' }));
  assert.equal(jsonResponse.status, 400);
  assert.equal((await jsonResponse.json()).code, 'invalid_json');
  assert.equal(jsonCalls.length, 0);
});

test('non-retryable provider failures use the fixed analysis-failed response', async () => {
  const calls = [];
  const privateError = new Error('do not expose this provider diagnostic');
  const response = await call(mockHandler([privateError], calls), scoreBody());
  const result = await response.json();
  assert.equal(response.status, 502);
  assert.equal(result.code, 'analysis_failed');
  assert.doesNotMatch(result.error, /diagnostic/i);
  assert.equal(calls.length, 1);
});
