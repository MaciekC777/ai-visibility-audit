import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PromptItem, ModelResponse } from '../types';
import { MODEL_NAMES } from '../config/constants';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
const gemini = new GoogleGenerativeAI(env.GEMINI_API_KEY);

async function queryOpenAI(prompt: PromptItem): Promise<ModelResponse> {
  const start = Date.now();
  try {
    const res = await openai.chat.completions.create({
      model: MODEL_NAMES.openai,
      messages: [{ role: 'user', content: prompt.text }],
      max_tokens: 800,
      temperature: 0.3,
    });
    return {
      model: 'openai',
      promptId: prompt.id,
      response: res.choices[0]?.message?.content ?? '',
      latencyMs: Date.now() - start,
    };
  } catch (e) {
    return { model: 'openai', promptId: prompt.id, response: '', latencyMs: Date.now() - start, error: String(e) };
  }
}

async function queryAnthropic(prompt: PromptItem): Promise<ModelResponse> {
  const start = Date.now();
  try {
    const res = await anthropic.messages.create({
      model: MODEL_NAMES.anthropic,
      messages: [{ role: 'user', content: prompt.text }],
      max_tokens: 800,
    });
    const text = res.content[0].type === 'text' ? res.content[0].text : '';
    return { model: 'anthropic', promptId: prompt.id, response: text, latencyMs: Date.now() - start };
  } catch (e) {
    return { model: 'anthropic', promptId: prompt.id, response: '', latencyMs: Date.now() - start, error: String(e) };
  }
}

async function queryGemini(prompt: PromptItem): Promise<ModelResponse> {
  const start = Date.now();
  try {
    const model = gemini.getGenerativeModel({ model: MODEL_NAMES.gemini });
    const res = await model.generateContent(prompt.text);
    return {
      model: 'gemini',
      promptId: prompt.id,
      response: res.response.text(),
      latencyMs: Date.now() - start,
    };
  } catch (e) {
    return { model: 'gemini', promptId: prompt.id, response: '', latencyMs: Date.now() - start, error: String(e) };
  }
}

async function queryPerplexity(prompt: PromptItem): Promise<ModelResponse> {
  const start = Date.now();
  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL_NAMES.perplexity,
        messages: [{ role: 'user', content: prompt.text }],
        max_tokens: 800,
      }),
    });
    const data = (await res.json()) as any;
    return {
      model: 'perplexity',
      promptId: prompt.id,
      response: data.choices?.[0]?.message?.content ?? '',
      latencyMs: Date.now() - start,
    };
  } catch (e) {
    return { model: 'perplexity', promptId: prompt.id, response: '', latencyMs: Date.now() - start, error: String(e) };
  }
}

const QUERIERS: Record<string, (p: PromptItem) => Promise<ModelResponse>> = {
  openai: queryOpenAI,
  anthropic: queryAnthropic,
  gemini: queryGemini,
  perplexity: queryPerplexity,
};

export async function queryAllModels(
  prompts: PromptItem[],
  models: string[]
): Promise<ModelResponse[]> {
  const tasks: Promise<ModelResponse>[] = [];
  for (const model of models) {
    const querier = QUERIERS[model];
    if (!querier) {
      logger.warn(`Unknown model: ${model}`);
      continue;
    }
    for (const prompt of prompts) {
      tasks.push(querier(prompt));
    }
  }
  const results = await Promise.allSettled(tasks);
  return results
    .filter((r): r is PromiseFulfilledResult<ModelResponse> => r.status === 'fulfilled')
    .map((r) => r.value);
}
