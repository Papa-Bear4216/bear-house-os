export async function checkLocalAIAvailability() {
  if (typeof window !== 'undefined' && 'ai' in window && 'languageModel' in (window as any).ai) {
    try {
      const capabilities = await (window as any).ai.languageModel.capabilities();
      if (capabilities.available === 'readily') {
        return { available: true, status: 'readily', message: 'Local AI is ready.' };
      }
      if (capabilities.available === 'after-download') {
        return { available: false, status: 'after-download', message: 'Local AI requires downloading a local model.' };
      }
      return { available: false, status: capabilities.available, message: `Local AI status: ${capabilities.available}` };
    } catch (e) {
       return { available: false, status: 'error', message: 'Error checking Local AI capabilities.' };
    }
  }
  return { available: false, status: 'missing', message: 'Prompt API not found. Please enable #prompt-api-for-gemini-nano in Chrome flags.' };
}

export async function runLocalAI(prompt: string, options?: { systemInstruction?: string }): Promise<string> {
  const { available } = await checkLocalAIAvailability();
  if (!available) {
    throw new Error('Local AI is not available on this device/browser.');
  }

  const session = await (window as any).ai.languageModel.create({
    systemPrompt: options?.systemInstruction,
  });
  const response = await session.prompt(prompt);
  return response;
}
