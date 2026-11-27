/* m98m-door — a second front door to the engine (27 Nov 2026).
   Some office networks block the engine's own name, m98m-engine.m98m786.workers.dev, by hostname.
   This worker lives at a different name and does ONE thing: hands every request to the engine over
   a service binding (worker-to-worker, no network), so it never goes stale, holds no secret and no
   database, and the engine sees the original request untouched — the browser's Origin for CORS and
   the caller's address for the office gate both arrive as they were. The portal tries this door by
   itself when the main one does not answer (ENGINE_URL_ALT in src/shell.html) and pins it per browser.
   Deploy: see docs/HANDOVER-LOG.md — a Workers upload with a service binding to m98m-engine. */
export default {
  async fetch(request, env) { return env.ENGINE.fetch(request); },
};
