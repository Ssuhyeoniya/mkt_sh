/**
 * Marketing CRM · 프론트 GAS 프록시 클라이언트
 *
 * 사용법:
 *   await MktProxy.call('blog.list');
 *   await MktProxy.blogList({ category: 'CRM' });
 *
 * 저장된 URL 은 localStorage('mkt_gas_url') 에서 자동 로드됩니다.
 */
(function () {
  const STORAGE_KEY = 'mkt_gas_url';

  const Proxy = {
    STORAGE_KEY: STORAGE_KEY,

    getUrl: function () {
      try { return localStorage.getItem(STORAGE_KEY) || ''; } catch (_) { return ''; }
    },
    setUrl: function (url) {
      try {
        if (url) localStorage.setItem(STORAGE_KEY, url);
        else localStorage.removeItem(STORAGE_KEY);
      } catch (_) {}
    },

    /**
     * @returns {Promise<Object>} 프록시 응답 ({ok,action,data,...})
     */
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
      // GAS 웹앱은 Anyone 접근 시 GET 요청에 CORS 허용 헤더를 포함합니다.
      const res = await fetch(u.toString(), { method: 'GET', redirect: 'follow' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'unknown_error');
      return json;
    },

    blogList: async function (params) {
      const r = await this.call('blog.list', params);
      return r.data;
    },
    blogSummary: async function () {
      const r = await this.call('blog.summary');
      return r.data;
    },
    health: async function () {
      const r = await this.call('health');
      return r.data;
    }
  };

  window.MktProxy = Proxy;
})();

/**
 * 블로그 데모 데이터 — 프록시 미연결 시 표시
 */
window.SAMPLE_BLOG = [
  { 제목:'마케팅 자동화로 업무 시간 70% 줄이는 방법',           링크:'https://example.com/p/1',  날짜:'2026-04-28', thumbnail:'https://picsum.photos/seed/blog1/240/144',  category:'자동화', service:'naver',   totalVisit:12431, weeklyVisitor:842, monthlyVisitor:3204, inbound:38, postid:'p001' },
  { 제목:'CRM 도입 후 1년, 우리가 얻은 것들',                    링크:'https://example.com/p/2',  날짜:'2026-04-20', thumbnail:'https://picsum.photos/seed/blog2/240/144',  category:'CRM',    service:'naver',   totalVisit:8720,  weeklyVisitor:512, monthlyVisitor:2104, inbound:24, postid:'p002' },
  { 제목:'세일즈맵으로 영업 동선 최적화하기',                    링크:'https://example.com/p/3',  날짜:'2026-04-15', thumbnail:'https://picsum.photos/seed/blog3/240/144',  category:'세일즈', service:'naver',   totalVisit:6210,  weeklyVisitor:421, monthlyVisitor:1820, inbound:19, postid:'p003' },
  { 제목:'B2B 인바운드 리드 유입 늘리는 7가지 전략',             링크:'https://example.com/p/4',  날짜:'2026-04-10', thumbnail:'https://picsum.photos/seed/blog4/240/144',  category:'마케팅', service:'tistory', totalVisit:5840,  weeklyVisitor:312, monthlyVisitor:1432, inbound:31, postid:'p004' },
  { 제목:'고객 이탈 신호 조기 감지하는 방법',                    링크:'https://example.com/p/5',  날짜:'2026-04-05', thumbnail:'https://picsum.photos/seed/blog5/240/144',  category:'CRM',    service:'naver',   totalVisit:4920,  weeklyVisitor:284, monthlyVisitor:1108, inbound:14, postid:'p005' },
  { 제목:'제휴점 네트워크로 영업 채널 확장하기',                 링크:'https://example.com/p/6',  날짜:'2026-03-30', thumbnail:'https://picsum.photos/seed/blog6/240/144',  category:'제휴',   service:'naver',   totalVisit:3780,  weeklyVisitor:201, monthlyVisitor:894,  inbound:11, postid:'p006' },
  { 제목:'광고 ROAS 400% 달성한 인앱 캠페인 사례',               링크:'https://example.com/p/7',  날짜:'2026-03-22', thumbnail:'https://picsum.photos/seed/blog7/240/144',  category:'광고',   service:'tistory', totalVisit:7320,  weeklyVisitor:498, monthlyVisitor:1820, inbound:42, postid:'p007' },
  { 제목:'중소기업이 SNS 마케팅을 시작하는 방법',                링크:'https://example.com/p/8',  날짜:'2026-03-15', thumbnail:'https://picsum.photos/seed/blog8/240/144',  category:'SNS',    service:'naver',   totalVisit:5210,  weeklyVisitor:328, monthlyVisitor:1402, inbound:18, postid:'p008' },
  { 제목:'블로그 콘텐츠로 검색 유입 3배 늘리기',                 링크:'https://example.com/p/9',  날짜:'2026-03-08', thumbnail:'https://picsum.photos/seed/blog9/240/144',  category:'SEO',    service:'naver',   totalVisit:9420,  weeklyVisitor:612, monthlyVisitor:2532, inbound:27, postid:'p009' },
  { 제목:'데이터 기반 마케팅 의사결정 프레임워크',               링크:'https://example.com/p/10', 날짜:'2026-02-28', thumbnail:'https://picsum.photos/seed/blog10/240/144', category:'데이터', service:'tistory', totalVisit:6840,  weeklyVisitor:394, monthlyVisitor:1720, inbound:22, postid:'p010' },
];
