/**
 * Marketing CRM · 세일즈맵 프록시 클라이언트
 * 같은 페이지에 blog 의 proxy-client.js 가 이미 로드되어 있다면 window.MktProxy 가
 * 존재하므로 재정의하지 않고 메서드만 확장합니다.
 */
(function () {
  const STORAGE_KEY = 'mkt_gas_url';

  if (!window.MktProxy) {
    window.MktProxy = {
      STORAGE_KEY: STORAGE_KEY,
      getUrl: function () { try { return localStorage.getItem(STORAGE_KEY) || ''; } catch (_) { return ''; } },
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

  window.MktProxy.salesmapList = async function (params) {
    const r = await this.call('salesmap.list', params);
    const data = r.data || {};
    if (Array.isArray(data.rows)) {
      data.rows = data.rows.filter(function (row) {
        const c = row && row.company;
        return c !== null && c !== undefined && String(c).trim() !== '';
      });
      data.total = data.rows.length;
    }
    return data;
  };
  window.MktProxy.salesmapSummary = async function () {
    const r = await this.call('salesmap.summary');
    return r.data;
  };

  // ── 세션 캐시 (세일즈맵 ↔ 인사이트 탭 전환 시 즉시 표시) ─────
  // force=true 또는 캐시 미존재 시 GAS 재조회. 새로고침 버튼이 force 호출.
  const SMAP_CACHE_KEY = 'smap_cache_v1';
  window.MktProxy.salesmapListCached = async function (force) {
    if (!force) {
      try {
        const cached = sessionStorage.getItem(SMAP_CACHE_KEY);
        if (cached) {
          const obj = JSON.parse(cached);
          if (obj && Array.isArray(obj.rows)) return Object.assign({}, obj, { _fromCache: true });
        }
      } catch (_) {}
    }
    const data = await this.salesmapList();
    try { sessionStorage.setItem(SMAP_CACHE_KEY, JSON.stringify({ rows: data.rows || [], total: data.total || 0, ts: Date.now() })); } catch (_) {}
    return data;
  };
  window.MktProxy.salesmapClearCache = function () {
    try { sessionStorage.removeItem(SMAP_CACHE_KEY); } catch (_) {}
  };
})();

/**
 * 세일즈맵 데모 데이터 — 프록시 미연결 시 표시 (50건)
 */
window.SAMPLE_SALESMAP = (function () {
  const services = ['CRM', '세일즈맵', '광고대행', '제휴마케팅', '챗봇', '뉴스레터', '랜딩페이지'];
  const channels = ['검색광고', '자연 검색', '블로그', '인스타그램', '링크드인', '지인 추천', '제휴점', '온라인 세미나'];
  const sources  = ['google', 'naver', 'instagram', 'linkedin', 'kakao', 'direct'];
  const mediums  = ['cpc', 'organic', 'social', 'referral', 'email'];
  const camps    = ['2026Q2_brand', '2026Q2_perf', 'spring_promo', 'b2b_lead', 'partner_apr', 'webinar_05'];
  const contents = ['hero_a', 'hero_b', 'sidebar', 'footer_cta', 'mobile_banner'];
  const terms    = ['CRM 솔루션', '세일즈 자동화', 'B2B 영업도구', '리드관리', '제휴 마케팅'];
  const companyAdj  = ['스마트', '플러스', '넥스트', '에이블', '코어', '다이나믹', '옴니', '온라인', '디지털', '비전'];
  const companyNoun = ['컴퍼니', '솔루션즈', '랩스', '코퍼레이션', '스튜디오', '시스템즈', '테크', '커머스', '미디어', '웍스'];
  const managers = ['김민수','이지영','박정호','최서윤','정태현','강수민','윤도현','임혜진','조성훈','장유나','한지원','오세진','송민재','권나래','신호준'];
  const cities = ['서울특별시 강남구','서울특별시 마포구','서울특별시 송파구','서울특별시 영등포구','경기도 성남시 분당구','경기도 수원시 영통구','부산광역시 해운대구','대구광역시 수성구','인천광역시 연수구','대전광역시 유성구','광주광역시 서구'];
  const streets = ['테헤란로 152','강남대로 320','월드컵북로 396','올림픽로 295','판교역로 235','광교중앙로 145','센텀로 78','동대구로 477','송도과학로 32','대학로 99','상무중앙로 80'];
  const employees = ['1-10명','11-30명','31-50명','51-100명','101-300명','301-1000명','1000명 이상'];
  const yn = ['동의', '동의', '동의', '동의', '미동의'];
  const ynMkt = ['동의', '미동의', '동의', '미동의', '동의'];

  const rng = (seed) => { let x = Math.sin(seed*9301+49297)*233280; return x - Math.floor(x); };
  const pick = (arr, i) => arr[Math.floor(rng(i) * arr.length)];

  const out = [];
  for (let i = 0; i < 50; i++) {
    const d = new Date(2026, 4, 9);
    d.setDate(d.getDate() - Math.floor(i * 1.4));
    d.setHours(9 + Math.floor(rng(i+1)*9), Math.floor(rng(i+2)*60));
    const dateStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
                  + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
    const company = pick(companyAdj, i*3) + pick(companyNoun, i*5+1);
    const manager = pick(managers, i*7);
    const phone   = '010-' + String(1000 + Math.floor(rng(i+11)*9000)).padStart(4,'0') + '-' + String(1000 + Math.floor(rng(i+13)*9000)).padStart(4,'0');
    const emailDomain = ['gmail.com','naver.com','daum.net','kakao.com','company.co.kr'][i % 5];
    const email = (manager.replace(/[^a-zA-Z]/g,'').toLowerCase() || ('user' + i)) + (i+1) + '@' + emailDomain;
    out.push({
      _no: i+1,
      submittedAt: dateStr,
      service: pick(services, i*2),
      company: company,
      employeeCount: pick(employees, i*4),
      address: pick(cities, i*6) + ' ' + pick(streets, i*8),
      manager: manager,
      phone: phone,
      email: email,
      channel: pick(channels, i*9),
      privacyAgreed: pick(yn, i*11),
      marketingAgreed: pick(ynMkt, i*13),
      utm_source: pick(sources, i*15),
      utm_medium: pick(mediums, i*17),
      utm_campaign: pick(camps, i*19),
      utm_content: pick(contents, i*21),
      utm_term: pick(terms, i*23),
      message: '문의 내용 샘플입니다. 견적 및 도입 일정 상담 요청드립니다. (#' + (i+1) + ')',
      webFormId: 'WF-' + String(i+1).padStart(5, '0')
    });
  }
  return out;
})();
