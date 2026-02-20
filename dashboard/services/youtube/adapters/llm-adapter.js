/**
 * LLM Adapter - Registry-based provider abstraction.
 * Supports: OpenAI, Anthropic Claude, Google Gemini.
 * New providers: add a handler function + register in LLM_PROVIDERS.
 */

// --- Provider Registry ---
const LLM_PROVIDERS = {
  openai: callOpenAI,
  anthropic: callAnthropic,
  gemini: callGemini,
};

/**
 * Generate text using the configured LLM provider.
 * @param {Object} opts
 * @param {string} opts.provider - 'openai' | 'anthropic' | 'gemini'
 * @param {string} opts.apiKey
 * @param {string} opts.model - e.g. 'gpt-4o', 'claude-sonnet-4-5-20250929', 'gemini-2.0-flash'
 * @param {string} opts.systemPrompt
 * @param {string} opts.userPrompt
 * @param {number} opts.maxTokens - default 4096
 * @param {number} opts.temperature - default 0.7
 * @param {string} opts.responseFormat - 'text' | 'json'
 * @returns {Promise<{ text: string, usage: { inputTokens: number, outputTokens: number } }>}
 */
export async function generateText({
  provider, apiKey, model,
  systemPrompt, userPrompt,
  maxTokens = 4096, temperature = 0.7,
  responseFormat = 'text',
}) {
  const handler = LLM_PROVIDERS[provider];
  if (!handler) {
    throw new Error(`Unknown LLM provider: '${provider}'. Available: ${Object.keys(LLM_PROVIDERS).join(', ')}`);
  }
  return handler({ apiKey, model, systemPrompt, userPrompt, maxTokens, temperature, responseFormat });
}

/** List available providers. */
export function getAvailableProviders() {
  return Object.keys(LLM_PROVIDERS);
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

// --- OpenAI ---

async function callOpenAI({ apiKey, model, systemPrompt, userPrompt, maxTokens, temperature, responseFormat }) {
  const body = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: maxTokens,
    temperature,
  };

  if (responseFormat === 'json') {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`OpenAI: ${data.error.message || JSON.stringify(data.error)}`);
  }

  return {
    text: data.choices[0].message.content,
    usage: {
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
    },
  };
}

// --- Anthropic ---

async function callAnthropic({ apiKey, model, systemPrompt, userPrompt, maxTokens, temperature }) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`Anthropic: ${data.error.message || JSON.stringify(data.error)}`);
  }

  const textBlock = data.content.find(b => b.type === 'text');
  return {
    text: textBlock?.text || '',
    usage: {
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0,
    },
  };
}

// --- Google Gemini ---

async function callGemini({ apiKey, model, systemPrompt, userPrompt, maxTokens, temperature, responseFormat }) {
  const geminiModel = model || 'gemini-2.0-flash';
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

  const text = candidate.content?.parts?.map(p => p.text).join('') || '';
  const usage = data.usageMetadata || {};

  return {
    text,
    usage: {
      inputTokens: usage.promptTokenCount || 0,
      outputTokens: usage.candidatesTokenCount || 0,
    },
  };
}
