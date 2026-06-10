import { authFetch } from '@/lib/api-client';

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
  return { available: true, status: 'server', message: 'Server-side AI is available.' };
}

export async function runLocalAI(prompt: string, options?: { systemInstruction?: string }): Promise<string> {
  // Prefer on-device Gemini Nano when available
  if (await hasChromeLocalAI()) {
    const session = await (window as any).ai.languageModel.create({
      systemPrompt: options?.systemInstruction,
    });
    return await session.prompt(prompt);
  }

  // Fall back to the server-side AI route (keys never leave the server)
  const res = await authFetch('/api/hermes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      systemOverride: options?.systemInstruction ?? 'You are a helpful assistant. Follow the user instructions exactly.',
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `AI request failed (${res.status})`);
  }
  const data = await res.json();
  return data.content ?? '';
}

export async function analyzeReceiptWithAI(imageBase64: string): Promise<{
  storeName: string | null;
  total: number;
  items: { name: string; quantity: number; unit: string; category: string; price?: number }[];
}> {
  const res = await authFetch('/api/scan-receipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageBase64 }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Receipt scan failed (${res.status})`);
  }
  return res.json();
}
