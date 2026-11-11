// Portable local preview when native Cloudflare workerd is unavailable on Windows.
// Production builds continue to use the Cloudflare plugin.
process.env.APEX_NODE_PREVIEW='1';
process.argv=[process.execPath,'run-framework.mjs','dev'];
await import('./run-framework.mjs');
