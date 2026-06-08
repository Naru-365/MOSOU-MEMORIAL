// Lists the Gemini models available to your GEMINI_API_KEY.
//
// Why: the chat model id is centralized as CHAT_MODEL in app/api/chat/route.ts.
// Before bumping it, run this to confirm the exact id exists for your key
// (model ids are not guessable — there is no "gemini-3.5-flash" today).
//
// Usage:
//   GEMINI_API_KEY=your_key node scripts/list-models.mjs
//
// Then pick the newest Flash id that prints (e.g. a future gemini-3.x-flash)
// and set CHAT_MODEL accordingly. If none newer than gemini-2.5-flash exists,
// leave CHAT_MODEL as is.
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY is not set.');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

const names = [];
for await (const m of await ai.models.list()) {
  if (m.name) names.push(m.name);
}
names.sort();
for (const n of names) console.log(n);
console.log(`\n${names.length} models. Flash candidates:`);
for (const n of names.filter((n) => n.toLowerCase().includes('flash'))) {
  console.log('  ', n);
}
