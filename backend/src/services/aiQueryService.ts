import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PromptItem, ModelResponse } from '../types';
import { MODEL_NAMES, RETRY_DELAYS_MS, MODEL_TIMEOUT_MS } from '../config/constants';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
const gemini = new GoogleGenerativeAI(env.GEMINI_API_KEY);

const SYSTEM_PROMPT = 'You are a helpful assistant. Answer the user\'s question.';

// ─── Retry wrapper ────────────────────────────────────────────────────────────

async function withRetry<T>(fn: () => Promise<T>, delays = RETRY_DELAYS_MS): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < delays.length) {
        logger.debug(`Retry attempt ${attempt + 1} after ${delays[attempt]}ms`);
        await new Promise(r => setTimeout(r, delays[attempt]));
      }
    }
  }
  throw lastError;
}

function extractSources(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s\])"',>]+/g;
  const matches = text.match(urlRegex) ?? [];
  return [...new Set(matches)].slice(0, 10);
}

// ─── OpenAI with web search (Responses API) ───────────────────────────────────

async function queryOpenAI(prompt: PromptItem): Promise<ModelResponse> {
  const start = Date.now();
  try {
    const result = await withRetry(async () => {
      // Use Responses API with web_search_preview tool
      const res = await (openai as any).responses.create({
        model: MODEL_NAMES.openai,
        tools: [{ type: 'web_search_preview' }],
        input: prompt.text,
        instructions: SYSTEM_PROMPT,
        max_output_tokens: 1024,
      });

      // Extract text from output
      let responseText = '';
      if (res.output) {
        for (const block of res.output) {
          if (block.type === 'message' && block.content) {
            for (const c of block.content) {
              if (c.type === 'output_text') responseText += c.text;
            }
          }
        }
      }
      if (!responseText && res.output_text) responseText = res.output_text;

      const sources = extractSources(responseText);
      return {
        model: 'openai',
        promptId: prompt.id,
        promptText: prompt.text,
        promptCategory: prompt.category,
        response: responseText,
        sources_cited: sources,
        timestamp: new Date().toISOString(),
        tokens_in: res.usage?.input_tokens ?? 0,
        tokens_out: res.usage?.output_tokens ?? 0,
        latency_ms: Date.now() - start,
        search_enabled: true,
      } as ModelResponse;
    });
    return result;
  } catch (e) {
    // Fallback to standard chat completions if Responses API fails
    try {
      const res = await openai.chat.completions.create({
        model: MODEL_NAMES.openai,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt.text },
        ],
        max_tokens: 1024,
        temperature: 0,
      });
      const text = res.choices[0]?.message?.content ?? '';
      const refused = text.toLowerCase().includes("i can't help") ||
        text.toLowerCase().includes("i cannot help");
      return {
        model: 'openai',
        promptId: prompt.id,
        promptText: prompt.text,
        promptCategory: prompt.category,
        response: refused ? '' : text,
        sources_cited: extractSources(text),
        timestamp: new Date().toISOString(),
        tokens_in: res.usage?.prompt_tokens ?? 0,
        tokens_out: res.usage?.completion_tokens ?? 0,
        latency_ms: Date.now() - start,
        search_enabled: false,
        refused,
      };
    } catch (fallbackErr) {
      logger.error('OpenAI query failed (with fallback)', { error: fallbackErr });
      return {
        model: 'openai',
        promptId: prompt.id,
        promptText: prompt.text,
        promptCategory: prompt.category,
        response: '',
        sources_cited: [],
        timestamp: new Date().toISOString(),
        tokens_in: 0,
        tokens_out: 0,
        latency_ms: Date.now() - start,
        search_enabled: false,
        error: String(fallbackErr),
      };
    }
  }
}

// ─── Anthropic with web search ────────────────────────────────────────────────

async function queryAnthropic(prompt: PromptItem): Promise<ModelResponse> {
  const start = Date.now();
  try {
    return await withRetry(async () => {
      const res = await anthropic.messages.create({
        model: MODEL_NAMES.anthropic,
        max_tokens: 1024,
        temperature: 0,
        tools: [{ type: 'web_search_20250305' as any, name: 'web_search' }],
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt.text }],
      } as any);

      // Extract text blocks only
      let responseText = '';
      for (const block of res.content) {
        if (block.type === 'text') responseText += block.text;
      }

      const sources = extractSources(responseText);
      const refused = res.stop_reason === 'end_turn' &&
        (responseText.toLowerCase().includes("i can't help") ||
          responseText.toLowerCase().includes("i cannot help"));

      return {
        model: 'anthropic',
        promptId: prompt.id,
        promptText: prompt.text,
        promptCategory: prompt.category,
        response: refused ? '' : responseText,
        sources_cited: sources,
        timestamp: new Date().toISOString(),
        tokens_in: res.usage?.input_tokens ?? 0,
        tokens_out: res.usage?.output_tokens ?? 0,
        latency_ms: Date.now() - start,
        search_enabled: true,
        refused,
      };
    });
  } catch (e) {
    logger.error('Anthropic query failed', { error: e });
    return {
      model: 'anthropic',
      promptId: prompt.id,
      promptText: prompt.text,
      promptCategory: prompt.category,
      response: '',
      sources_cited: [],
      timestamp: new Date().toISOString(),
      tokens_in: 0,
      tokens_out: 0,
      latency_ms: Date.now() - start,
      search_enabled: false,
      error: String(e),
    };
  }
}

// ─── Gemini with Google Search ────────────────────────────────────────────────

async function queryGemini(prompt: PromptItem): Promise<ModelResponse> {
  const start = Date.now();
  try {
    return await withRetry(async () => {
      const model = gemini.getGenerativeModel({
        model: MODEL_NAMES.gemini,
        tools: [{ googleSearch: {} } as any],
      });

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt.text }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 1024,
        },
      });

      const responseText = result.response.text();
      const sources = extractSources(responseText);

      // Extract grounding sources if available
      const groundingMetadata = (result.response as any).candidates?.[0]?.groundingMetadata;
      if (groundingMetadata?.webSearchQueries) {
        // sources from grounding
      }

      const refused = responseText.toLowerCase().includes("i can't help with") ||
        responseText.toLowerCase().includes("i'm not able to");

      return {
        model: 'gemini',
        promptId: prompt.id,
        promptText: prompt.text,
        promptCategory: prompt.category,
        response: refused ? '' : responseText,
        sources_cited: sources,
        timestamp: new Date().toISOString(),
        tokens_in: result.response.usageMetadata?.promptTokenCount ?? 0,
        tokens_out: result.response.usageMetadata?.candidatesTokenCount ?? 0,
        latency_ms: Date.now() - start,
        search_enabled: true,
        refused,
      };
    });
  } catch (e) {
    logger.error('Gemini query failed', { error: e });
    return {
      model: 'gemini',
      promptId: prompt.id,
      promptText: prompt.text,
      promptCategory: prompt.category,
      response: '',
      sources_cited: [],
      timestamp: new Date().toISOString(),
      tokens_in: 0,
      tokens_out: 0,
      latency_ms: Date.now() - start,
      search_enabled: false,
      error: String(e),
    };
  }
}

// ─── Perplexity Sonar (web search built-in) ───────────────────────────────────

async function queryPerplexity(prompt: PromptItem): Promise<ModelResponse> {
  const start = Date.now();
  try {
    return await withRetry(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);

      try {
        const res = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: MODEL_NAMES.perplexity,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: prompt.text },
            ],
            max_tokens: 1024,
            temperature: 0,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        const data = (await res.json()) as any;
        const responseText = data.choices?.[0]?.message?.content ?? '';
        const citations = (data as any).citations ?? [];
        const sources = citations.length > 0 ? citations : extractSources(responseText);
        const refused = responseText.toLowerCase().includes("i can't help") ||
          responseText.toLowerCase().includes("i cannot help");

        return {
          model: 'perplexity',
          promptId: prompt.id,
          promptText: prompt.text,
          promptCategory: prompt.category,
          response: refused ? '' : responseText,
          sources_cited: sources,
          timestamp: new Date().toISOString(),
          tokens_in: data.usage?.prompt_tokens ?? 0,
          tokens_out: data.usage?.completion_tokens ?? 0,
          latency_ms: Date.now() - start,
          search_enabled: true,
          refused,
        };
      } finally {
        clearTimeout(timeout);
      }
    });
  } catch (e) {
    logger.error('Perplexity query failed', { error: e });
    return {
      model: 'perplexity',
      promptId: prompt.id,
      promptText: prompt.text,
      promptCategory: prompt.category,
      response: '',
      sources_cited: [],
      timestamp: new Date().toISOString(),
      tokens_in: 0,
      tokens_out: 0,
      latency_ms: Date.now() - start,
      search_enabled: false,
      error: String(e),
    };
  }
}

// ─── Model dispatch ───────────────────────────────────────────────────────────

const QUERIERS: Record<string, (p: PromptItem) => Promise<ModelResponse>> = {
  openai: queryOpenAI,
  anthropic: queryAnthropic,
  gemini: queryGemini,
  perplexity: queryPerplexity,
};

// Query all models: models in parallel, prompts sequential per model (rate limiting)
export async function queryAllModels(
  prompts: PromptItem[],
  models: string[],
  delayBetweenPromptsMs = 300
): Promise<ModelResponse[]> {
  const modelResults = await Promise.all(
    models.map(async (model) => {
      const querier = QUERIERS[model];
      if (!querier) {
        logger.warn(`Unknown model: ${model}`);
        return [];
      }
      const results: ModelResponse[] = [];
      for (const prompt of prompts) {
        const result = await querier(prompt);
        results.push(result);
        // Small delay between prompts to respect rate limits
        if (delayBetweenPromptsMs > 0) {
          await new Promise(r => setTimeout(r, delayBetweenPromptsMs));
        }
      }
      return results;
    })
  );

  return modelResults.flat();
}
