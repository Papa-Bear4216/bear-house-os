import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { verifyAuth, unauthorized } from '@/lib/server-auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!(await verifyAuth(req))) return unauthorized();

  try {
    const { name, color } = await req.json();

    if (!name || typeof name !== 'string' || name.length > 100) {
      return NextResponse.json({ error: 'Missing or invalid name' }, { status: 400 });
    }
    if (typeof color !== 'string' || color.length > 50) {
      return NextResponse.json({ error: 'Invalid color' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not set on server' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `A cute 3D claymorphism-style character avatar icon for a person named "${name}". The character should have a soft, matte clay texture with smooth rounded shapes. Dominant color: ${color.replace('bg-', '')}. Composition: centered, isolated on a simple clean background, studio lighting, high resolution, 3D render, Pixar-style aesthetic, professional profile icon. [Salt: ${Math.random().toString(36).substring(7)}]`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: '1:1',
        },
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData) {
          return NextResponse.json({ avatarUrl: `data:image/png;base64,${part.inlineData.data}` });
        }
      }
    }
    return NextResponse.json({ avatarUrl: null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const isQuota = message.includes('429') || message.includes('RESOURCE_EXHAUSTED') || message.includes('quota');
    console.error('avatar error:', message);
    return NextResponse.json(
      { error: message },
      { status: isQuota ? 429 : 500 }
    );
  }
}
