/**
 * BLOG 모듈
 *
 * 시트 구조 (BLOG_RAW_DATA):
 *   제목, 링크, 날짜, 본문요약, postid, thumbnail, image, service,
 *   category, utm_term, totalVisit, weeklyVisitor, monthlyVisitor, inbound
 */

const BLOG_SHEET_ID   = '13LWJmvtSJRy6G43Lo_jar9hqZquCY4vB4bP4kAQVQLQ';
const BLOG_SHEET_NAME = 'BLOG_RAW_DATA';
const BLOG_TZ         = 'Asia/Seoul';

/**
 * 블로그 글 전체 행 반환
 *   params.category? : 카테고리 필터
 *   params.q?        : 제목 부분일치 검색
 *   params.limit?    : 최대 행 수
 */
function Blog_list(params) {
  params = params || {};
  const sheet = SpreadsheetApp.openById(BLOG_SHEET_ID).getSheetByName(BLOG_SHEET_NAME);
  if (!sheet) throw new Error('sheet_not_found:' + BLOG_SHEET_NAME);

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { rows: [], total: 0, headers: [] };

  const headers = values[0].map(function (h) { return String(h || '').trim(); });

  // 제목 컬럼 인덱스 (없으면 0번으로 fallback)
  const titleIdx = headers.indexOf('제목') >= 0 ? headers.indexOf('제목') : 0;

  let rows = values.slice(1)
    .filter(function (r) {
      // 1) 행 전체가 공백이면 제외
      if (!r.some(function (c) { return c !== '' && c !== null && c !== undefined; })) return false;
      // 2) 제목 컬럼이 공백이면 제외
      const title = r[titleIdx];
      if (title === null || title === undefined) return false;
      if (typeof title === 'string' && title.trim() === '') return false;
      return true;
    })
    .map(function (r, i) {
      const o = { _no: i + 1 };
      headers.forEach(function (h, j) { o[h] = blog_norm_(r[j]); });
      return o;
    });

  // 필터
  if (params.category) {
    const cat = String(params.category);
    rows = rows.filter(function (r) { return String(r.category || '') === cat; });
  }
  if (params.q) {
    const q = String(params.q).toLowerCase();
    rows = rows.filter(function (r) {
      return String(r['제목'] || '').toLowerCase().indexOf(q) >= 0;
    });
  }
  if (params.limit) {
    const n = parseInt(params.limit, 10);
    if (n > 0) rows = rows.slice(0, n);
  }

  return { rows: rows, total: rows.length, headers: headers };
}

/**
 * 블로그 요약 통계
 */
function Blog_summary(params) {
  const list = Blog_list({});
  const rows = list.rows;
  let totalVisit = 0, weekly = 0, monthly = 0, inbound = 0;
  const byCat = {};
  const byService = {};

  rows.forEach(function (r) {
    totalVisit += blog_num_(r.totalVisit);
    weekly     += blog_num_(r.weeklyVisitor);
    monthly    += blog_num_(r.monthlyVisitor);
    inbound    += blog_num_(r.inbound);
    const c = r.category || '미분류';
    const s = r.service || '기타';
    byCat[c] = (byCat[c] || 0) + 1;
    byService[s] = (byService[s] || 0) + 1;
  });

  // Top 5 (누적 방문 기준)
  const top = rows
    .slice()
    .sort(function (a, b) { return blog_num_(b.totalVisit) - blog_num_(a.totalVisit); })
    .slice(0, 5)
    .map(function (r) {
      return {
        postid: r.postid,
        title: r['제목'],
        category: r.category,
        totalVisit: blog_num_(r.totalVisit)
      };
    });

  return {
    count: rows.length,
    totalVisit: totalVisit,
    weekly: weekly,
    monthly: monthly,
    inbound: inbound,
    byCategory: Object.keys(byCat).map(function (k) { return { name: k, count: byCat[k] }; }),
    byService:  Object.keys(byService).map(function (k) { return { name: k, count: byService[k] }; }),
    top: top
  };
}

// ── helpers ─────────────────────────────────
function blog_norm_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, BLOG_TZ, 'yyyy-MM-dd');
  return v;
}
function blog_num_(v) { const n = Number(v); return isFinite(n) ? n : 0; }
