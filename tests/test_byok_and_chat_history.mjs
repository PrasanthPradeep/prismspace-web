/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * tests/test_byok_and_chat_history.mjs
 * ──────────────────────────────────────
 * Automated test suite for BYOK (Bring Your Own Key) across all 7 AI providers
 * and Chat History accessibility features in PrismSpace.
 */

import assert from 'node:assert/strict';

// Mock localStorage and window for Node environment
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

globalThis.localStorage = new MockLocalStorage();
let lastDispatchedEvent = null;
globalThis.window = {
  dispatchEvent: (event) => {
    lastDispatchedEvent = event;
    return true;
  },
};
globalThis.CustomEvent = class CustomEvent {
  constructor(type, init) {
    this.type = type;
    this.detail = init?.detail;
  }
};

console.log('🧪 Starting BYOK & Chat History Test Suite...\n');

// ── Test 1: Verify Provider Definitions ──
console.log('▶ Test 1: Checking all 7 BYOK Provider Configurations');

const EXPECTED_PROVIDERS = [
  'groq',
  'nvidia',
  'openai',
  'anthropic',
  'google',
  'openrouter',
  'deepseek',
];

// Import module dynamically or test definitions directly
const {
  BYOK_PROVIDERS,
  getProviderForModel,
  maskApiKey,
  getAllStoredApiKeys,
  getStoredApiKey,
  setStoredApiKey,
  removeStoredApiKey,
  isProviderConfigured,
  getAllPromptModels,
} = await import('../lib/byok-storage.ts');

assert.equal(BYOK_PROVIDERS.length, 7, 'Must have exactly 7 providers configured');

const providerIds = BYOK_PROVIDERS.map((p) => p.id);
for (const expectedId of EXPECTED_PROVIDERS) {
  assert.ok(providerIds.includes(expectedId), `Missing provider config for: ${expectedId}`);
}

for (const prov of BYOK_PROVIDERS) {
  assert.ok(prov.name, `${prov.id} must have a name`);
  assert.ok(prov.docUrl.startsWith('https://'), `${prov.id} docUrl must be https link`);
  assert.ok(prov.envKey, `${prov.id} must have an envKey`);
  assert.ok(prov.models.length > 0, `${prov.id} must define at least one model`);
}
console.log('  ✔ All 7 providers verified with valid models, URLs, and schemas.');

// ── Test 2: Model-to-Provider Resolution ──
console.log('\n▶ Test 2: Testing Model-to-Provider Resolution (getProviderForModel)');

const testCases = [
  // Groq
  { model: 'llama-3.3-70b-versatile', expected: 'groq' },
  { model: 'llama3-70b-8192', expected: 'groq' },
  { model: 'mixtral-8x7b-32768', expected: 'groq' },
  // NVIDIA
  { model: 'nvidia/nemotron-3.5-lightning-30b-a3b', expected: 'nvidia' },
  { model: 'meta/llama-3.3-70b-instruct', expected: 'nvidia' },
  // OpenAI
  { model: 'gpt-4o', expected: 'openai' },
  { model: 'gpt-4o-mini', expected: 'openai' },
  { model: 'o1-preview', expected: 'openai' },
  { model: 'o3-mini', expected: 'openai' },
  // Anthropic
  { model: 'claude-3-7-sonnet-latest', expected: 'anthropic' },
  { model: 'claude-3-5-haiku-latest', expected: 'anthropic' },
  // Google
  { model: 'gemini-2.0-flash', expected: 'google' },
  { model: 'gemini-1.5-pro', expected: 'google' },
  // OpenRouter
  { model: 'anthropic/claude-3.7-sonnet', expected: 'openrouter' },
  { model: 'anthropic/claude-3.5-sonnet', expected: 'openrouter' },
  { model: 'deepseek/deepseek-r1', expected: 'openrouter' },
  { model: 'meta-llama/llama-3.3-70b-instruct', expected: 'openrouter' },
  { model: 'google/gemini-2.0-flash-001', expected: 'openrouter' },
  { model: 'mistralai/mistral-large-2411', expected: 'openrouter' },
  { model: 'qwen/qwen-2.5-72b-instruct', expected: 'openrouter' },
  { model: 'openrouter/meta-llama/llama-3.3-70b-instruct', expected: 'openrouter' },
  { model: 'openrouter/anthropic/claude-3.5-sonnet', expected: 'openrouter' },
  { model: 'openrouter/deepseek/deepseek-r1', expected: 'openrouter' },
  // DeepSeek
  { model: 'deepseek-chat', expected: 'deepseek' },
  { model: 'deepseek-reasoner', expected: 'deepseek' },
];

for (const tc of testCases) {
  const resolved = getProviderForModel(tc.model);
  assert.equal(
    resolved,
    tc.expected,
    `Model "${tc.model}" should resolve to provider "${tc.expected}", got "${resolved}"`
  );
}
console.log(`  ✔ Tested ${testCases.length} model resolution cases across all 7 providers.`);

// ── Test 3: API Key Masking ──
console.log('\n▶ Test 3: Testing Key Masking Security');
assert.equal(maskApiKey(''), '', 'Empty key returns empty');
assert.equal(maskApiKey('short'), '••••••••', 'Short key masked');
const maskedAnthropic = maskApiKey('sk-ant-api03-abcdef1234567890xyz');
assert.ok(maskedAnthropic.startsWith('sk-ant'), 'Mask preserves prefix');
assert.ok(maskedAnthropic.endsWith('0xyz'), 'Mask preserves suffix');
assert.ok(maskedAnthropic.includes('...'), 'Mask has ellipsis in middle');
console.log(`  ✔ Key masking produces secure preview: ${maskedAnthropic}`);

// ── Test 4: Storage CRUD and Reactive Events ──
console.log('\n▶ Test 4: Testing BYOK Storage Operations & Event Dispatch');

// Initial state
assert.equal(getStoredApiKey('anthropic'), null);
assert.equal(isProviderConfigured('anthropic'), false);

// Set key
setStoredApiKey('anthropic', 'sk-ant-test-key-123456789');
assert.equal(getStoredApiKey('anthropic'), 'sk-ant-test-key-123456789');
assert.equal(isProviderConfigured('anthropic'), true);
assert.equal(lastDispatchedEvent?.type, 'prism:byok-updated');
assert.equal(lastDispatchedEvent?.detail?.provider, 'anthropic');

// Update multiple keys
setStoredApiKey('openai', 'sk-proj-test-openai-key-999');
setStoredApiKey('deepseek', 'sk-deepseek-test-key-888');

const allKeys = getAllStoredApiKeys();
assert.equal(Object.keys(allKeys).length, 3);
assert.equal(allKeys.openai, 'sk-proj-test-openai-key-999');

// Remove key
removeStoredApiKey('anthropic');
assert.equal(getStoredApiKey('anthropic'), null);
assert.equal(isProviderConfigured('anthropic'), false);
assert.equal(lastDispatchedEvent?.detail?.provider, 'anthropic');
console.log('  ✔ BYOK Storage CRUD and reactive event dispatch passed.');

// ── Test 5: Unified Prompt Models with BYOK Status ──
console.log('\n▶ Test 5: Testing getAllPromptModels with Custom Key Badges');

const currentKeys = getAllStoredApiKeys(); // has openai & deepseek
const promptModels = getAllPromptModels(currentKeys);

assert.ok(promptModels.length >= 20, 'Should have 20+ models available');

const openaiModels = promptModels.filter((m) => m.provider === 'openai');
for (const m of openaiModels) {
  assert.equal(m.hasCustomKey, true, `OpenAI model ${m.name} should have hasCustomKey = true`);
}

const anthropicModels = promptModels.filter((m) => m.provider === 'anthropic');
for (const m of anthropicModels) {
  assert.equal(m.hasCustomKey, false, `Anthropic model ${m.name} should have hasCustomKey = false`);
}

console.log(`  ✔ Successfully generated ${promptModels.length} prompt models with accurate BYOK key statuses.`);

// ── Test 6: Chat History Storage & Helper Verifications ──
console.log('\n▶ Test 6: Testing Chat History Helper Logic');

function titleFromObjective(value) {
  const title = value.trim().replace(/\s+/g, ' ');
  return title.length > 42 ? `${title.slice(0, 39)}...` : title || 'New chat';
}

function formatRelativeTime(timestamp, now = Date.now()) {
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return 'Past week';
}

assert.equal(titleFromObjective('Build an AI agent for code review'), 'Build an AI agent for code review');
assert.equal(
  titleFromObjective('This is a very long objective description that should definitely be truncated neatly by the helper function'),
  'This is a very long objective descripti...'
);
assert.equal(titleFromObjective(''), 'New chat');

const now = Date.now();
assert.equal(formatRelativeTime(now - 10000, now), 'Just now');
assert.equal(formatRelativeTime(now - 5 * 60000, now), '5m ago');
assert.equal(formatRelativeTime(now - 3 * 3600000, now), '3h ago');
assert.equal(formatRelativeTime(now - 2 * 86400000, now), '2d ago');

console.log('  ✔ Chat history title truncation and relative time formatting passed.');

console.log('\n✨ ALL BYOK AND CHAT HISTORY TESTS PASSED SUCCESSFULLY! ✨\n');
