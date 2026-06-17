/* IB/OB 분석 페이지 공용 코어 (3시안 공용)
 * - 와이어프레임용 리치 데모 데이터 생성기 (SAMPLE_IBOB 스키마 동일)
 * - 분석 집계 헬퍼 (차원별 / 시계열 / 요일 / 교차 / 키워드 / UTM)
 * - Chart.js 공통 렌더 헬퍼 (막대 / 라인 / 도넛 / 버블 / 히트맵 / 정렬테이블)
 *
 * 분석 대상: IB/OB 종합에 적재된 로우테이블(고객사 인바운드 리스트).
 * 실데이터 연결(GAS) 시에는 해당 rows 를, 미연결 시에는 아래 데모셋을 사용한다.
 */
window.Analysis = (function () {
  /* ── 유틸 ── */
  const esc = (window.IBOB && window.IBOB.esc) || (s => String(s == null ? '' : s));
  const fmt = (window.IBOB && window.IBOB.fmt) || (n => String(n));
  const PALETTE = ['#6d4eff', '#2563eb', '#16a34a', '#d97706', '#db2777', '#0d9488', '#8a72ff', '#e11d48', '#0891b2', '#65a30d'];
  const HEAT = ['#f3f5f9', '#dcd6fb', '#bcaef7', '#9c87f2', '#7c5cff', '#5b3fd9'];

  /* 시드 PRNG (결정적 데모) */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function ymd(d) {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${dd}`;
  }
  function weekLabel(d) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const yStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    const wk = Math.ceil((((t - yStart) / 86400000) + 1) / 7);
    return `${t.getUTCFullYear()}-W${String(wk).padStart(2, '0')}`;
  }

  /* ── 데모 데이터 생성 ── */
  const SERVICES = ['마케팅 자동화', 'CRM 컨설팅', '세일즈 아웃리치', '제휴 운영', '데이터 분석', '광고 운영'];
  const AWARE = ['검색', 'SNS', '블로그', '지인 소개', '세미나', '전시회', '제휴 파트너', '광고'];
  const SIDO = ['서울', '경기', '인천', '부산', '대구', '대전', '광주', '울산', '세종'];
  const FIRM = ['스타트업', '중소', '중견', '대기업'];
  const LISTED = ['비상장', '코스닥', '코스피'];
  const UTMSRC = ['google', 'naver', 'linkedin', 'instagram', 'blog', 'partner', ''];
  const KW = ['마케팅 자동화', 'CRM 가격', 'CRM SaaS 비교', '리드 관리 툴', '세일즈 파이프라인',
    '마케팅 ROI 측정', '고객 데이터 플랫폼', '영업 자동화', '뉴스레터 솔루션', 'B2B 마케팅'];
  const GU = { '서울': ['강남구', '서초구', '마포구', '송파구', '영등포구', '성동구'], '경기': ['성남시 분당구', '수원시 영통구', '고양시 일산동구', '용인시 기흥구'], '부산': ['해운대구', '부산진구', '수영구'], '인천': ['연수구', '남동구'], '대구': ['수성구', '달서구'], '대전': ['유성구', '서구'], '광주': ['서구', '광산구'], '울산': ['남구'], '세종': ['세종'] };
  const NAMES = ['알파', '베타', '감마', '델타', '엡실론', '제타', '에타', '세타', '요타', '카파', '람다', '뮤', '뉴', '오미크론', '파이', '로', '시그마', '타우', '웁실론', '피', '카이', '프사이', '오메가'];
  const SUFFIX = ['테크', '솔루션', '인더스트리', '로지스', '데이터', '바이오', '시스템', '미디어', '엔터', '네트워크', '커머스', '랩스', '소프트', '컴퍼니'];

  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function gen(n) {
    const rng = mulberry32(20260617);
    const rows = [];
    const start = new Date(2025, 6, 1);      // 2025-07-01
    const end = new Date(2026, 5, 15);       // 2026-06-15
    const span = (end - start) / 86400000;
    // 채널/서비스별 성약 가중치 (분석에서 차이가 보이도록)
    const awareConv = { '지인 소개': .55, '제휴 파트너': .48, '세미나': .42, '전시회': .35, '검색': .30, '블로그': .26, 'SNS': .22, '광고': .18 };
    const svcConv = { 'CRM 컨설팅': 1.25, '마케팅 자동화': 1.1, '데이터 분석': 1.0, '제휴 운영': .95, '세일즈 아웃리치': .9, '광고 운영': .8 };
    for (let i = 0; i < n; i++) {
      const dOff = Math.floor(rng() * span);
      const in_ = new Date(start.getTime() + dOff * 86400000);
      const svc = pick(rng, SERVICES);
      const aw = pick(rng, AWARE);
      const sido = pick(rng, SIDO);
      const gu = pick(rng, (GU[sido] || ['-']));
      const firm = pick(rng, FIRM);
      let ch = (svc === '세일즈 아웃리치') ? (rng() < .8 ? 'OB' : 'IB') : (rng() < .12 ? 'OB' : 'IB');
      let utmsrc = ch === 'OB' ? 'ob_call' : pick(rng, UTMSRC);
      const emp = [10, 30, 60, 120, 250, 480, 900][Math.floor(rng() * 7)] + Math.floor(rng() * 40);
      // 성약 확률
      const p = Math.min(.85, (awareConv[aw] || .25) * (svcConv[svc] || 1));
      const r = rng();
      let conv = '무응답', meet = '', sign = '';
      const meetDate = new Date(in_.getTime() + (2 + Math.floor(rng() * 8)) * 86400000);
      if (r < p) { conv = 'Y'; meet = ymd(meetDate); sign = ymd(new Date(meetDate.getTime() + (5 + Math.floor(rng() * 14)) * 86400000)); }
      else if (r < p + .22) { conv = '협의중'; meet = ymd(meetDate); }
      else if (r < p + .38) { conv = '드롭'; if (rng() < .6) meet = ymd(meetDate); }
      const kw = aw === '검색' ? pick(rng, KW) : (aw === '블로그' && rng() < .4 ? pick(rng, KW) : '');
      const utm = utmsrc ? `utm_source=${utmsrc}&utm_medium=${ch === 'OB' ? 'outbound' : (rng() < .5 ? 'cpc' : 'organic')}` + (kw ? `&utm_term=${encodeURIComponent(kw)}` : '') : '';
      rows.push({
        '주차': weekLabel(in_), '시작일': '', '종료일': '',
        'IB 인입 일자': ymd(in_), '최초 협의 일자': meet, '계약서 날인 일자': sign,
        '성약': conv, '영업대장': '담당' + (1 + Math.floor(rng() * 6)),
        '고객사 분류': pick(rng, ['A', 'B', 'C']),
        '고객사명': pick(rng, NAMES) + pick(rng, SUFFIX),
        '주소': sido + ' ' + gu, 'CH': ch, '시도': sido, '지역구': gu, '동리': '-',
        '임직원 수': emp, '기업구분': firm, '상장 여부': pick(rng, LISTED),
        '서비스 인입 구분': svc, '트래킹 경로(UTM)': utm,
        '상세 경로': aw === '검색' ? '/landing' : (aw === '블로그' ? '/blog' : (aw === 'SNS' ? '/sns' : '직접')),
        '인터뷰 기반': '', '인지채널': aw, '검색 키워드': kw
      });
    }
    return rows;
  }

  let DEMO = null;
  function demo() { if (!DEMO) DEMO = gen(220); return DEMO; }

  /* ── 집계 헬퍼 ──
   * 시트 셀의 앞뒤 공백 때문에 비교가 빗나가지 않도록 항상 trim() 후 비교한다.
   * CH 가 'OB' 가 아닌 모든 행(빈 CH 포함)은 IB 로 본다(인바운드 기본).
   */
  const _t = v => String(v == null ? '' : v).trim();
  const isOB = r => _t(r['CH']).toUpperCase() === 'OB';
  const isConv = r => { const s = _t(r['성약']); return s === 'Y' || s === '성약'; };
  function kpi(rows) {
    const total = rows.length;
    const ob = rows.filter(isOB).length;
    const conv = rows.filter(isConv).length;
    const mid = rows.filter(r => _t(r['성약']) === '협의중').length;
    const drop = rows.filter(r => { const s = _t(r['성약']); return s === '드롭' || s === '무응답'; }).length;
    const meet = rows.filter(r => _t(r['최초 협의 일자'])).length;
    const sign = rows.filter(r => _t(r['계약서 날인 일자'])).length;
    return { total, ib: total - ob, ob, conv, mid, drop, meet, sign, rate: total ? Math.round(conv * 100 / total) : 0 };
  }
  /* 차원별: [{name,total,ib,ob,conv,rate}] (인입 많은 순) */
  function byDim(rows, key, limit) {
    const m = {};
    rows.forEach(r => {
      const k = String(r[key] || '기타').trim() || '기타';
      if (!m[k]) m[k] = { name: k, total: 0, ib: 0, ob: 0, conv: 0 };
      m[k].total++;
      if (isOB(r)) m[k].ob++; else m[k].ib++;
      if (isConv(r)) m[k].conv++;
    });
    let arr = Object.values(m).map(d => Object.assign(d, { rate: d.total ? Math.round(d.conv * 100 / d.total) : 0 }));
    arr.sort((a, b) => b.total - a.total);
    return limit ? arr.slice(0, limit) : arr;
  }
  /* 시계열: unit = day|week|month|year */
  function series(rows, unit) {
    const m = {};
    rows.forEach(r => {
      const d = String(r['IB 인입 일자'] || '').slice(0, 10); if (!d) return;
      let k;
      if (unit === 'week') k = String(r['주차'] || '').replace(/^\d{4}-/, '');
      else if (unit === 'year') k = d.slice(0, 4);
      else if (unit === 'day') k = d.slice(5, 10); // MM-DD
      else k = d.slice(0, 7);                       // month (기본)
      if (!m[k]) m[k] = { key: k, ib: 0, ob: 0, conv: 0, total: 0 };
      m[k].total++;
      if (isOB(r)) m[k].ob++; else m[k].ib++;
      if (isConv(r)) m[k].conv++;
    });
    return Object.values(m).sort((a, b) => a.key < b.key ? -1 : 1)
      .map(d => Object.assign(d, { rate: d.total ? Math.round(d.conv * 100 / d.total) : 0 }));
  }
  const DOW = ['일', '월', '화', '수', '목', '금', '토'];
  function dow(rows) {
    const m = DOW.map(d => ({ name: d, total: 0, conv: 0 }));
    rows.forEach(r => {
      const d = new Date(String(r['IB 인입 일자'] || '').slice(0, 10)); if (isNaN(d)) return;
      m[d.getDay()].total++; if (isConv(r)) m[d.getDay()].conv++;
    });
    return m.map(d => Object.assign(d, { rate: d.total ? Math.round(d.conv * 100 / d.total) : 0 }));
  }
  /* 기업 규모 세그먼트 */
  function sizeSeg(rows) {
    const seg = [['1~30', 0, 30], ['31~100', 31, 100], ['101~300', 101, 300], ['301~', 301, 1e9]];
    const m = seg.map(s => ({ name: s[0], lo: s[1], hi: s[2], total: 0, conv: 0 }));
    rows.forEach(r => {
      const e = Number(r['임직원 수']) || 0;
      const b = m.find(x => e >= x.lo && e <= x.hi); if (!b) return;
      b.total++; if (isConv(r)) b.conv++;
    });
    return m.map(d => Object.assign(d, { rate: d.total ? Math.round(d.conv * 100 / d.total) : 0 }));
  }
  /* 교차표: keyX(행) × keyY(열) → {cols, rows:[{name, cells:[{v}], total}], max} */
  function crosstab(rows, keyX, keyY, limX, limY) {
    const xs = byDim(rows, keyX, limX).map(d => d.name);
    const ys = byDim(rows, keyY, limY).map(d => d.name);
    const idx = {}; ys.forEach((y, i) => idx[y] = i);
    let max = 0;
    const out = xs.map(x => {
      const cells = ys.map(() => 0);
      rows.forEach(r => {
        if ((String(r[keyX] || '기타').trim() || '기타') !== x) return;
        const yv = String(r[keyY] || '기타').trim() || '기타';
        if (idx[yv] != null) cells[idx[yv]]++;
      });
      const total = cells.reduce((s, v) => s + v, 0);
      cells.forEach(v => { if (v > max) max = v; });
      return { name: x, cells, total };
    });
    return { cols: ys, rows: out, max: max || 1 };
  }
  /* UTM source 분포 */
  function utmSource(rows) {
    return byDim(rows.map(r => ({ ...r, _src: (String(r['트래킹 경로(UTM)'] || '').match(/utm_source=([^&\s]+)/i) || [, '(직접)'])[1] })), '_src');
  }
  /* 검색 키워드 빈도 */
  function keywords(rows) {
    const m = {};
    rows.forEach(r => {
      const k = String(r['검색 키워드'] || '').trim(); if (!k) return;
      if (!m[k]) m[k] = { name: k, total: 0, conv: 0 };
      m[k].total++; if (isConv(r)) m[k].conv++;
    });
    return Object.values(m).map(d => Object.assign(d, { rate: d.total ? Math.round(d.conv * 100 / d.total) : 0 }))
      .sort((a, b) => b.total - a.total);
  }

  /* ── Chart.js 기본 테마 ── */
  function theme() {
    if (!window.Chart || theme._done) return;
    Chart.defaults.font.family = "'Pretendard', sans-serif";
    Chart.defaults.font.size = 11.5;
    Chart.defaults.color = '#6b7280';
    Chart.defaults.plugins.legend.labels.boxWidth = 10;
    Chart.defaults.plugins.legend.labels.boxHeight = 10;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.maintainAspectRatio = false;
    theme._done = true;
  }
  const GRID = { color: '#e2e5ec' };
  /* 차트 핸들 저장 → 재렌더 시 destroy */
  const _charts = {};
  function mk(id, cfg) {
    theme();
    const el = document.getElementById(id); if (!el) return;
    if (_charts[id]) _charts[id].destroy();
    _charts[id] = new Chart(el.getContext('2d'), cfg);
    return _charts[id];
  }
  function barIBOB(id, data, opt) {
    opt = opt || {};
    return mk(id, {
      type: 'bar',
      data: {
        labels: data.map(d => d.name || d.key),
        datasets: [
          { label: 'IB', data: data.map(d => d.ib), backgroundColor: '#2563eb', stack: 's', borderRadius: 3 },
          { label: 'OB', data: data.map(d => d.ob), backgroundColor: '#0d9488', stack: 's', borderRadius: 3 }
        ]
      },
      options: {
        indexAxis: opt.horizontal ? 'y' : 'x',
        plugins: { legend: { position: 'bottom' } },
        scales: { x: { stacked: true, grid: opt.horizontal ? GRID : { display: false } }, y: { stacked: true, grid: opt.horizontal ? { display: false } : GRID, ticks: { precision: 0 } } }
      }
    });
  }
  function rateBar(id, data, color) {
    return mk(id, {
      type: 'bar',
      data: { labels: data.map(d => d.name || d.key), datasets: [{ label: '성약률(%)', data: data.map(d => d.rate), backgroundColor: color || '#6d4eff', borderRadius: 3 }] },
      options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: GRID, ticks: { callback: v => v + '%' } } } }
    });
  }
  function lineSeries(id, data) {
    return mk(id, {
      type: 'bar',
      data: {
        labels: data.map(d => d.key),
        datasets: [
          { type: 'bar', label: 'IB', data: data.map(d => d.ib), backgroundColor: '#2563eb', stack: 's', borderRadius: 2, order: 2 },
          { type: 'bar', label: 'OB', data: data.map(d => d.ob), backgroundColor: '#0d9488', stack: 's', borderRadius: 2, order: 2 },
          { type: 'line', label: '성약률(%)', data: data.map(d => d.rate), borderColor: '#d97706', backgroundColor: '#d97706', yAxisID: 'y1', tension: .35, pointRadius: 2, order: 1 }
        ]
      },
      options: {
        plugins: { legend: { position: 'bottom' } },
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: { stacked: true, position: 'left', grid: GRID, ticks: { precision: 0 } },
          y1: { position: 'right', grid: { display: false }, ticks: { callback: v => v + '%' }, min: 0, max: 100 }
        }
      }
    });
  }
  function doughnut(id, dist, opt) {
    opt = opt || {};
    const d = dist.slice(0, opt.limit || 7);
    return mk(id, {
      type: 'doughnut',
      data: { labels: d.map(x => x.name), datasets: [{ data: d.map(x => x.total), backgroundColor: PALETTE, borderColor: '#fff', borderWidth: 2 }] },
      options: { cutout: '62%', plugins: { legend: { position: opt.legend || 'right' } } }
    });
  }
  /* 버블: x=인입, y=성약률, r=성약수 */
  function bubble(id, dim) {
    const maxConv = Math.max(1, ...dim.map(d => d.conv));
    return mk(id, {
      type: 'bubble',
      data: {
        datasets: dim.map((d, i) => ({
          label: d.name,
          data: [{ x: d.total, y: d.rate, r: 6 + Math.round(d.conv / maxConv * 22) }],
          backgroundColor: PALETTE[i % PALETTE.length] + 'cc', borderColor: PALETTE[i % PALETTE.length]
        }))
      },
      options: {
        plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: c => `${c.dataset.label}: 인입 ${c.raw.x} · 성약률 ${c.raw.y}%` } } },
        scales: { x: { title: { display: true, text: '인입 물량' }, grid: GRID, ticks: { precision: 0 } }, y: { title: { display: true, text: '성약률 %' }, grid: GRID, ticks: { callback: v => v + '%' } } }
      }
    });
  }

  /* ── HTML 히트맵 ── */
  function heatHTML(ct) {
    const head = '<tr><th class="hm-corner"></th>' + ct.cols.map(c => `<th class="hm-col">${esc(c)}</th>`).join('') + '</tr>';
    const body = ct.rows.map(r => '<tr><th class="hm-row">' + esc(r.name) + '</th>' + r.cells.map(v => {
      const lvl = v === 0 ? 0 : 1 + Math.round(v / ct.max * (HEAT.length - 2));
      const bg = HEAT[lvl];
      const fg = lvl >= 4 ? '#fff' : '#374151';
      return `<td class="hm-cell" style="background:${bg};color:${fg}" title="${esc(r.name)} × ${v}건">${v || ''}</td>`;
    }).join('') + '</tr>').join('');
    return `<table class="hm-table"><thead>${head}</thead><tbody>${body}</tbody></table>`;
  }

  /* ── 정렬 가능 요약 테이블 ── */
  function dimTable(elId, dim, opt) {
    opt = opt || {};
    const el = document.getElementById(elId); if (!el) return;
    const cols = opt.cols || [['name', opt.nameLabel || '항목', 'l'], ['total', '인입', 'n'], ['ib', 'IB', 'n'], ['ob', 'OB', 'n'], ['conv', '성약', 'n'], ['rate', '성약률', 'r']];
    const maxTotal = Math.max(1, ...dim.map(d => d.total));
    let sortKey = opt.sort || 'total', sortDir = -1;
    function draw() {
      const sorted = dim.slice().sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey];
        return (av < bv ? -1 : av > bv ? 1 : 0) * sortDir;
      });
      const head = '<tr>' + cols.map(c => `<th data-k="${c[0]}" class="${c[2] === 'n' || c[2] === 'r' ? 'num' : ''} ${sortKey === c[0] ? 'sorted' : ''}">${c[1]}${sortKey === c[0] ? (sortDir < 0 ? ' ▾' : ' ▴') : ''}</th>`).join('') + '</tr>';
      const body = sorted.map(d => '<tr>' + cols.map(c => {
        if (c[0] === 'rate') return `<td class="num"><span class="rate-pill">${d.rate}%</span></td>`;
        if (c[0] === 'total') return `<td class="num"><span class="cell-bar"><i style="width:${Math.round(d.total / maxTotal * 100)}%"></i></span><b>${fmt(d.total)}</b></td>`;
        if (c[2] === 'n') return `<td class="num">${fmt(d[c[0]])}</td>`;
        return `<td>${esc(d[c[0]])}</td>`;
      }).join('') + '</tr>').join('');
      el.innerHTML = `<table class="an-table"><thead>${head}</thead><tbody>${body}</tbody></table>`;
      el.querySelectorAll('th[data-k]').forEach(th => th.addEventListener('click', () => {
        const k = th.dataset.k; if (k === sortKey) sortDir *= -1; else { sortKey = k; sortDir = -1; } draw();
      }));
    }
    draw();
  }

  return {
    PALETTE, HEAT, esc, fmt, ymd,
    demo, kpi, byDim, series, dow, sizeSeg, crosstab, utmSource, keywords, isConv,
    theme, barIBOB, rateBar, lineSeries, doughnut, bubble, heatHTML, dimTable, charts: _charts
  };
})();
