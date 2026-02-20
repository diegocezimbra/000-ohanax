/**
 * LLM Adapter - Google Gemini.
 * Default model: gemini-2.5-flash (~$0.10/$0.40 per 1M tokens).
 */

/**
 * Generate text using Gemini.
 * @param {Object} opts
 * @param {string} opts.apiKey - Google API key
 * @param {string} [opts.model='gemini-2.5-flash']
 * @param {string} opts.systemPrompt
 * @param {string} opts.userPrompt
 * @param {number} [opts.maxTokens=4096]
 * @param {number} [opts.temperature=0.7]
 * @param {string} [opts.responseFormat='text'] - 'text' | 'json'
 * @returns {Promise<{ text: string, usage: { inputTokens: number, outputTokens: number } }>}
 */
export async function generateText({
  apiKey, model,
  systemPrompt, userPrompt,
  maxTokens = 4096, temperature = 0.7,
  responseFormat = 'text',
}) {
  const geminiModel = model || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

  const body = {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      { role: 'user', parts: [{ text: userPrompt }] },
    ],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature,
    },
  };

  if (responseFormat === 'json') {
    body.generationConfig.responseMimeType = 'application/json';
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`Gemini: ${data.error.message || JSON.stringify(data.error)}`);
  }

  const candidate = data.candidates?.[0];
  if (!candidate) {
    throw new Error('Gemini: No candidates returned');
  }

  // Filter out thinking parts (Gemini 2.5+ returns parts with thought:true for reasoning)
  const parts = candidate.content?.parts || [];
  const text = parts.filter(p => !p.thought).map(p => p.text).filter(Boolean).join('') || '';
  const usage = data.usageMetadata || {};

  return {
    text,
    usage: {
      inputTokens: usage.promptTokenCount || 0,
      outputTokens: usage.candidatesTokenCount || 0,
    },
  };
}

/**
 * Parse a JSON response from LLM output, handling markdown code blocks.
 */
export function parseJsonResponse(text) {
  let cleaned = text.trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    // Fall through to cleanup
  }

  // Remove markdown code blocks (```json ... ``` or ``` ... ```)
  const codeBlockMatch = cleaned.match(/```(?:json|JSON)?\s*\n?([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  // Remove any leading/trailing non-JSON characters
  const firstBracket = cleaned.search(/[\[{]/);
  if (firstBracket > 0) {
    cleaned = cleaned.substring(firstBracket);
  }

  // Find matching closing bracket
  const lastBracket = cleaned[0] === '[' ? cleaned.lastIndexOf(']') : cleaned.lastIndexOf('}');
  if (lastBracket > 0) {
    cleaned = cleaned.substring(0, lastBracket + 1);
  }

  return JSON.parse(cleaned);
}
