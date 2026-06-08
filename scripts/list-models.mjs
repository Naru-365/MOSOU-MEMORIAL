// Lists the Gemini models available to your GEMINI_API_KEY.
//
// Why: the chat model id is centralized as CHAT_MODEL in app/api/chat/route.ts.
// Before bumping it, run this to confirm the exact id exists for your key
// (model ids are not guessable — verify the string against this list).
//
// Usage:
//   GEMINI_API_KEY=your_key node scripts/list-models.mjs
//
// Then pick the newest Flash id that prints and set CHAT_MODEL accordingly.
// CHAT_MODEL is currently gemini-3.5-flash; bump it if a newer Flash appears.
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
