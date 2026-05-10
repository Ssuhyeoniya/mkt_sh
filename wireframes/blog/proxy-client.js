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
      const data = r.data || {};
      // 방어: GAS 미배포 환경/구버전 대비 — 제목 공백 행 제외
      if (Array.isArray(data.rows)) {
        data.rows = data.rows.filter(function (row) {
          const t = row && row['제목'];
          return t !== null && t !== undefined && String(t).trim() !== '';
        });
        data.total = data.rows.length;
      }
      return data;
    },
    blogSummary: async function () {
      const r = await this.call('blog.summary');
      return r.data;
    },
    blogUpdate: async function (params) {
      // params: { postid, service?, category? }
      if (!params || !params.postid) throw new Error('postid_required');
      const r = await this.call('blog.update', params);
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
 * (TOP 10 + 페이지네이션 데모를 위해 35건 구성)
 */
window.SAMPLE_BLOG = (function(){
  const cats = ['자동화','CRM','세일즈','마케팅','제휴','광고','SNS','SEO','데이터','콘텐츠'];
  const srvs = ['naver','tistory'];
  const titles = [
    '마케팅 자동화로 업무 시간 70% 줄이는 방법',
    'CRM 도입 후 1년, 우리가 얻은 것들',
    '세일즈맵으로 영업 동선 최적화하기',
    'B2B 인바운드 리드 유입 늘리는 7가지 전략',
    '고객 이탈 신호 조기 감지하는 방법',
    '제휴점 네트워크로 영업 채널 확장하기',
    '광고 ROAS 400% 달성한 인앱 캠페인 사례',
    '중소기업이 SNS 마케팅을 시작하는 방법',
    '블로그 콘텐츠로 검색 유입 3배 늘리기',
    '데이터 기반 마케팅 의사결정 프레임워크',
    '리드 스코어링으로 영업 우선순위 정하는 법',
    '뉴스레터 구독자 늘리는 12가지 콘텐츠 패턴',
    '리타게팅 광고 효율 2배 올리는 전략',
    '인스타그램 릴스로 브랜드 인지도 키우기',
    '링크드인 B2B 콘텐츠 작성 가이드',
    '구글 애널리틱스 4 핵심 지표 정리',
    '홈페이지 전환율 개선 A/B 테스트 사례',
    '챗봇으로 문의 응대 자동화한 후기',
    '카카오톡 채널 마케팅 활용법',
    '검색 키워드로 보는 시장 트렌드 분석',
    'CRM 데이터 클렌징 자동화 프로젝트',
    '마케팅 KPI 대시보드 만들기',
    '오프라인 매장과 온라인 데이터 통합하기',
    '신규 고객 온보딩 자동화 워크플로우',
    '재구매율 높이는 메시지 시퀀스 설계',
    '브랜드 보이스 가이드라인 작성하기',
    'SaaS 무료체험 → 유료전환 전략',
    '이메일 오픈율 높이는 제목 작성법',
    '컨텐츠 마케팅 ROI 측정 방법',
    'B2B 영업 클로징 화법 모음',
    '경쟁사 분석 프레임워크 5가지',
    '고객 인터뷰 인사이트 정리하는 법',
    '랜딩페이지 디자인 체크리스트 30',
    '구독 비즈니스 핵심 지표(MRR, Churn)',
    '마케팅팀 OKR 설정 가이드',
  ];
  // 일부는 네이버 blogthumb URL (referrer 차단 우회 데모), 나머지는 picsum
  const naverSample = 'https://blogthumb.pstatic.net/MjAyNjA1MDhfMjgw/MDAxNzc4MjAyOTc1MzEw.0rBfVVUQvtoa9DtP0AIASREorQqR1OhfIUH2BtjKd5Yg.s14eWbBJKt-xLsts6ypL1xRaKcE0NKp_ZZ7lOVMI9bEg.PNG/%BD%C4%B1%C7%B4%EB%C0%E5_%C1%A6%C8%DE%C1%A1_%BD%BD%B7%CE%BF%EC%C4%B6%B8%AE_%B0%E1%C1%A6_%B9%D7_%BB%E7%BF%EB_%B9%E6%B9%FD01.png?type=w2';
  return titles.map(function(t, i){
    const date = new Date(2026, 4, 9);
    date.setDate(date.getDate() - i * 4);
    const ymd = date.toISOString().slice(0,10);
    const tv = 12500 - i * 300 + Math.floor(Math.random()*800);
    const wk = Math.floor(tv * 0.07);
    const mo = Math.floor(tv * 0.27);
    const ib = Math.max(0, Math.floor(tv * 0.003));
    return {
      제목: t,
      링크: 'https://example.com/p/' + (i+1),
      날짜: ymd,
      thumbnail: i % 3 === 0 ? naverSample : 'https://picsum.photos/seed/blog'+(i+1)+'/240/144',
      category: cats[i % cats.length],
      service: srvs[i % 2],
      totalVisit: tv,
      weeklyVisitor: wk,
      monthlyVisitor: mo,
      inbound: ib,
      postid: 'p' + String(i+1).padStart(3,'0')
    };
  });
})();
