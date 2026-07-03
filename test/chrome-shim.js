// Test-only stand-in for the extension APIs, backed by localStorage so page reloads
// behave like real cross-page navigations for persistence tests. Not part of the extension.
(() => {
  const KEY = 'nb-test-storage';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const save = (d) => localStorage.setItem(KEY, JSON.stringify(d));
  window.chrome = {
    runtime: { id: 'test-harness', lastError: undefined, getManifest: () => ({ version: 'test-build' }) },
    storage: {
      local: {
        get(keys, cb) {
          const d = load();
          const out = {};
          (Array.isArray(keys) ? keys : [keys]).forEach((k) => { if (k in d) out[k] = d[k]; });
          setTimeout(() => cb(out), 0);
        },
        set(obj, cb) {
          const d = load();
          Object.assign(d, obj);
          save(d);
          if (cb) setTimeout(cb, 0);
        },
      },
    },
  };
})();
