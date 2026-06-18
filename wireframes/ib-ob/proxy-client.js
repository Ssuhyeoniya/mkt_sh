/**
 * Marketing CRM · IB/OB 종합 프록시 클라이언트
 * 같은 페이지에 다른 모듈의 proxy-client.js 가 이미 로드되어 있다면
 * window.MktProxy 가 존재하므로 재정의하지 않고 메서드만 확장합니다.
 */
(function () {
  const STORAGE_KEY = 'mkt_gas_url';
  // 기본 GAS 프록시 URL — 미연결 시 자동으로 실DB 로드 (저장된 값이 우선)
  const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbzV2tdT9vljznHNoDkQLexUE8DdsPhP6t-YGOsJttMWu9GntygBQDUF4sqI78TtDrIWbQ/exec';

  if (!window.MktProxy) {
    window.MktProxy = {
      STORAGE_KEY: STORAGE_KEY,
      DEFAULT_URL: DEFAULT_GAS_URL,
      getUrl: function () { try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_GAS_URL; } catch (_) { return DEFAULT_GAS_URL; } },
      setUrl: function (url) {
        try { if (url) localStorage.setItem(STORAGE_KEY, url); else localStorage.removeItem(STORAGE_KEY); } catch (_) {}
      },
      call: async function (action, params) {
        const url = this.getUrl();
        if (!url) throw new Error('GAS URL이 설정되지 않았습니다.');
        const u = new URL(url);
        u.searchParams.set('action', action);
        if (params) {
          Object.keys(params).forEach(function (k) {
            if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
              u.searchParams.set(k, String(params[k]));
            }
          });
        }
        const res = await fetch(u.toString(), { method: 'GET', redirect: 'follow' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || 'unknown_error');
        return json;
      }
    };
  }

  window.MktProxy.ibobList = async function (params) {
    const r = await this.call('ibob.list', params);
    const data = r.data || {};
    if (Array.isArray(data.rows)) {
      data.rows = data.rows.filter(function (row) {
        const c = row && row['고객사명'];
        return c !== null && c !== undefined && String(c).trim() !== '';
      });
      data.total = data.rows.length;
    }
    return data;
  };
  window.MktProxy.ibobSummary = async function (params) {
    const r = await this.call('ibob.summary', params);
    return r.data;
  };

  // ── 세션 캐시 ────────────────────────────
  const IBOB_CACHE_KEY = 'ibob_cache_v1';
  window.MktProxy.ibobListCached = async function (force) {
    if (!force) {
      try {
        const cached = sessionStorage.getItem(IBOB_CACHE_KEY);
        if (cached) {
          const obj = JSON.parse(cached);
          obj._fromCache = true;
          return obj;
        }
      } catch (_) {}
    }
    const data = await this.ibobList({});
    try { sessionStorage.setItem(IBOB_CACHE_KEY, JSON.stringify(data)); } catch (_) {}
    return data;
  };
  window.MktProxy.ibobClearCache = function () {
    try { sessionStorage.removeItem(IBOB_CACHE_KEY); } catch (_) {}
  };
})();
