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
 *   { utm_term, count, items:[{date,datetime,company,manager,service}], byDate:[{date,count}] }
 */
function Blog_inboundDates(params) {
  params = params || {};
  const utm = String(params.utm_term || '').trim();
  if (!utm) throw new Error('utm_term_required');

  const SALESMAP_NAME = 'Data_Result_Final';
  const ss = SpreadsheetApp.openById(BLOG_SHEET_ID);
  const sheet = ss.getSheetByName(SALESMAP_NAME);
  if (!sheet) throw new Error('sheet_not_found:' + SALESMAP_NAME);

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { utm_term: utm, count: 0, items: [], byDate: [] };

  const headers = values[0].map(function (h) { return String(h || '').trim(); });
  const utmIdx     = headers.indexOf('utm_term');
  const dateIdx    = headers.indexOf('제출 날짜');
  const companyIdx = headers.indexOf('기업명');
  const managerIdx = headers.indexOf('담당자명');
  const serviceIdx = headers.indexOf('관심 서비스');
  if (utmIdx < 0) throw new Error('utm_term_column_not_found_in_salesmap');

  const items = [];
  const byDateMap = {};
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    if (String(r[utmIdx] == null ? '' : r[utmIdx]).trim() !== utm) continue;
    let raw = dateIdx >= 0 ? r[dateIdx] : '';
    let dateStr = '';
    let dateTime = '';
    if (raw instanceof Date) {
      dateStr  = Utilities.formatDate(raw, BLOG_TZ, 'yyyy-MM-dd');
      dateTime = Utilities.formatDate(raw, BLOG_TZ, 'yyyy-MM-dd HH:mm');
    } else if (raw) {
      const s = String(raw);
      dateStr  = s.slice(0, 10);
      dateTime = s.slice(0, 16);
    }
    items.push({
      date: dateStr,
      datetime: dateTime,
      company: companyIdx >= 0 ? String(r[companyIdx] || '') : '',
      manager: managerIdx >= 0 ? String(r[managerIdx] || '') : '',
      service: serviceIdx >= 0 ? String(r[serviceIdx] || '') : ''
    });
    if (dateStr) byDateMap[dateStr] = (byDateMap[dateStr] || 0) + 1;
  }
  // 최신순
  items.sort(function (a, b) { return (b.datetime || b.date) < (a.datetime || a.date) ? -1 : 1; });
  const byDate = Object.keys(byDateMap)
    .map(function (k) { return { date: k, count: byDateMap[k] }; })
    .sort(function (a, b) { return a.date < b.date ? 1 : -1; });

  return { utm_term: utm, count: items.length, items: items, byDate: byDate };
}

// ── helpers ─────────────────────────────────
function blog_norm_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, BLOG_TZ, 'yyyy-MM-dd');
  return v;
}
function blog_num_(v) { const n = Number(v); return isFinite(n) ? n : 0; }
