import { NextRequest, NextResponse } from 'next/server';

const BEAR_HOUSE_SYSTEM = `You are Hermes, the intelligent AI backbone of Bear House Family OS. You are warm, proactive, and deeply familiar with this family.

Your role:
- Anticipate needs before they're asked (upcoming events, low supplies, schedule conflicts)
- Remember every family member: their preferences, routines, and patterns
- Help coordinate meals, chores, rewards, and family life
- Suggest recipes based on what the family likes and what's on the schedule
- Notice patterns ("Julia always has soccer Tuesdays — easy dinner night")
- Speak naturally, like a trusted family member who's always one step ahead

Keep responses concise but warm. When you make suggestions, explain briefly why they fit this family specifically.`;

export async function POST(req: NextRequest) {
  const { messages, context, systemOverride } = await req.json();

  const systemContent = `${systemOverride ?? BEAR_HOUSE_SYSTEM}

Current family context:
${JSON.stringify(context ?? {}, null, 2)}`;

  // Try OpenRouter with Hermes 3
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://bearhouseos.vercel.app',
          'X-Title': 'Bear House Family OS',
        },
        body: JSON.stringify({
          model: 'nousresearch/hermes-3-llama-3.1-405b:free',
          messages: [{ role: 'system', content: systemContent }, ...messages],
          temperature: 0.72,
          max_tokens: 1024,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content ?? '';
        return NextResponse.json({ content, model: 'hermes-3-405b' });
      }

      // If free tier exhausted, fall through to Gemini
      console.warn('OpenRouter Hermes unavailable, falling back to Gemini');
    } catch (e) {
      console.error('OpenRouter error:', e);
    }
  }

  // Fallback: Gemini
  const geminiKey = process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const fullPrompt = [
        systemContent,
        ...messages.map((m: { role: string; content: string }) => `${m.role.toUpperCase()}: ${m.content}`),
      ].join('\n\n');

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: fullPrompt,
      });
      return NextResponse.json({ content: response.text ?? '', model: 'gemini-2.0-flash' });
    } catch (e) {
      console.error('Gemini fallback error:', e);
    }
  }

  return NextResponse.json({ error: 'No AI provider configured. Set OPENROUTER_API_KEY or GEMINI_API_KEY.' }, { status: 503 });
}
