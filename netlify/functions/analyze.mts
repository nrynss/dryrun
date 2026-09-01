import OpenAI from 'openai';

// The only server code. Fixed prompts, structured outputs, no conversation.
// The interview itself runs on the user's own ChatGPT.
const MODEL = 'gpt-5.6-luna';

// Judging runs 4-21 September and we cannot redeploy. So the guard that
// matters is an input cap. An oversized paste is the only way to burn real
// money on a single request.
const MAX_INPUT_CHARS = 20_000;

type Body = {
  task: 'brief' | 'score';
  posting?: string;
  resume?: string;
  answer?: string;
};

export default async (req: Request) => {
  // AI Gateway injects OPENAI_BASE_URL at runtime. Its absence means the
  // project has never had a production deploy, not that a key is missing.
  if (!process.env.OPENAI_BASE_URL) {
    return Response.json(
      { error: 'AI Gateway is not active on this deploy.' },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const oversized = [body.posting, body.resume, body.answer].find(
    (s) => typeof s === 'string' && s.length > MAX_INPUT_CHARS,
  );
  if (oversized) {
    return Response.json(
      { error: `Input exceeds the ${MAX_INPUT_CHARS.toLocaleString()} character limit.` },
      { status: 413 },
    );
  }

  const client = new OpenAI(); // no key: the gateway supplies credentials

  try {
    // TODO: task === 'brief'  -> posting (+ resume) -> brief, 8 questions, fit match
    //       task === 'score'  -> answer -> 4 axis scores, missed points, model answer
    return Response.json({ error: 'not implemented', model: MODEL }, { status: 501 });
  } catch (e) {
    return Response.json({ error: `${e}` }, { status: 500 });
  }
};

export const config = { path: '/api/analyze' };
