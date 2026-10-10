const targets = [
  ['frontend', process.env.SMOKE_FRONTEND_URL, '/'],
  ['backend', process.env.SMOKE_BACKEND_URL, '/health'],
  ['model-api', process.env.SMOKE_MODEL_API_URL, '/health'],
];

for (const [name, baseUrl, path] of targets) {
  if (!baseUrl) throw new Error(`Missing smoke-test URL for ${name}`);
  const response = await fetch(new URL(path, baseUrl), {
    headers: name === 'model-api' && process.env.SMOKE_MODEL_API_KEY
      ? { 'X-Model-API-Key': process.env.SMOKE_MODEL_API_KEY }
      : undefined,
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    throw new Error(`${name} smoke test failed: ${response.status} ${response.statusText}`);
  }
  console.log(`${name}: ${response.status}`);
}

const metricsTargets = [
  ['backend', process.env.SMOKE_BACKEND_URL, process.env.SMOKE_BACKEND_METRICS_TOKEN],
  ['model-api', process.env.SMOKE_MODEL_API_URL, process.env.SMOKE_MODEL_METRICS_TOKEN],
];

for (const [name, baseUrl, token] of metricsTargets) {
  if (!baseUrl || !token) throw new Error(`Missing metrics smoke-test configuration for ${name}`);
  const response = await fetch(new URL('/metrics', baseUrl), {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    throw new Error(`${name} metrics smoke test failed: ${response.status} ${response.statusText}`);
  }
  console.log(`${name} metrics: ${response.status}`);
}
