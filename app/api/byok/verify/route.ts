/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * app/api/byok/verify/route.ts
 * ────────────────────────────
 * Live validation endpoint for BYOK API keys (OpenRouter, Groq, NVIDIA, OpenAI, Anthropic, Google, DeepSeek).
 * Tests the key against provider authentication endpoints without expending text-generation tokens.
 */
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, apiKey } = body as { provider?: string; apiKey?: string };

    if (!provider || typeof provider !== 'string') {
      return NextResponse.json({ valid: false, error: 'Missing provider identifier' }, { status: 400 });
    }

    const cleanKey = (apiKey || '').trim();
    if (!cleanKey) {
      return NextResponse.json({ valid: false, error: 'API key cannot be empty' }, { status: 400 });
    }

    const prov = provider.toLowerCase();

    // ── 1. OpenRouter (Official Auth / Key verification endpoint) ──
    if (prov === 'openrouter') {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
          headers: {
            Authorization: `Bearer ${cleanKey}`,
            'HTTP-Referer': 'https://prismspace.app',
            'X-Title': 'PrismSpace',
          },
          cache: 'no-store',
        });

        const data = await res.json().catch(() => null);

        if (res.ok && data?.data) {
          const usageNum = data.data.usage != null ? Number(data.data.usage) : null;
          const limitNum = data.data.limit != null ? Number(data.data.limit) : null;

          return NextResponse.json({
            valid: true,
            provider: 'openrouter',
            message: 'OpenRouter API key is valid and active!',
            details: {
              label: data.data.label || 'Default API Key',
              usage: usageNum !== null ? `$${usageNum.toFixed(4)}` : undefined,
              limit: limitNum !== null ? `$${limitNum.toFixed(2)}` : 'Unlimited',
              is_free_tier: Boolean(data.data.is_free_tier),
              rate_limit: data.data.rate_limit,
            },
          });
        }

        const errMsg =
          data?.error?.message ||
          (res.status === 401
            ? 'Invalid OpenRouter API Key (401 Unauthorized). Verify your key at openrouter.ai/keys'
            : `OpenRouter returned HTTP error ${res.status}`);

        return NextResponse.json(
          { valid: false, provider: 'openrouter', error: errMsg },
          { status: 400 }
        );
      } catch (err: any) {
        return NextResponse.json(
          { valid: false, provider: 'openrouter', error: `Network error connecting to OpenRouter: ${err.message}` },
          { status: 502 }
        );
      }
    }

    // ── 2. Groq ──
    if (prov === 'groq') {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { Authorization: `Bearer ${cleanKey}` },
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json({
            valid: true,
            provider: 'groq',
            message: 'Groq Cloud API key verified successfully!',
            details: { models_available: data.data?.length ?? 0 },
          });
        }
        return NextResponse.json(
          { valid: false, provider: 'groq', error: 'Invalid Groq API key (401 Unauthorized).' },
          { status: 400 }
        );
      } catch (err: any) {
        return NextResponse.json({ valid: false, provider: 'groq', error: err.message }, { status: 502 });
      }
    }

    // ── 3. OpenAI ──
    if (prov === 'openai') {
      try {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${cleanKey}` },
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json({
            valid: true,
            provider: 'openai',
            message: 'OpenAI API key verified successfully!',
            details: { models_available: data.data?.length ?? 0 },
          });
        }
        return NextResponse.json(
          { valid: false, provider: 'openai', error: 'Invalid OpenAI API key (401 Unauthorized).' },
          { status: 400 }
        );
      } catch (err: any) {
        return NextResponse.json({ valid: false, provider: 'openai', error: err.message }, { status: 502 });
      }
    }

    // ── 4. Anthropic ──
    if (prov === 'anthropic') {
      try {
        const res = await fetch('https://api.anthropic.com/v1/models', {
          headers: {
            'x-api-key': cleanKey,
            'anthropic-version': '2023-06-01',
          },
          cache: 'no-store',
        });
        if (res.ok) {
          return NextResponse.json({
            valid: true,
            provider: 'anthropic',
            message: 'Anthropic Claude API key verified successfully!',
          });
        }
        return NextResponse.json(
          { valid: false, provider: 'anthropic', error: 'Invalid Anthropic API key (401 Unauthorized).' },
          { status: 400 }
        );
      } catch (err: any) {
        return NextResponse.json({ valid: false, provider: 'anthropic', error: err.message }, { status: 502 });
      }
    }

    // ── 5. Google Gemini ──
    if (prov === 'google') {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`, {
          cache: 'no-store',
        });
        if (res.ok) {
          return NextResponse.json({
            valid: true,
            provider: 'google',
            message: 'Google Gemini API key verified successfully!',
          });
        }
        return NextResponse.json(
          { valid: false, provider: 'google', error: 'Invalid Google Gemini API key.' },
          { status: 400 }
        );
      } catch (err: any) {
        return NextResponse.json({ valid: false, provider: 'google', error: err.message }, { status: 502 });
      }
    }

    // ── 6. NVIDIA NIM ──
    if (prov === 'nvidia') {
      try {
        const res = await fetch('https://integrate.api.nvidia.com/v1/models', {
          headers: { Authorization: `Bearer ${cleanKey}` },
          cache: 'no-store',
        });
        if (res.ok) {
          return NextResponse.json({
            valid: true,
            provider: 'nvidia',
            message: 'NVIDIA NIM API key verified successfully!',
          });
        }
        return NextResponse.json(
          { valid: false, provider: 'nvidia', error: 'Invalid NVIDIA NIM API key.' },
          { status: 400 }
        );
      } catch (err: any) {
        return NextResponse.json({ valid: false, provider: 'nvidia', error: err.message }, { status: 502 });
      }
    }

    // ── 7. DeepSeek ──
    if (prov === 'deepseek') {
      try {
        const res = await fetch('https://api.deepseek.com/models', {
          headers: { Authorization: `Bearer ${cleanKey}` },
          cache: 'no-store',
        });
        if (res.ok) {
          return NextResponse.json({
            valid: true,
            provider: 'deepseek',
            message: 'DeepSeek API key verified successfully!',
          });
        }
        return NextResponse.json(
          { valid: false, provider: 'deepseek', error: 'Invalid DeepSeek API key.' },
          { status: 400 }
        );
      } catch (err: any) {
        return NextResponse.json({ valid: false, provider: 'deepseek', error: err.message }, { status: 502 });
      }
    }

    return NextResponse.json({ valid: true, provider: prov, message: 'Key format accepted.' });
  } catch (err: any) {
    return NextResponse.json({ valid: false, error: err?.message || 'Verification failed' }, { status: 500 });
  }
}
