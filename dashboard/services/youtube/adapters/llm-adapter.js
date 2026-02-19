/**
 * LLM Adapter - OpenAI + Anthropic Claude abstraction.
 * Provides a unified interface for text generation across providers.
 */

/**
 * Generate text using the configured LLM provider.
 * @param {Object} opts
 * @param {string} opts.provider - 'openai' | 'anthropic'
 * @param {string} opts.apiKey
 * @param {string} opts.model - e.g. 'gpt-4o', 'claude-sonnet-4-20250514'
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
  if (provider === 'anthropic') {
    return callAnthropic({ apiKey, model, systemPrompt, userPrompt, maxTokens, temperature });
  }
  return callOpenAI({ apiKey, model, systemPrompt, userPrompt, maxTokens, temperature, responseFormat });
}

/**
 * Parse a JSON response from LLM output, handling markdown code blocks.
 */
export function parseJsonResponse(text) {
  let cleaned = text.trim();
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }
  return JSON.parse(cleaned);
}

// --- Internal providers ---

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
