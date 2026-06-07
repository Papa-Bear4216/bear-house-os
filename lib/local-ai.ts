import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

async function hasChromeLocalAI(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('ai' in window) || !('languageModel' in (window as any).ai)) return false;
  try {
    const caps = await (window as any).ai.languageModel.capabilities();
    return caps.available === 'readily';
  } catch {
    return false;
  }
}

export async function checkLocalAIAvailability() {
  if (await hasChromeLocalAI()) {
    return { available: true, status: 'readily', message: 'On-device Gemini Nano is ready.' };
  }
  if (GEMINI_API_KEY) {
    return { available: true, status: 'gemini-api', message: 'Gemini API is available.' };
  }
  return {
    available: false,
    status: 'missing',
    message: 'No AI configured. Set NEXT_PUBLIC_GEMINI_API_KEY or enable the Chrome Prompt API (chrome://flags/#prompt-api-for-gemini-nano).',
  };
}

export async function runLocalAI(prompt: string, options?: { systemInstruction?: string }): Promise<string> {
  // Prefer on-device Gemini Nano when available
  if (await hasChromeLocalAI()) {
    const session = await (window as any).ai.languageModel.create({
      systemPrompt: options?.systemInstruction,
    });
    return await session.prompt(prompt);
  }

  // Fall back to Gemini API
  if (!GEMINI_API_KEY) {
    throw new Error(
      'AI is not available. Set NEXT_PUBLIC_GEMINI_API_KEY in your environment or enable Chrome Prompt API flags.'
    );
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
    ...(options?.systemInstruction && {
      config: { systemInstruction: options.systemInstruction },
    }),
  });
  return response.text ?? '';
}

export async function analyzeImageWithAI(imageBase64: string, prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('Set NEXT_PUBLIC_GEMINI_API_KEY to use the scanner AI.');
  }
  const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [
      {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
          { text: prompt },
        ],
      },
    ],
  });
  return response.text ?? '';
}
