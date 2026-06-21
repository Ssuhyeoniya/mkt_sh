/* IB/OB 분석 — 카테고리(섹션) 렌더러 (3시안 공용)
 * 네비 카테고리 = 아래 LIST. 각 섹션은 host 엘리먼트에 차트/표를 그린다.
 * 캔버스/엘리먼트 id 는 섹션 id 로 네임스페이스 → 여러 섹션 동시 표시(시안 B/C) 시 충돌 방지.
 */
window.AnalysisSections = (function () {
  const A = window.Analysis;
  const esc = A.esc, fmt = A.fmt;

  const LIST = [
    { group: '종합', items: [{ id: 'overview', label: '개요 대시보드', icon: '◇' }] },
    { group: '차원별 분석', items: [
      { id: 'service', label: '서비스 분석', icon: '▤' },
      { id: 'time', label: '시계열 추이', icon: '〰' },
      { id: 'dow', label: '요일 · 시점', icon: '▦' },
      { id: 'geo', label: '지역 분석', icon: '◉' },
      { id: 'size', label: '기업 규모', icon: '▥' }
    ] },
    { group: '채널 · 유입', items: [
      { id: 'aware', label: '인지채널', icon: '◐' },
      { id: 'inflow', label: '유입 · 경로', icon: '⤴' },
      { id: 'keyword', label: '검색 키워드', icon: '⌕' }
    ] },
    { group: '심층', items: [
      { id: 'conv', label: '성약 심층', icon: '★' },
      { id: 'cross', label: '교차 히트맵', icon: '▩' }
    ] },
    { group: '탐색', items: [{ id: 'explore', label: '데이터 탐색', icon: '☰' }] }
  ];
  const flat = [];
  LIST.forEach(g => g.items.forEach(it => flat.push(Object.assign({ group: g.group }, it))));
  const meta = id => flat.find(x => x.id === id);

  function cid(sid, n) { return sid + '__' + n; }
  const head = (eyebrow, title, desc) =>
    `<div class="sec-head"><div class="eyebrow">${esc(eyebrow)}</div><h2>${esc(title)}</h2>${desc ? `<p>${desc}</p>` : ''}</div>`;
  const card = (title, tag, inner, hint) =>
    `<div class="an-card"><h3>${esc(title)}${tag ? ` <span class="tag">${esc(tag)}</span>` : ''}</h3>${hint ? `<div class="hint">${hint}</div>` : ''}${inner}</div>`;
  const box = (id, cls) => `<div class="chartbox ${cls || ''}"><canvas id="${id}"></canvas></div>`;

  /* ── 각 섹션 빌더: host 에 innerHTML 주입 후 차트/표 그림 ── */
  const B = {
    overview(sid, rows, host) {
      const k = A.kpi(rows);
      const facts = [
        ['전체 인입', fmt(k.total), `IB ${k.ib} · OB ${k.ob}`],
        ['최초 협의', fmt(k.meet), `협의 전환 ${k.total ? Math.round(k.meet * 100 / k.total) : 0}%`],
        ['계약 날인', fmt(k.sign), `진행 ${k.mid}건`],
        ['성약', fmt(k.conv), `성약률 ${k.rate}%`]
      ];
      host.innerHTML = head('Overview', '개요 대시보드', '전체 인바운드 인입을 한눈에. 상단 필터가 모든 카테고리에 적용됩니다.') +
        `<div class="fact-grid">${facts.map(f => `<div class="fact"><div class="ttl">${f[0]}</div><div class="big">${f[1]}</div><div class="sub">${f[2]}</div></div>`).join('')}</div>` +
        `<div class="an-grid an-g23">${card('월별 인입 & 성약률', 'time series', box(cid(sid, 'trend'), 'lg'))}${card('인지채널 믹스', 'P·O·E', box(cid(sid, 'aware'), 'lg'))}</div>` +
        `<div class="an-grid an-g2">${card('서비스별 인입 TOP', 'rank', box(cid(sid, 'svc')))}${card('유입경로(UTM) 분포', 'inflow', box(cid(sid, 'utm')))}</div>`;
      A.lineSeries(cid(sid, 'trend'), A.series(rows, 'month'));
      A.doughnut(cid(sid, 'aware'), A.byDim(rows, '인지채널'));
      A.barIBOB(cid(sid, 'svc'), A.byDim(rows, '서비스 인입 구분'));
      A.doughnut(cid(sid, 'utm'), A.utmSource(rows));
    },
    service(sid, rows, host) {
      const dim = A.byDim(rows, '서비스 인입 구분');
      host.innerHTML = head('Service', '서비스 분석', '서비스 인입 구분별 인입 규모 · 성약 · 성약률 비교.') +
        `<div class="an-grid an-g2">${card('서비스별 인입(IB/OB)', 'stacked', box(cid(sid, 'bar'), 'lg'))}${card('서비스별 성약률', 'rate', box(cid(sid, 'rate'), 'lg'))}</div>` +
        card('효율 매트릭스', 'volume × rate', box(cid(sid, 'bub'), 'lg'), 'X=인입 물량, Y=성약률, 원 크기=성약 건수. 우상단일수록 "많고 잘 터지는" 서비스') +
        card('서비스 상세', 'table', `<div id="${cid(sid, 'tbl')}"></div>`);
      A.barIBOB(cid(sid, 'bar'), dim);
      A.rateBar(cid(sid, 'rate'), dim);
      A.bubble(cid(sid, 'bub'), dim);
      A.dimTable(cid(sid, 'tbl'), dim, { nameLabel: '서비스' });
    },
    time(sid, rows, host) {
      host.innerHTML = head('Time Series', '시계열 추이', '월 · 주 · 연 단위 인입 흐름과 성약률 변화.') +
        card('인입 & 성약률 추이', 'dual axis',
          `<div style="margin-bottom:10px"><span class="an-seg" id="${cid(sid, 'seg')}">
            <button data-u="month" class="active">월별</button><button data-u="week">주차별</button><button data-u="year">연도별</button>
          </span></div>` + box(cid(sid, 'chart'), 'xl'),
          '막대=인입(IB/OB 누적), 선=성약률%');
      const draw = u => A.lineSeries(cid(sid, 'chart'), A.series(rows, u));
      draw('month');
      host.querySelector('#' + cid(sid, 'seg')).addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        host.querySelectorAll('#' + cid(sid, 'seg') + ' button').forEach(x => x.classList.remove('active'));
        b.classList.add('active'); draw(b.dataset.u);
      });
    },
    dow(sid, rows, host) {
      const d = A.dow(rows);
      host.innerHTML = head('Day of Week', '요일 · 시점 분석', '요일별 인입 집중도와 성약률.') +
        `<div class="an-grid an-g2">${card('요일별 인입', 'bar', box(cid(sid, 'bar')))}${card('요일별 성약률', 'rate', box(cid(sid, 'rate')))}</div>` +
        card('요일 상세', 'table', `<div id="${cid(sid, 'tbl')}"></div>`, null);
      A.barIBOB(cid(sid, 'bar'), d);
      A.rateBar(cid(sid, 'rate'), d, '#0d9488');
      A.dimTable(cid(sid, 'tbl'), d, { nameLabel: '요일', cols: [['name', '요일', 'l'], ['total', '인입', 'n'], ['conv', '성약', 'n'], ['rate', '성약률', 'r']] });
    },
    geo(sid, rows, host) {
      const dim = A.byDim(rows, '시도');
      host.innerHTML = head('Geography', '지역 분석', '시도 · 지역구 분포 (지역정보 보유 건 기준).') +
        `<div class="an-grid an-g2">${card('시도별 인입', 'bar', box(cid(sid, 'bar'), 'lg'))}${card('시도별 성약률', 'rate', box(cid(sid, 'rate'), 'lg'))}</div>` +
        card('지역 상세', 'table', `<div id="${cid(sid, 'tbl')}"></div>`);
      A.barIBOB(cid(sid, 'bar'), dim, { horizontal: true });
      A.rateBar(cid(sid, 'rate'), dim);
      A.dimTable(cid(sid, 'tbl'), dim, { nameLabel: '시도' });
    },
    size(sid, rows, host) {
      const seg = A.sizeSeg(rows), firm = A.byDim(rows, '기업구분');
      host.innerHTML = head('Company Size', '기업 규모 분석', '임직원 수 세그먼트 · 기업구분별 인입과 성약.') +
        `<div class="an-grid an-g2">${card('규모 세그먼트 인입', 'segment', box(cid(sid, 'seg')))}${card('세그먼트 성약률', 'rate', box(cid(sid, 'rate')))}</div>` +
        `<div class="an-grid an-g2">${card('기업구분 분포', 'donut', box(cid(sid, 'firm')))}${card('세그먼트 상세', 'table', `<div id="${cid(sid, 'tbl')}"></div>`)}</div>`;
      A.barIBOB(cid(sid, 'seg'), seg.map(s => ({ name: s.name, ib: s.total - s.conv, ob: 0, total: s.total })));
      A.rateBar(cid(sid, 'rate'), seg, '#d97706');
      A.doughnut(cid(sid, 'firm'), firm);
      A.dimTable(cid(sid, 'tbl'), seg, { nameLabel: '임직원', cols: [['name', '임직원 수', 'l'], ['total', '인입', 'n'], ['conv', '성약', 'n'], ['rate', '성약률', 'r']] });
    },
    aware(sid, rows, host) {
      const dim = A.byDim(rows, '인지채널');
      host.innerHTML = head('Awareness', '인지채널 (Paid · Owned · Earned)', '고객사가 벤디스를 어떻게 알게 됐는가 — 물량과 전환 효율의 균형.') +
        `<div class="an-grid an-g2">${card('채널별 인입', 'volume', box(cid(sid, 'bar'), 'lg'))}${card('채널별 성약률', 'efficiency', box(cid(sid, 'rate'), 'lg'))}</div>` +
        card('채널 효율 매트릭스', 'volume × rate', box(cid(sid, 'bub'), 'lg'), '좌상단(소량·고전환)은 확대 여지, 우하단(대량·저전환)은 효율 개선 대상') +
        card('인지채널 × 서비스', 'heatmap', `<div class="hm-wrap" id="${cid(sid, 'hm')}"></div>`);
      A.barIBOB(cid(sid, 'bar'), dim);
      A.rateBar(cid(sid, 'rate'), dim);
      A.bubble(cid(sid, 'bub'), dim);
      document.getElementById(cid(sid, 'hm')).innerHTML = A.heatHTML(A.crosstab(rows, '인지채널', '서비스 인입 구분', 8, 6));
    },
    inflow(sid, rows, host) {
      const utm = A.utmSource(rows), path = A.byDim(rows, '상세 경로');
      host.innerHTML = head('Inflow & Path', '유입 · 트래킹 경로', '유입구분(UTM source)과 상세 경로별 인입 · 전환을 분해.') +
        `<div class="an-grid an-g2">${card('유입경로(UTM) 분포', 'source', box(cid(sid, 'donut')))}${card('상세 경로별 인입', 'path', box(cid(sid, 'path')))}</div>` +
        card('UTM 경로 상세', 'table', `<div id="${cid(sid, 'tbl')}"></div>`);
      A.doughnut(cid(sid, 'donut'), utm);
      A.barIBOB(cid(sid, 'path'), path, { horizontal: true });
      A.dimTable(cid(sid, 'tbl'), utm, { nameLabel: 'UTM source' });
    },
    keyword(sid, rows, host) {
      const kw = A.keywords(rows);
      host.innerHTML = head('Keyword', '검색 키워드', '검색/블로그 유입 건에 기록된 키워드 (보유 건 기준).') +
        card('키워드 TOP', 'frequency', box(cid(sid, 'bar'), 'xl')) +
        card('키워드 상세', 'table', `<div id="${cid(sid, 'tbl')}"></div>`, kw.length ? null : '키워드 데이터가 없습니다.');
      A.barIBOB(cid(sid, 'bar'), kw.slice(0, 12), { horizontal: true });
      A.dimTable(cid(sid, 'tbl'), kw, { nameLabel: '키워드', cols: [['name', '키워드', 'l'], ['total', '인입', 'n'], ['conv', '성약', 'n'], ['rate', '성약률', 'r']] });
    },
    conv(sid, rows, host) {
      const k = A.kpi(rows), base = k.total || 1;
      const stages = [
        ['IB/OB 인입', k.total, 100, 'var(--blue)'],
        ['최초 협의', k.meet, Math.round(k.meet * 100 / base), 'var(--accent)'],
        ['계약 날인', k.sign, Math.round(k.sign * 100 / base), 'var(--amber)'],
        ['성약', k.conv, Math.round(k.conv * 100 / base), 'var(--green)']
      ];
      const funnel = `<div class="funnel">${stages.map(s => `<div class="stage"><div class="lbl">${s[0]}</div><div class="num-big">${fmt(s[1])}</div><div class="rate"><span class="num" style="color:${s[3]};font-weight:600;min-width:38px">${s[2]}%</span><span class="bar"><i style="width:${s[2]}%;background:${s[3]}"></i></span></div></div>`).join('')}</div>`;
      // 차원별 최고/최저 성약 구간
      const dims = [['서비스 인입 구분', '서비스'], ['인지채널', '인지채널'], ['시도', '지역'], ['기업구분', '기업규모']];
      const summary = dims.map(([key, lbl]) => {
        const d = A.byDim(rows, key).filter(x => x.total >= 3);
        if (!d.length) return '';
        const best = d.slice().sort((a, b) => b.rate - a.rate)[0];
        const worst = d.slice().sort((a, b) => a.rate - b.rate)[0];
        return `<tr><td>${esc(lbl)}</td><td><b>${esc(best.name)}</b> <span class="rate-pill">${best.rate}%</span> <span class="muted">(n=${best.total})</span></td><td><b>${esc(worst.name)}</b> <span class="rate-pill">${worst.rate}%</span> <span class="muted">(n=${worst.total})</span></td></tr>`;
      }).join('');
      host.innerHTML = head('Conversion', '성약(전환) 심층', '핵심 지표 성약률을 모든 차원으로 분해 — 어느 축에서 전환이 갈리는지.') +
        card('전환 퍼널', 'funnel', funnel, '인입 → 최초 협의 → 계약 날인 → 성약') +
        `<div class="an-grid an-g2">${card('서비스별 성약률', 'rank', box(cid(sid, 'svc')))}${card('월별 성약률 추이', 'trend', box(cid(sid, 'trend')))}</div>` +
        card('차원별 최고/최저 성약 구간', 'summary',
          `<table class="an-table"><thead><tr><th>차원</th><th>최고 성약 구간</th><th>최저 성약 구간</th></tr></thead><tbody>${summary}</tbody></table>`,
          '표본 n≥3 구간만 · 성약률 기준');
      A.rateBar(cid(sid, 'svc'), A.byDim(rows, '서비스 인입 구분'));
      A.mk_line_rate(cid(sid, 'trend'), A.series(rows, 'month'));
    },
    cross(sid, rows, host) {
      const opts = [
        ['aware-svc', '인지채널 × 서비스', '인지채널', '서비스 인입 구분'],
        ['svc-sido', '서비스 × 지역', '서비스 인입 구분', '시도'],
        ['aware-sido', '인지채널 × 지역', '인지채널', '시도'],
        ['sido-firm', '지역 × 기업규모', '시도', '기업구분'],
        ['svc-firm', '서비스 × 기업규모', '서비스 인입 구분', '기업구분']
      ];
      host.innerHTML = head('Cross-tab', '교차 히트맵', '두 차원의 교차 인입량을 색 농도로 표현.') +
        card('교차 분석', 'heatmap',
          `<div style="margin-bottom:12px"><span class="an-seg" id="${cid(sid, 'seg')}">${opts.map((o, i) => `<button data-x="${o[0]}" class="${i === 0 ? 'active' : ''}">${o[1]}</button>`).join('')}</span></div>` +
          `<div class="hm-wrap" id="${cid(sid, 'hm')}"></div>` +
          `<div class="hm-legend"><span>낮음</span>${A.HEAT.slice(1).map(c => `<span class="sw" style="background:${c}"></span>`).join('')}<span>높음</span></div>`);
      const draw = key => {
        const o = opts.find(x => x[0] === key);
        document.getElementById(cid(sid, 'hm')).innerHTML = A.heatHTML(A.crosstab(rows, o[2], o[3], 8, 8));
      };
      draw('aware-svc');
      host.querySelector('#' + cid(sid, 'seg')).addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        host.querySelectorAll('#' + cid(sid, 'seg') + ' button').forEach(x => x.classList.remove('active'));
        b.classList.add('active'); draw(b.dataset.x);
      });
    },
    explore(sid, rows, host) {
      host.innerHTML = head('Explore', '데이터 탐색', '필터 적용 결과 원본 레코드. 셀 클릭 · Ctrl+C 복사 · 더블클릭 상세.') +
        `<div class="an-card" style="padding:0">
          <div class="toolbar">
            <div class="left"><span style="font-size:13px;font-weight:600">인바운드 리스트</span><span class="chip" id="result-count">0건</span>
              <span class="text-[11.5px] muted" style="font-size:11.5px;color:var(--muted)">셀 클릭 · Ctrl+C 복사 · Shift+Space 행 · Ctrl+Space 열 · 더블클릭 상세</span></div>
            <div class="right"><button class="ghost-btn" id="${cid(sid, 'xls')}" title="엑셀 다운로드 (.xls)">⇩ 엑셀</button></div>
          </div>
          <div class="table-wrap">
            <table class="ibob-table" id="tbl"><colgroup id="cg"></colgroup><thead><tr id="th-row"></tr></thead><tbody id="rows"></tbody></table>
          </div>
        </div>`;
      if (window.IBOB) {
        IBOB.buildHeader();
        if (window.TableGrid) TableGrid.attach(document.getElementById('tbl'));
        IBOB.renderTable(rows.slice(0, 400));
        const tbody = document.getElementById('rows');
        tbody.querySelectorAll('tr').forEach((tr, i) => tr.addEventListener('dblclick', () => IBOB.openModal(rows[i])));
        const btn = document.getElementById(cid(sid, 'xls'));
        if (btn && window.TableGrid) btn.addEventListener('click', () => {
          const d = new Date(); const f = 'ibob_분석_' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '.xls';
          TableGrid.exportExcelFromTable(document.getElementById('tbl'), f);
        });
      }
    }
  };

  // 월별 성약률 단일 라인
  A.mk_line_rate = function (id, data) {
    A.theme();
    const el = document.getElementById(id); if (!el) return;
    if (A.charts[id]) A.charts[id].destroy();
    A.charts[id] = new Chart(el.getContext('2d'), {
      type: 'line',
      data: { labels: data.map(d => d.key), datasets: [{ label: '성약률(%)', data: data.map(d => d.rate), borderColor: '#6d4eff', backgroundColor: 'rgba(109,78,255,.12)', fill: true, tension: .35, pointRadius: 2 }] },
      options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: '#e2e5ec' }, ticks: { callback: v => v + '%' }, min: 0 } } }
    });
  };

  function render(sid, rows, host) {
    const fn = B[sid]; if (!fn) { host.innerHTML = '<div class="empty">준비 중</div>'; return; }
    fn(sid, rows, host);
  }

  return { LIST, flat, meta, render };
})();
