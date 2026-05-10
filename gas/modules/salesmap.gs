/**
 * SALESMAP 모듈 (세일즈맵 / 인바운드 리드 로우데이터)
 *
 * 시트 구조 (Data_Result_Final):
 *   제출 날짜, 관심 서비스, 기업명, 기업주소, 담당자명, 휴대전화번호,
 *   회사 이메일, 임직원수, 유입경로, 문의내용,
 *   개인정보 수집 동의, 마케팅 수신 동의,
 *   utm_source, utm_medium, utm_campaign, utm_content, utm_term, WebFormID
 *
 * 프론트 표시 컬럼 (요구사항):
 *   no, 제출 날짜, 서비스, 기업명, 임직원 수, 기업 주소, 담당자,
 *   전화번호, 이메일, 유입경로, 개인정보 수집 동의, 마케팅 수신 동의,
 *   utm_source, utm_medium, utm_campaign, utm_content, utm_term
 */

const SALESMAP_SHEET_ID   = '13LWJmvtSJRy6G43Lo_jar9hqZquCY4vB4bP4kAQVQLQ';
const SALESMAP_SHEET_NAME = 'Data_Result_Final';
const SALESMAP_TZ         = 'Asia/Seoul';

// 시트 컬럼 → 프론트 키 매핑
const SALESMAP_FIELD_MAP = {
  '제출 날짜':           'submittedAt',
  '관심 서비스':         'service',
  '기업명':              'company',
  '기업주소':            'address',
  '담당자명':            'manager',
  '휴대전화번호':        'phone',
  '회사 이메일':         'email',
  '임직원수':            'employeeCount',
  '유입경로':            'channel',
  '문의내용':            'message',
  '개인정보 수집 동의':  'privacyAgreed',
  '마케팅 수신 동의':    'marketingAgreed',
  'utm_source':          'utm_source',
  'utm_medium':          'utm_medium',
  'utm_campaign':        'utm_campaign',
  'utm_content':         'utm_content',
  'utm_term':            'utm_term',
  'WebFormID':           'webFormId'
};

/**
 * 세일즈맵 로우데이터 반환
 *   params.q?       : 기업명/담당자/이메일 부분일치 검색
 *   params.service? : 서비스 필터
 *   params.channel? : 유입경로 필터
 *   params.from?    : 제출일 시작 (yyyy-MM-dd)
 *   params.to?      : 제출일 종료 (yyyy-MM-dd)
 *   params.limit?   : 최대 행 수
 */
function Salesmap_list(params) {
  params = params || {};
  const sheet = SpreadsheetApp.openById(SALESMAP_SHEET_ID).getSheetByName(SALESMAP_SHEET_NAME);
  if (!sheet) throw new Error('sheet_not_found:' + SALESMAP_SHEET_NAME);

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { rows: [], total: 0, headers: [] };

  const headers = values[0].map(function (h) { return String(h || '').trim(); });
  const companyIdx = headers.indexOf('기업명');

  let rows = values.slice(1)
    .filter(function (r) {
      if (!r.some(function (c) { return c !== '' && c !== null && c !== undefined; })) return false;
      if (companyIdx >= 0) {
        const v = r[companyIdx];
        if (v === null || v === undefined) return false;
        if (typeof v === 'string' && v.trim() === '') return false;
      }
      return true;
    })
    .map(function (r, i) {
      const o = { _no: i + 1 };
      headers.forEach(function (h, j) {
        const key = SALESMAP_FIELD_MAP[h] || h;
        o[key] = salesmap_norm_(r[j]);
      });
      return o;
    });

  // 필터
  if (params.service) {
    const s = String(params.service);
    rows = rows.filter(function (r) { return String(r.service || '') === s; });
  }
  if (params.channel) {
    const c = String(params.channel);
    rows = rows.filter(function (r) { return String(r.channel || '') === c; });
  }
  if (params.q) {
    const q = String(params.q).toLowerCase();
    rows = rows.filter(function (r) {
      return String(r.company || '').toLowerCase().indexOf(q) >= 0
          || String(r.manager || '').toLowerCase().indexOf(q) >= 0
          || String(r.email   || '').toLowerCase().indexOf(q) >= 0;
    });
  }
  if (params.from) {
    const from = String(params.from);
    rows = rows.filter(function (r) { return String(r.submittedAt || '').slice(0,10) >= from; });
  }
  if (params.to) {
    const to = String(params.to);
    rows = rows.filter(function (r) { return String(r.submittedAt || '').slice(0,10) <= to; });
  }
  if (params.limit) {
    const n = parseInt(params.limit, 10);
    if (n > 0) rows = rows.slice(0, n);
  }

  return { rows: rows, total: rows.length, headers: headers };
}

/**
 * 세일즈맵 요약 통계
 */
function Salesmap_summary(params) {
  const list = Salesmap_list({});
  const rows = list.rows;
  const byService = {};
  const byChannel = {};
  const bySource  = {};
  const byMonth   = {};

  rows.forEach(function (r) {
    const svc = r.service || '미지정';
    const ch  = r.channel || '미지정';
    const src = r.utm_source || '(none)';
    byService[svc] = (byService[svc] || 0) + 1;
    byChannel[ch]  = (byChannel[ch]  || 0) + 1;
    bySource[src]  = (bySource[src]  || 0) + 1;
    const m = String(r.submittedAt || '').slice(0, 7);
    if (m) byMonth[m] = (byMonth[m] || 0) + 1;
  });

  return {
    count: rows.length,
    byService: salesmap_obj2arr_(byService),
    byChannel: salesmap_obj2arr_(byChannel),
    bySource:  salesmap_obj2arr_(bySource),
    byMonth:   salesmap_obj2arr_(byMonth).sort(function (a, b) { return a.name < b.name ? -1 : 1; })
  };
}

// ── helpers ─────────────────────────────────
function salesmap_norm_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, SALESMAP_TZ, 'yyyy-MM-dd HH:mm');
  return v;
}
function salesmap_obj2arr_(obj) {
  return Object.keys(obj).map(function (k) { return { name: k, count: obj[k] }; })
    .sort(function (a, b) { return b.count - a.count; });
}
