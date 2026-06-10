import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { verifyAuth, unauthorized } from '@/lib/server-auth';

export const runtime = 'nodejs';
export const maxDuration = 30;

const receiptSchema = {
  type: Type.OBJECT,
  properties: {
    storeName: { type: Type.STRING, nullable: true },
    total: { type: Type.NUMBER },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          quantity: { type: Type.NUMBER },
          unit: { type: Type.STRING },
          category: {
            type: Type.STRING,
            enum: ['produce', 'meat', 'dairy', 'bakery', 'pantry', 'frozen',
                   'beverages', 'household', 'personal-care', 'other'],
          },
          price: { type: Type.NUMBER, nullable: true },
        },
        required: ['name', 'quantity', 'unit', 'category'],
      },
    },
  },
  required: ['total', 'items'],
};

const RECEIPT_INSTRUCTION = `You are analyzing a grocery receipt or a photo of grocery items/food. Extract everything you can see.
If analyzing a photo of actual food/groceries (not a paper receipt), estimate reasonable quantities.
Always return an "items" array, even if empty. Set storeName to null if no store is identifiable.`;

export async function POST(req: NextRequest) {
  if (!(await verifyAuth(req))) return unauthorized();

  try {
    const { image } = await req.json();

    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid image' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not set on server' }, { status: 500 });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const mimeMatch = image.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: 'Extract the items from this receipt or grocery photo.' },
          ],
        },
      ],
      config: {
        systemInstruction: RECEIPT_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: receiptSchema,
        temperature: 0.2,
      },
    });

    const text = response.text;
    if (!text) {
      return NextResponse.json({ error: 'Empty response from model' }, { status: 502 });
    }

    const parsed = JSON.parse(text);
    return NextResponse.json({
      storeName: parsed.storeName ?? null,
      total: parsed.total ?? 0,
      items: parsed.items ?? [],
    });
  } catch (err: unknown) {
    console.error('scan-receipt error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error during receipt scan' },
      { status: 500 }
    );
  }
}
