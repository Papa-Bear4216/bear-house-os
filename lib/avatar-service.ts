import { authFetch } from '@/lib/api-client';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let quotaExceededUntil = 0;

export async function generateFamilyAvatar(name: string, color: string): Promise<string | null> {
  if (Date.now() < quotaExceededUntil) {
    console.warn('Gemini API Quota was recently exceeded. Skipping avatar generation for now.');
    return null;
  }

  const maxRetries = 5;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await authFetch('/api/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
      });

      if (res.status === 429) {
        quotaExceededUntil = Date.now() + (30 * 60 * 1000);
        console.warn('Gemini API Quota exceeded. Returning null for avatar generation and cooling down for 30 minutes.');
        return null;
      }

      if (res.status >= 500 && attempt < maxRetries - 1) {
        // Increase delay for transient errors: 2s, 4s, 8s, 16s...
        const baseDelay = 2000;
        const delay = Math.pow(2, attempt) * baseDelay + Math.random() * 1000;
        console.warn(`Transient error for avatar generation, retrying in ${Math.round(delay)}ms... (Attempt ${attempt + 1}/${maxRetries})`);
        await sleep(delay);
        continue;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn('Failed to generate avatar:', err.error ?? `HTTP ${res.status}`);
        return null;
      }

      const data = await res.json();
      return data.avatarUrl ?? null;
    } catch (error: unknown) {
      console.warn('Failed to generate avatar:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  return null;
}
