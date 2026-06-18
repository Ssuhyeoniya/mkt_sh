/**
 * IB/OB 상세보기 드로어 — 블로그 _detail-drawer.js 와 동일 패턴
 *
 * 사용:
 *   MktIbobDrawer.init();
 *   MktIbobDrawer.open(row);
 */
(function () {
  let _initialized = false;
  const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1evHT_QWJ7tHuCykdW4Hh1bIN7CQpw-G2bdUFtL4yP40/edit';

  function fmt(n){ const v = Number(n); return isFinite(v) ? v.toLocaleString('ko-KR') : '-'; }
  function fmtDate(s){
    if (!s) return '-';
    const t = String(s).slice(0,10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return t || '-';
    return t;
  }
  function diffDays(a, b){
    if (!a || !b) return null;
    const da = new Date(String(a).slice(0,10));
    const db = new Date(String(b).slice(0,10));
    if (isNaN(da) || isNaN(db)) return null;
    return Math.round((db - da) / 86400000);
  }
  function escAttr(s){ return String(s == null ? '' : s).replace(/[&"<>]/g, function(c){ return ({'&':'&amp;','"':'&quot;','<':'&lt;','>':'&gt;'})[c]; }); }
  function escHtml(s){ return String(s == null ? '' : s).replace(/[&<>]/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;'})[c]; }); }

  const CSS = `
.ibdrw-overlay{ position:fixed; inset:0; background:rgba(15,23,42,.30); backdrop-filter:blur(3px); z-index:190; opacity:0; pointer-events:none; transition:opacity .22s ease; }
.ibdrw-overlay.open{ opacity:1; pointer-events:auto; }
.ibdrw{ position:fixed; right:0; top:0; bottom:0; width:480px; max-width:92vw; background:var(--panel); border-left:1px solid var(--line); z-index:200; transform:translateX(100%); transition:transform .28s cubic-bezier(.2,.8,.2,1); display:flex; flex-direction:column; box-shadow:-8px 0 32px rgba(15,23,42,.15); }
.ibdrw.open{ transform:translateX(0); }
.ibdrw-head{ padding:14px 18px; border-bottom:1px solid var(--line); display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
.ibdrw-head .eyebrow{ font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; }
.ibdrw-close{ width:30px; height:30px; border-radius:7px; background:var(--panel-2); border:1px solid var(--line); color:var(--muted); cursor:pointer; display:inline-flex; align-items:center; justify-content:center; font-size:13px; }
.ibdrw-close:hover{ color:var(--accent); border-color:var(--accent); }
.ibdrw-body{ flex:1; overflow-y:auto; }
.ibdrw-foot{ padding:14px 18px; border-top:1px solid var(--line); display:flex; gap:8px; justify-content:flex-end; flex-shrink:0; }
.ibdrw-foot .btn-secondary{ background:transparent; border:1px solid var(--line); color:var(--text-2); padding:8px 14px; border-radius:8px; font-size:12.5px; cursor:pointer; text-decoration:none; }
.ibdrw-foot .btn-secondary:hover{ border-color:var(--accent-2); color:var(--accent); }
.ibdrw-foot .btn-primary{ background:var(--accent); border:0; color:#fff; padding:8px 14px; border-radius:8px; font-size:12.5px; cursor:pointer; font-weight:500; text-decoration:none; display:inline-flex; align-items:center; }
.ibdrw-foot .btn-primary:hover{ background:var(--accent-2); }
.ibdrw-head-block{ padding:18px 18px 12px; }
.ibdrw-head-block .ttl{ font-size:15px; font-weight:600; line-height:1.4; margin:0 0 6px; color:var(--text); }
.ibdrw-head-block .meta{ font-size:11.5px; color:var(--muted); display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
.ibdrw-head-block .meta .num{ font-family:'JetBrains Mono', monospace; }
.ibdrw-tags{ display:flex; gap:6px; padding:4px 18px 0; flex-wrap:wrap; }
.ibdrw-tags .t{ font-size:11px; padding:2px 8px; border-radius:4px; border:1px solid var(--line); color:var(--text-2); background:var(--panel-2); }
.ibdrw-tags .t-ib{   background:rgba(37,99,235,.08);  color:#1e4cc4; border-color:rgba(37,99,235,.25); }
.ibdrw-tags .t-ob{   background:rgba(13,148,136,.10); color:#0d6e66; border-color:rgba(13,148,136,.28); }
.ibdrw-tags .t-y{    background:rgba(22,163,74,.10);  color:#15803d; border-color:rgba(22,163,74,.28); }
.ibdrw-tags .t-mid{  background:rgba(217,119,6,.10);  color:#a16207; border-color:rgba(217,119,6,.28); }
.ibdrw-tags .t-drop{ background:rgba(220,38,38,.08);  color:#b91c1c; border-color:rgba(220,38,38,.28); }
.ibdrw-tags .t-svc{  background:rgba(109,78,255,.10); color:#5b3fd9; border-color:rgba(109,78,255,.25); }
.ibdrw-tags [hidden]{ display:none; }
.ibdrw-kpi{ display:grid; grid-template-columns:repeat(2, 1fr); gap:8px; padding:14px 18px; }
.ibdrw-kpi .c{ background:var(--panel-2); border:1px solid var(--line); border-radius:8px; padding:12px; }
.ibdrw-kpi .c .l{ font-size:11px; color:var(--muted); }
.ibdrw-kpi .c .v{ font-size:16px; font-weight:600; margin-top:3px; font-family:'JetBrains Mono', monospace; color:var(--text); word-break:break-all; }
.ibdrw-kpi .c .v.sm{ font-size:13.5px; }
.ibdrw-kpi .c .sub{ font-size:10.5px; color:var(--muted); margin-top:2px; }
.ibdrw-section{ padding:14px 18px; border-top:1px solid var(--line); }
.ibdrw-section .section-h{ font-size:11.5px; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; margin:0 0 8px; }
.ibdrw-section .body{ font-size:12.5px; color:var(--text-2); line-height:1.6; word-break:break-word; }
.ibdrw-row{ display:flex; gap:12px; padding:7px 0; font-size:12.5px; border-bottom:1px dashed var(--line); }
.ibdrw-row:last-child{ border-bottom:0; }
.ibdrw-row .k{ width:96px; color:var(--muted); flex-shrink:0; }
.ibdrw-row .v{ color:var(--text); flex:1; word-break:break-word; }
.ibdrw-row .v.mono{ font-family:'JetBrains Mono', monospace; font-size:11.5px; }
.ibdrw-meta{ padding:14px 18px 18px; border-top:1px solid var(--line); }
.ibdrw-meta .section-h{ font-size:11.5px; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; margin:0 0 8px; }
.ibdrw-meta-item{ display:flex; justify-content:space-between; gap:10px; padding:7px 0; border-bottom:1px solid var(--line); font-size:12px; }
.ibdrw-meta-item:last-child{ border-bottom:0; }
.ibdrw-meta-item .k{ color:var(--muted); flex-shrink:0; }
.ibdrw-meta-item .v{ color:var(--text); font-family:'JetBrains Mono', monospace; text-align:right; word-break:break-all; }
`;

  const HTML = `
<div class="ibdrw-overlay" id="ibdrw-overlay"></div>
<aside class="ibdrw" id="ibdrw" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="ibdrw-title">
  <div class="ibdrw-head">
    <div class="eyebrow">고객사 상세 · 인바운드 통합 v2</div>
    <button class="ibdrw-close" id="ibdrw-close" aria-label="닫기">✕</button>
  </div>
  <div class="ibdrw-body">
    <div class="ibdrw-head-block">
      <div class="ttl" id="ibdrw-title">-</div>
      <div class="meta">
        <span id="ibdrw-week" class="num">-</span>
        <span>·</span>
        <span id="ibdrw-sales">담당: -</span>
        <span>·</span>
        <span id="ibdrw-region">-</span>
      </div>
    </div>
    <div class="ibdrw-tags">
      <span class="t" id="ibdrw-ch" hidden></span>
      <span class="t" id="ibdrw-status" hidden></span>
      <span class="t" id="ibdrw-firm" hidden></span>
      <span class="t" id="ibdrw-grade" hidden></span>
      <span class="t" id="ibdrw-listed" hidden></span>
      <span class="t t-svc" id="ibdrw-svc" hidden></span>
    </div>
    <div class="ibdrw-kpi">
      <div class="c"><div class="l">임직원 수</div><div class="v" id="ibdrw-emp">-</div></div>
      <div class="c"><div class="l">IB 인입 일자</div><div class="v sm" id="ibdrw-ibdate">-</div></div>
      <div class="c"><div class="l">최초 협의 일자</div><div class="v sm" id="ibdrw-meetdate">-</div><div class="sub" id="ibdrw-meetdiff"></div></div>
      <div class="c"><div class="l">계약 날인 일자</div><div class="v sm" id="ibdrw-signdate">-</div><div class="sub" id="ibdrw-signdiff"></div></div>
    </div>

    <div class="ibdrw-section">
      <div class="section-h">주소</div>
      <div class="body" id="ibdrw-address">-</div>
    </div>

    <div class="ibdrw-section">
      <div class="section-h">인지 · 검색</div>
      <div class="ibdrw-row"><span class="k">인지채널</span><span class="v" id="ibdrw-aware">-</span></div>
      <div class="ibdrw-row"><span class="k">검색 키워드</span><span class="v mono" id="ibdrw-keyword">-</span></div>
      <div class="ibdrw-row"><span class="k">인터뷰 기반</span><span class="v" id="ibdrw-interview">-</span></div>
    </div>

    <div class="ibdrw-section">
      <div class="section-h">유입 트래킹</div>
      <div class="ibdrw-row"><span class="k">서비스 인입</span><span class="v" id="ibdrw-svc-row">-</span></div>
      <div class="ibdrw-row"><span class="k">상세 경로</span><span class="v" id="ibdrw-path">-</span></div>
      <div class="ibdrw-row"><span class="k">UTM</span><span class="v mono" id="ibdrw-utm">-</span></div>
    </div>

    <div class="ibdrw-section">
      <div class="section-h">문의내용 · 세일즈맵</div>
      <div class="body" id="ibdrw-message">-</div>
    </div>

    <div class="ibdrw-section">
      <div class="section-h">사업자 정보</div>
      <div class="ibdrw-row"><span class="k">업종</span><span class="v" id="ibdrw-industry">-</span></div>
      <div class="ibdrw-row"><span class="k">업태</span><span class="v" id="ibdrw-bizcond">-</span></div>
      <div class="ibdrw-row"><span class="k">기업규모</span><span class="v" id="ibdrw-scale">-</span></div>
      <div class="ibdrw-row"><span class="k">법인구분</span><span class="v" id="ibdrw-corptype">-</span></div>
      <div class="ibdrw-row"><span class="k">사업자등록번호</span><span class="v mono" id="ibdrw-bizno">-</span></div>
      <div class="ibdrw-row"><span class="k">법인등록번호</span><span class="v mono" id="ibdrw-corpno">-</span></div>
      <div class="ibdrw-row"><span class="k">등록일자</span><span class="v mono" id="ibdrw-regdate">-</span></div>
    </div>

    <div class="ibdrw-section">
      <div class="section-h">기간</div>
      <div class="ibdrw-row"><span class="k">주차</span><span class="v mono" id="ibdrw-week2">-</span></div>
      <div class="ibdrw-row"><span class="k">시작일</span><span class="v mono" id="ibdrw-startdt">-</span></div>
      <div class="ibdrw-row"><span class="k">종료일</span><span class="v mono" id="ibdrw-enddt">-</span></div>
    </div>

    <div class="ibdrw-meta">
      <div class="section-h">원본 필드 전체</div>
      <div id="ibdrw-meta-list"></div>
    </div>
  </div>
  <div class="ibdrw-foot">
    <a class="btn-secondary" id="ibdrw-sheet-link" target="_blank" rel="noopener noreferrer">시트 열기 ↗</a>
    <button class="btn-primary" id="ibdrw-close-btn">닫기</button>
  </div>
</aside>
`;

  function $id(id){ return document.getElementById(id); }

  function init(){
    if (_initialized) return;
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    const wrap = document.createElement('div');
    wrap.innerHTML = HTML;
    while (wrap.firstChild) document.body.appendChild(wrap.firstChild);

    $id('ibdrw-close').addEventListener('click', close);
    $id('ibdrw-close-btn').addEventListener('click', close);
    $id('ibdrw-overlay').addEventListener('click', close);
    $id('ibdrw-sheet-link').setAttribute('href', SHEET_URL);
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && $id('ibdrw').classList.contains('open')) close();
    });
    _initialized = true;
  }

  function setText(id, v){ const el = $id(id); if (el) el.textContent = (v == null || v === '') ? '-' : v; }
  function showTag(id, v, cls){
    const el = $id(id); if (!el) return;
    if (v){
      el.textContent = v;
      el.hidden = false;
      el.className = 't' + (cls ? ' ' + cls : '');
    } else {
      el.hidden = true;
    }
  }

  function statusInfo(v){
    const s = String(v||'').trim();
    if (s === 'Y' || s === '성약') return { label:'성약', cls:'t-y' };
    if (s === '협의중') return { label:'협의중', cls:'t-mid' };
    if (s === '드롭')   return { label:'드롭', cls:'t-drop' };
    if (s === '무응답') return { label:'무응답', cls:'' };
    return { label:s, cls:'' };
  }

  function open(row){
    if (!row) return;
    init();

    setText('ibdrw-title', row['고객사명'] || '(이름 없음)');
    setText('ibdrw-week', row['주차'] || '-');
    setText('ibdrw-sales', '담당: ' + (row['영업대장'] || '-'));
    const region = [row['시도'], row['지역구'], row['동리']].filter(Boolean).join(' · ');
    setText('ibdrw-region', region || '-');

    const convRaw = row['성약'];
    const isConv = convRaw === true || convRaw === 1 || /^(y|yes|true|성약|o|1)$/i.test(String(convRaw == null ? '' : convRaw).trim());
    showTag('ibdrw-ch', '성약 ' + (isConv ? 'Y' : 'N'), isConv ? 't-y' : '');
    const st = statusInfo(row['성약']);
    showTag('ibdrw-status', st.label || null, st.cls);
    showTag('ibdrw-firm',   row['기업구분'] || null, '');
    showTag('ibdrw-grade',  row['고객사 분류'] ? '등급 ' + row['고객사 분류'] : null, '');
    showTag('ibdrw-listed', row['상장 여부'] || null, '');
    showTag('ibdrw-svc',    row['서비스 인입 구분'] || null, 't-svc');

    setText('ibdrw-emp', fmt(row['임직원 수']) + (row['임직원 수'] ? ' 명' : ''));
    setText('ibdrw-ibdate',   fmtDate(row['IB 인입 일자']));
    setText('ibdrw-meetdate', fmtDate(row['최초 협의 일자']));
    setText('ibdrw-signdate', fmtDate(row['계약서 날인 일자']));
    const d1 = diffDays(row['IB 인입 일자'], row['최초 협의 일자']);
    const d2 = diffDays(row['IB 인입 일자'], row['계약서 날인 일자']);
    setText('ibdrw-meetdiff', d1 == null ? '' : ('IB 인입 +' + d1 + '일'));
    setText('ibdrw-signdiff', d2 == null ? '' : ('IB 인입 +' + d2 + '일'));

    setText('ibdrw-address',  row['주소']);
    setText('ibdrw-aware',    row['인지채널']);
    setText('ibdrw-keyword',  row['검색 키워드']);
    setText('ibdrw-interview',row['인터뷰 기반']);
    setText('ibdrw-svc-row',  row['서비스 인입 구분']);
    setText('ibdrw-path',     row['상세 경로']);
    setText('ibdrw-utm',      row['트래킹 경로(UTM)']);
    setText('ibdrw-message',  row['문의내용']);
    setText('ibdrw-industry', row['업종']);
    setText('ibdrw-bizcond',  row['업태']);
    setText('ibdrw-scale',    row['기업규모']);
    setText('ibdrw-corptype', row['법인구분']);
    setText('ibdrw-bizno',    row['사업자등록번호']);
    setText('ibdrw-corpno',   row['법인등록번호']);
    setText('ibdrw-regdate',  fmtDate(row['등록일자']));
    setText('ibdrw-week2',    row['주차']);
    setText('ibdrw-startdt',  fmtDate(row['시작일']));
    setText('ibdrw-enddt',    fmtDate(row['종료일']));

    const allCols = (window.IBOB_ALL_COLS || []);
    $id('ibdrw-meta-list').innerHTML = allCols.map(function(k){
      const v = row[k];
      return '<div class="ibdrw-meta-item"><span class="k">'+escHtml(k)+'</span><span class="v">'+escHtml(v == null || v === '' ? '-' : v)+'</span></div>';
    }).join('');

    $id('ibdrw').classList.add('open');
    $id('ibdrw-overlay').classList.add('open');
    $id('ibdrw').setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function close(){
    if (!_initialized) return;
    $id('ibdrw').classList.remove('open');
    $id('ibdrw-overlay').classList.remove('open');
    $id('ibdrw').setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  window.MktIbobDrawer = { init: init, open: open, close: close };
})();
