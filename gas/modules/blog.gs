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

/**
 * 행 업데이트 — postid 로 행을 찾아 service / category 컬럼만 갱신
 *   params.postid    : 필수
 *   params.service?  : 새 서비스 값 (생략 시 변경 없음)
 *   params.category? : 새 카테고리 값 (생략 시 변경 없음)
 */
function Blog_update(params) {
  params = params || {};
  const postid = String(params.postid || '').trim();
  if (!postid) throw new Error('postid_required');

  const sheet = SpreadsheetApp.openById(BLOG_SHEET_ID).getSheetByName(BLOG_SHEET_NAME);
  if (!sheet) throw new Error('sheet_not_found:' + BLOG_SHEET_NAME);

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) throw new Error('no_data');

  const headers = values[0].map(function (h) { return String(h || '').trim(); });
  const postidCol = headers.indexOf('postid');
  if (postidCol < 0) throw new Error('postid_column_not_found');

  // postid 매칭 행 찾기
  let rowIdx = -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][postidCol] == null ? '' : values[i][postidCol]).trim() === postid) {
      rowIdx = i;
      break;
    }
  }
  if (rowIdx < 0) throw new Error('row_not_found:' + postid);

  const updates = {};
  const fields = ['service', 'category', 'utm_term'];
  fields.forEach(function (f) {
    if (params[f] !== undefined && params[f] !== null) {
      const c = headers.indexOf(f);
      if (c >= 0) {
        const v = String(params[f]);
        sheet.getRange(rowIdx + 1, c + 1).setValue(v);
        updates[f] = v;
      }
    }
  });

  return {
    postid: postid,
    rowNumber: rowIdx + 1,
    updates: updates,
    updatedAt: new Date().toISOString()
  };
}

/**
 * 블로그 글의 utm_term 으로 세일즈맵(인바운드)에서 매칭되는 제출 건들 반환
 *   params.utm_term : 필수
 * 반환:
 *   { utm_term, count, items:[{date,datetime,form,company,manager,service}], byDate:[{date,count}] }
 *
 * 인바운드 소스 시트 (SALESMAP_IB) 컬럼 구조:
 *   제출 날짜, 유입 폼, 관심 서비스, 기업명, 기업주소, 담당자명, 휴대전화번호,
 *   회사 이메일, 임직원수, 유입경로, 문의내용, 개인정보 수집 동의, 마케팅 수신 동의,
 *   utm_source, utm_medium, utm_campaign, utm_content, utm_term, WebFormID
 *   (컬럼 매칭은 헤더명 기준 indexOf 이므로 컬럼 순서가 바뀌어도 안전)
 */
// 세일즈맵 행을 5분 캐시 (utm 단위 lookup용)
function blog_loadSalesmap_() {
  const cache = CacheService.getScriptCache();
  // 시트/매핑이 바뀌면 캐시 키를 bump 해 이전 stale 엔트리를 자동 무효화.
  // v2: 소스 시트 Data_Result_Final → SALESMAP_IB (유입 폼 컬럼 추가)
  const CACHE_KEY = 'salesmap_inbound_v2';
  let parsed = null;
  try {
    const cached = cache.get(CACHE_KEY);
    if (cached) parsed = JSON.parse(cached);
  } catch (_) {}
  if (parsed) return parsed;

  const SALESMAP_NAME = 'SALESMAP_IB';
  const sheet = SpreadsheetApp.openById(BLOG_SHEET_ID).getSheetByName(SALESMAP_NAME);
  if (!sheet) throw new Error('sheet_not_found:' + SALESMAP_NAME);

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) { parsed = { rows: [] }; }
  else {
    const headRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const headers = headRow.map(function (h) { return String(h || '').trim(); });
    const utmIdx     = headers.indexOf('utm_term');
    const dateIdx    = headers.indexOf('제출 날짜');
    const formIdx    = headers.indexOf('유입 폼');
    const companyIdx = headers.indexOf('기업명');
    const managerIdx = headers.indexOf('담당자명');
    const serviceIdx = headers.indexOf('관심 서비스');
    if (utmIdx < 0) throw new Error('utm_term_column_not_found_in_salesmap');

    const all = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
    const rows = [];
    for (let i = 0; i < all.length; i++) {
      const r = all[i];
      const u = r[utmIdx] == null ? '' : String(r[utmIdx]).trim();
      if (!u) continue;
      const raw = dateIdx >= 0 ? r[dateIdx] : '';
      let d = '';
      if (raw instanceof Date) d = Utilities.formatDate(raw, BLOG_TZ, 'yyyy-MM-dd HH:mm');
      else if (raw) d = String(raw).slice(0, 16);
      rows.push({
        u: u, d: d,
        f: formIdx    >= 0 ? String(r[formIdx]    || '') : '',
        c: companyIdx >= 0 ? String(r[companyIdx] || '') : '',
        m: managerIdx >= 0 ? String(r[managerIdx] || '') : '',
        s: serviceIdx >= 0 ? String(r[serviceIdx] || '') : ''
      });
    }
    parsed = { rows: rows };
  }
  try {
    const json = JSON.stringify(parsed);
    if (json.length < 95000) cache.put(CACHE_KEY, json, 300);
  } catch (_) {}
  return parsed;
}

function Blog_inboundDates(params) {
  params = params || {};
  const utm = String(params.utm_term || '').trim();
  if (!utm) throw new Error('utm_term_required');
  const parsed = blog_loadSalesmap_();
  const list = parsed.rows || [];
  const items = [];
  const byDateMap = {};
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    if (r.u !== utm) continue;
    const dt = r.d || '';
    const date = dt.slice(0, 10);
    items.push({ date: date, datetime: dt, form: r.f, company: r.c, manager: r.m, service: r.s });
    if (date) byDateMap[date] = (byDateMap[date] || 0) + 1;
  }
  items.sort(function (a, b) { return (b.datetime || b.date) < (a.datetime || a.date) ? -1 : 1; });
  const byDate = Object.keys(byDateMap)
    .map(function (k) { return { date: k, count: byDateMap[k] }; })
    .sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  return { utm_term: utm, count: items.length, items: items, byDate: byDate };
}

/**
 * utm_term 별 인바운드 인입 건수 반환 (선택적 기간 필터)
 *   params.from? : 'yyyy-MM-dd' 이상
 *   params.to?   : 'yyyy-MM-dd' 이하
 *   - 필터 미지정 시 전체 기간
 *   - 필터 지정 시 salesmap 의 '제출 날짜' 기준 필터링 후 집계
 * 반환: { counts: {utm_term: count, ...}, total, from, to }
 */
function Blog_inboundCounts(params) {
  params = params || {};
  const from = String(params.from || '').slice(0, 10);
  const to   = String(params.to   || '').slice(0, 10);
  const parsed = blog_loadSalesmap_();
  const list = parsed.rows || [];
  const counts = {};
  let total = 0;
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    if (from || to) {
      // 기간 필터 시에만 날짜로 거른다. 전체 기간이면 날짜 없는 건도 카운트(드로어와 일치).
      const date = (r.d || '').slice(0, 10);
      if (!date) continue;
      if (from && date < from) continue;
      if (to   && date > to)   continue;
    }
    counts[r.u] = (counts[r.u] || 0) + 1;
    total++;
  }
  return { counts: counts, total: total, from: from, to: to };
}

/**
 * STATS_DAILY 시트의 일자별 방문 통계 반환
 *   params.from?   : 'yyyy-MM-dd' 이상
 *   params.to?     : 'yyyy-MM-dd' 이하
 *   params.postid? : 특정 postid 만 필터
 * STATS_DAILY 컬럼: A=date, B=POST_ID, C=visitors, D=impressions, E=search_in, F=etc
 * 반환: { rows:[{date, postid, visitors, impressions, search_in, etc}], total, from, to }
 */
function Blog_statsDaily(params) {
  params = params || {};
  const from = String(params.from || '').slice(0, 10);
  const to   = String(params.to   || '').slice(0, 10);
  const wantPid = String(params.postid || '').trim();

  const cache = CacheService.getScriptCache();
  const CACHE_KEY = 'blog_stats_daily_v1';
  let parsed = null;
  try {
    const cached = cache.get(CACHE_KEY);
    if (cached) parsed = JSON.parse(cached);
  } catch (_) {}

  if (!parsed) {
    const SHEET_NAME = 'STATS_DAILY';
    const sheet = SpreadsheetApp.openById(BLOG_SHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('sheet_not_found:' + SHEET_NAME);

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      parsed = { rows: [] };
    } else {
      const lastCol = sheet.getLastColumn();
      const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
      const headers = (values[0] || []).map(function (h) { return String(h || '').trim().toLowerCase(); });
      // 컬럼 위치 — 헤더가 없거나 다를 경우 고정 위치(A,B,C,D,E,F) fallback
      function findIdx(names, fallback) {
        for (let i = 0; i < names.length; i++) {
          const idx = headers.indexOf(names[i]);
          if (idx >= 0) return idx;
        }
        return fallback;
      }
      const dateIdx   = findIdx(['date'], 0);
      const pidIdx    = findIdx(['post_id', 'postid'], 1);
      const visIdx    = findIdx(['visitors', 'visitor'], 2);
      const impIdx    = findIdx(['impressions', 'impression'], 3);
      const srchIdx   = findIdx(['search_in', 'searchin'], 4);
      const etcIdx    = findIdx(['etc'], 5);

      const rows = [];
      for (let i = 1; i < values.length; i++) {
        const r = values[i];
        const rawDate = r[dateIdx];
        let date = '';
        if (rawDate instanceof Date) date = Utilities.formatDate(rawDate, BLOG_TZ, 'yyyy-MM-dd');
        else if (rawDate) date = String(rawDate).slice(0, 10);
        if (!date) continue;
        const pid = r[pidIdx] == null ? '' : String(r[pidIdx]).trim();
        if (!pid) continue;
        rows.push({
          date: date,
          postid: pid,
          visitors: blog_num_(r[visIdx]),
          impressions: blog_num_(r[impIdx]),
          search_in: blog_num_(r[srchIdx]),
          etc: blog_num_(r[etcIdx])
        });
      }
      parsed = { rows: rows };
    }
    try {
      const json = JSON.stringify(parsed);
      if (json.length < 95000) cache.put(CACHE_KEY, json, 300);
    } catch (_) {}
  }

  const all = parsed.rows || [];
  const out = [];
  for (let i = 0; i < all.length; i++) {
    const r = all[i];
    if (from && r.date < from) continue;
    if (to   && r.date > to)   continue;
    if (wantPid && r.postid !== wantPid) continue;
    out.push(r);
  }
  return { rows: out, total: out.length, from: from, to: to };
}

/**
 * 인바운드(세일즈맵 제출)를 일자별로 집계
 *   params.from? : 'yyyy-MM-dd' 이상 (제출 날짜 기준)
 *   params.to?   : 'yyyy-MM-dd' 이하
 * 반환: { rows:[{date, utm_term}], total, from, to }
 */
function Blog_inboundByDate(params) {
  params = params || {};
  const from = String(params.from || '').slice(0, 10);
  const to   = String(params.to   || '').slice(0, 10);
  const parsed = blog_loadSalesmap_();
  const list = parsed.rows || [];
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    const date = (r.d || '').slice(0, 10);
    // 기간 필터가 있으면 날짜로 거른다. 필터가 없으면(전체 기간) 날짜가 비어 있어도
    // utm 카운트에는 포함시켜야 상세 드로어(Blog_inboundDates)와 합계가 일치한다.
    if (from || to) {
      if (!date) continue;
      if (from && date < from) continue;
      if (to   && date > to)   continue;
    }
    out.push({ date: date, utm_term: r.u });
  }
  return { rows: out, total: out.length, from: from, to: to };
}

// ── helpers ─────────────────────────────────
function blog_norm_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, BLOG_TZ, 'yyyy-MM-dd');
  return v;
}
function blog_num_(v) { const n = Number(v); return isFinite(n) ? n : 0; }
