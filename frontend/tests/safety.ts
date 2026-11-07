// Browser tests that create data must only ever run against this machine (the fixture server or a local staging copy).
export function assertLocalWriteTarget() {
  if (process.env.E2E_ALLOW_WRITES !== 'true' && !process.env.E2E_ADMIN_PASSWORD) return; // writes, or admin sign-in (creates sessions)
  const base = process.env.E2E_BASE_URL || 'http://localhost:3000';
  const host = new URL(base).hostname;
  if (!/^(localhost|127(\.\d+){3}|\[?::1\]?)$/i.test(host) && !host.endsWith('.localhost'))
    throw new Error('Refusing to run data-writing browser tests against a non-local address. Use the fixture server or a local staging copy.');
}
