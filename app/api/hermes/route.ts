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

  // Primary: Claude (Anthropic)
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: anthropicKey });

      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemContent,
        messages: messages.map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      });

      const content = response.content[0].type === 'text' ? response.content[0].text : '';
      return NextResponse.json({ content, model: 'claude-haiku' });
    } catch (e) {
      console.error('Claude error:', e);
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

  return NextResponse.json(
    { error: 'No AI provider configured. Set ANTHROPIC_API_KEY or GEMINI_API_KEY in Vercel env vars.' },
    { status: 503 },
  );
}
