/**
 * IB / OB 종합 모듈 (인바운드 통합 v2 시트 · 로우데이터)
 *
 * 시트 구조 (인바운드 통합 v2):
 *   NO, 서비스명, 요일, 월, 주차, 시작일, 종료일, IB 인입 일자, 최초 협의 일자,
 *   계약서 날인 일자, 성약, 영업대장, 고객사 분류, 고객사명, 주소, CH, 시도,
 *   지역구, 동리, 임직원 수, 기업구분, 상장 여부, 유입구분, 트래킹 경로(UTM),
 *   상세 경로, 인터뷰 기반, 인지채널, 검색 키워드, 사업자등록번호, 업종, 업태,
 *   기업규모, 법인구분, 등록일자, 임직원 수, 법인등록번호
 *
 * 프론트(IBOB_ALL_COLS)는 '유입구분' → '서비스 인입 구분'으로 표기하므로
 * GAS 응답 단계에서 키 이름만 리네임해서 노출합니다.
 * 시트 컬럼 자체를 '서비스 인입 구분'으로 바꿀 경우 IBOB_RENAME 항목 제거.
 *
 * ※ '임직원 수' 헤더가 2회 등장하면 객체 키가 충돌(뒤 값이 덮어씀)합니다 — 동일 의미라 무방.
 */

const IBOB_SHEET_ID   = '1evHT_QWJ7tHuCykdW4Hh1bIN7CQpw-G2bdUFtL4yP40';
const IBOB_SHEET_NAME = '인바운드 통합 v2';
const IBOB_TZ         = 'Asia/Seoul';

const IBOB_RENAME = {
  '유입구분': '서비스 인입 구분'
};

const IBOB_DATE_KEYS = new Set([
  '시작일','종료일','IB 인입 일자','최초 협의 일자','계약서 날인 일자','등록일자'
]);

/**
 * IB/OB 로우데이터 반환
 *   params.q?        : 고객사명/주소/검색키워드/UTM 부분일치
 *   params.ch?       : 'IB' | 'OB'
 *   params.status?   : 'Y' | '협의중' | '드롭' | '무응답'
 *   params.from?     : IB 인입 일자 시작 (yyyy-MM-dd)
 *   params.to?       : IB 인입 일자 종료 (yyyy-MM-dd)
 *   params.limit?    : 최대 행 수
 */
function Ibob_list(params) {
  params = params || {};
  const sheet = SpreadsheetApp.openById(IBOB_SHEET_ID).getSheetByName(IBOB_SHEET_NAME);
  if (!sheet) throw new Error('sheet_not_found:' + IBOB_SHEET_NAME);

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { rows: [], total: 0, headers: [] };

  const headers = values[0].map(function (h) { return String(h || '').trim(); });
  const companyIdx = headers.indexOf('고객사명');
  const outKeys = headers.map(function (h) { return IBOB_RENAME[h] || h; });

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
        o[outKeys[j]] = ibob_norm_(r[j], h);
      });
      return o;
    });

  if (params.ch) {
    const ch = String(params.ch).toUpperCase();
    rows = rows.filter(function (r) { return String(r['CH'] || '').toUpperCase() === ch; });
  }
  if (params.status) {
    const st = String(params.status);
    rows = rows.filter(function (r) {
      const v = String(r['성약'] || '');
      if (st === 'Y') return v === 'Y' || v === '성약';
      return v === st;
    });
  }
  if (params.from) {
    const f = String(params.from);
    rows = rows.filter(function (r) { return String(r['IB 인입 일자'] || '').slice(0,10) >= f; });
  }
  if (params.to) {
    const t = String(params.to);
    rows = rows.filter(function (r) { return String(r['IB 인입 일자'] || '').slice(0,10) <= t; });
  }
  if (params.q) {
    const q = String(params.q).toLowerCase();
    rows = rows.filter(function (r) {
      return ['고객사명','주소','검색 키워드','트래킹 경로(UTM)','시도','지역구']
        .some(function (k) { return String(r[k] || '').toLowerCase().indexOf(q) >= 0; });
    });
  }
  if (params.limit) {
    const n = parseInt(params.limit, 10);
    if (n > 0) rows = rows.slice(0, n);
  }

  return { rows: rows, total: rows.length, headers: outKeys };
}

/**
 * IB/OB 요약 통계 — 퍼널 / 분포 / 주차별 추이
 */
function Ibob_summary(params) {
  const list = Ibob_list(params || {});
  const rows = list.rows;
  const dist = function (key) {
    const m = {};
    rows.forEach(function (r) {
      const k = String(r[key] || '미지정') || '미지정';
      m[k] = (m[k] || 0) + 1;
    });
    return ibob_obj2arr_(m);
  };
  const funnel = {
    ibIn: rows.filter(function (r) { return r['IB 인입 일자']; }).length,
    meet: rows.filter(function (r) { return r['최초 협의 일자']; }).length,
    sign: rows.filter(function (r) { return r['계약서 날인 일자']; }).length,
    conv: rows.filter(function (r) { return r['성약'] === 'Y' || r['성약'] === '성약'; }).length
  };
  const byWeek = {};
  rows.forEach(function (r) {
    const w = r['주차'] || '-';
    const ch = String(r['CH'] || '').toUpperCase();
    if (!byWeek[w]) byWeek[w] = { ib: 0, ob: 0 };
    if (ch === 'IB') byWeek[w].ib++;
    else if (ch === 'OB') byWeek[w].ob++;
  });
  return {
    count:       rows.length,
    funnel:      funnel,
    byAwareness: dist('인지채널'),
    byService:   dist('서비스 인입 구분'),
    byRegion:    dist('시도'),
    byFirm:      dist('기업구분'),
    byWeek:      Object.keys(byWeek).sort().map(function (w) { return { name: w, ib: byWeek[w].ib, ob: byWeek[w].ob }; })
  };
}

// ── helpers ─────────────────────────────────
function ibob_norm_(v, header) {
  if (v instanceof Date) {
    return IBOB_DATE_KEYS.has(header)
      ? Utilities.formatDate(v, IBOB_TZ, 'yyyy-MM-dd')
      : Utilities.formatDate(v, IBOB_TZ, 'yyyy-MM-dd HH:mm');
  }
  return v;
}
function ibob_obj2arr_(obj) {
  return Object.keys(obj).map(function (k) { return { name: k, count: obj[k] }; })
    .sort(function (a, b) { return b.count - a.count; });
}
