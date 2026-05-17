/**
 * 블로그 상세보기 드로어 — 읽기 전용 공유 모듈
 *
 * 사용:
 *   MktDrawer.init();                                  // CSS/DOM 1회 주입
 *   MktDrawer.open(row, { editHref: '../?postid=p1' }); // 편집은 블로그 페이지로 위임
 *
 * 의존: window.MktProxy (blogInboundDates 호출), 페이지에 fmt/fmtDate 가 없을 수도 있어
 *       유틸은 모듈 내부에서 자체 보유.
 */
(function () {
  let _initialized = false;

  function fmt(n){ const v = Number(n); return isFinite(v) ? v.toLocaleString('ko-KR') : '-'; }
  function fmtDate(s){
    if (!s) return '-';
    const t = String(s).slice(0,10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return t || '-';
    return t;
  }
  function escAttr(s){ return String(s == null ? '' : s).replace(/[&"<>]/g, function(c){ return ({'&':'&amp;','"':'&quot;','<':'&lt;','>':'&gt;'})[c]; }); }
  function escHtml(s){ return String(s == null ? '' : s).replace(/[&<>]/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;'})[c]; }); }

  const CSS = `
.mdrw-overlay{ position:fixed; inset:0; background:rgba(15,23,42,.30); backdrop-filter:blur(3px); z-index:190; opacity:0; pointer-events:none; transition:opacity .22s ease; }
.mdrw-overlay.open{ opacity:1; pointer-events:auto; }
.mdrw{ position:fixed; right:0; top:0; bottom:0; width:480px; max-width:92vw; background:var(--panel); border-left:1px solid var(--line); z-index:200; transform:translateX(100%); transition:transform .28s cubic-bezier(.2,.8,.2,1); display:flex; flex-direction:column; box-shadow:-8px 0 32px rgba(15,23,42,.15); }
.mdrw.open{ transform:translateX(0); }
.mdrw-head{ padding:14px 18px; border-bottom:1px solid var(--line); display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
.mdrw-head .eyebrow{ font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; }
.mdrw-close{ width:30px; height:30px; border-radius:7px; background:var(--panel-2); border:1px solid var(--line); color:var(--muted); cursor:pointer; display:inline-flex; align-items:center; justify-content:center; font-size:13px; }
.mdrw-close:hover{ color:var(--accent); border-color:var(--accent); }
.mdrw-body{ flex:1; overflow-y:auto; }
.mdrw-foot{ padding:14px 18px; border-top:1px solid var(--line); display:flex; gap:8px; justify-content:flex-end; flex-shrink:0; }
.mdrw-foot .btn-secondary{ background:transparent; border:1px solid var(--line); color:var(--text-2); padding:8px 14px; border-radius:8px; font-size:12.5px; cursor:pointer; text-decoration:none; }
.mdrw-foot .btn-secondary:hover{ border-color:var(--accent-2); color:var(--accent); }
.mdrw-foot .btn-primary{ background:var(--accent); border:0; color:#fff; padding:8px 14px; border-radius:8px; font-size:12.5px; cursor:pointer; font-weight:500; text-decoration:none; display:inline-flex; align-items:center; }
.mdrw-foot .btn-primary:hover{ background:var(--accent-2); }
.mdrw-head-block{ padding:18px 18px 12px; }
.mdrw-head-block .row1{ display:flex; gap:12px; align-items:flex-start; }
.mdrw-head-block .thumb{ width:80px; height:60px; border-radius:8px; background:var(--panel-2); flex-shrink:0; overflow:hidden; }
.mdrw-head-block .thumb img{ width:100%; height:100%; object-fit:cover; display:block; }
.mdrw-head-block .info{ min-width:0; flex:1; }
.mdrw-head-block .info .ttl{ font-size:14.5px; font-weight:600; line-height:1.4; margin:0 0 5px; color:var(--text); }
.mdrw-head-block .info .meta{ font-size:11.5px; color:var(--muted); display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
.mdrw-head-block .info .meta .num{ font-family:'JetBrains Mono', monospace; }
.mdrw-tags{ display:flex; gap:6px; padding:4px 18px 0; }
.mdrw-tags .svc{ font-size:11px; padding:2px 8px; border-radius:4px; background:rgba(78,163,255,.10); color:var(--blue); border:1px solid rgba(78,163,255,.25); }
.mdrw-tags .cat{ font-size:11px; padding:2px 8px; border-radius:4px; background:rgba(109,78,255,.10); color:var(--accent); border:1px solid rgba(109,78,255,.25); }
.mdrw-tags [hidden]{ display:none; }
.mdrw-kpi{ display:grid; grid-template-columns:repeat(2, 1fr); gap:8px; padding:14px 18px; }
.mdrw-kpi .c{ background:var(--panel-2); border:1px solid var(--line); border-radius:8px; padding:12px; }
.mdrw-kpi .c .l{ font-size:11px; color:var(--muted); }
.mdrw-kpi .c .v{ font-size:18px; font-weight:600; margin-top:2px; font-family:'JetBrains Mono', monospace; color:var(--text); }
.mdrw-section{ padding:14px 18px; border-top:1px solid var(--line); }
.mdrw-section .section-h{ font-size:11.5px; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; margin:0 0 8px; }
.mdrw-section .body{ font-size:12.5px; color:var(--text-2); line-height:1.6; }
.mdrw-stub{ font-size:11.5px; color:var(--muted); padding:14px; background:var(--panel-2); border-radius:8px; border:1px dashed var(--line-2); text-align:center; }
.mdrw-inbound-wrap{ background:var(--panel-2); border:1px solid var(--line-2); border-radius:8px; max-height:220px; overflow-y:auto; }
.mdrw-inbound-item{ padding:9px 12px; border-bottom:1px solid var(--line); display:flex; flex-direction:column; gap:3px; }
.mdrw-inbound-item:last-child{ border-bottom:0; }
.mdrw-inbound-item .iro1{ display:flex; align-items:center; justify-content:space-between; gap:8px; }
.mdrw-inbound-item .iro1 .dt{ font-family:'JetBrains Mono', monospace; font-size:11.5px; color:var(--text); }
.mdrw-inbound-item .iro1 .svc{ font-size:10.5px; padding:1px 6px; border-radius:4px; background:rgba(78,163,255,.10); color:var(--blue); border:1px solid rgba(78,163,255,.25); }
.mdrw-inbound-item .iro2{ font-size:11.5px; color:var(--text-2); }
.mdrw-inbound-item .iro2 .mgr{ color:var(--muted); }
.mdrw-inbound-summary{ padding:8px 12px; border-bottom:1px solid var(--line); font-size:11px; color:var(--muted); display:flex; justify-content:space-between; }
.mdrw-inbound-summary .num{ color:var(--accent); font-family:'JetBrains Mono', monospace; font-weight:600; }
.mdrw-meta{ padding:14px 18px 18px; border-top:1px solid var(--line); }
.mdrw-meta .section-h{ font-size:11.5px; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; margin:0 0 8px; }
.mdrw-meta-item{ display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--line); font-size:12.5px; }
.mdrw-meta-item:last-child{ border-bottom:0; }
.mdrw-meta-item .k{ color:var(--muted); }
.mdrw-meta-item .v{ color:var(--text); font-family:'JetBrains Mono', monospace; }
`;

  const HTML = `
<div class="mdrw-overlay" id="mdrw-overlay"></div>
<aside class="mdrw" id="mdrw" role="dialog" aria-modal="true" aria-hidden="true">
  <div class="mdrw-head">
    <div class="eyebrow">상세보기</div>
    <button class="mdrw-close" id="mdrw-close" aria-label="닫기">✕</button>
  </div>
  <div class="mdrw-body">
    <div class="mdrw-head-block">
      <div class="row1">
        <div class="thumb"><img id="mdrw-thumb" alt="" referrerpolicy="no-referrer" onerror="this.style.display='none'"/></div>
        <div class="info">
          <div class="ttl" id="mdrw-title">-</div>
          <div class="meta">
            <span id="mdrw-date">-</span>
            <span>·</span>
            <span class="num" id="mdrw-postid">-</span>
          </div>
        </div>
      </div>
    </div>
    <div class="mdrw-tags">
      <span class="svc" id="mdrw-svc" hidden></span>
      <span class="cat" id="mdrw-cat" hidden></span>
    </div>
    <div class="mdrw-kpi">
      <div class="c"><div class="l">총 방문</div><div class="v" id="mdrw-total">-</div></div>
      <div class="c"><div class="l">주간 방문</div><div class="v" id="mdrw-weekly">-</div></div>
      <div class="c"><div class="l">월간 방문</div><div class="v" id="mdrw-monthly">-</div></div>
      <div class="c"><div class="l">인바운드</div><div class="v" id="mdrw-inbound" style="color:var(--green)">-</div></div>
    </div>
    <div class="mdrw-section">
      <div class="section-h">본문 요약</div>
      <div class="body" id="mdrw-summary">-</div>
    </div>
    <div class="mdrw-section">
      <div class="section-h">인바운드 인입 날짜 <span style="font-weight:400; color:var(--muted); margin-left:4px;" id="mdrw-inbound-count"></span></div>
      <div id="mdrw-inbound-list"><div class="mdrw-stub">utm_term 정보가 필요합니다.</div></div>
    </div>
    <div class="mdrw-meta">
      <div class="section-h">메타데이터</div>
      <div class="mdrw-meta-item"><span class="k">postid</span><span class="v" id="mdrw-meta-postid">-</span></div>
      <div class="mdrw-meta-item"><span class="k">service</span><span class="v" id="mdrw-meta-svc">-</span></div>
      <div class="mdrw-meta-item"><span class="k">category</span><span class="v" id="mdrw-meta-cat">-</span></div>
      <div class="mdrw-meta-item"><span class="k">utm_term</span><span class="v" id="mdrw-meta-utm">-</span></div>
      <div class="mdrw-meta-item"><span class="k">발행일</span><span class="v" id="mdrw-meta-date">-</span></div>
    </div>
  </div>
  <div class="mdrw-foot">
    <a class="btn-secondary" id="mdrw-link" target="_blank" rel="noopener noreferrer">원문 열기 ↗</a>
    <a class="btn-primary" id="mdrw-edit-link" href="#">블로그에서 편집 →</a>
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

    $id('mdrw-close').addEventListener('click', close);
    $id('mdrw-overlay').addEventListener('click', close);
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && $id('mdrw').classList.contains('open')) close();
    });
    _initialized = true;
  }

  function setText(id, v){ const el = $id(id); if (el) el.textContent = (v == null || v === '') ? '-' : v; }
  function showTag(id, v){
    const el = $id(id); if (!el) return;
    if (v){ el.textContent = v; el.hidden = false; } else { el.hidden = true; }
  }

  async function loadInboundDates(utm_term){
    const target = $id('mdrw-inbound-list');
    const counter = $id('mdrw-inbound-count');
    counter.textContent = '';
    if (!utm_term){
      target.innerHTML = '<div class="mdrw-stub">utm_term 정보가 없어 매칭할 수 없습니다.</div>';
      return;
    }
    if (!window.MktProxy || !window.MktProxy.getUrl || !window.MktProxy.getUrl()){
      target.innerHTML = '<div class="mdrw-stub">프록시 미연결 — 연결 후 자동 표시</div>';
      return;
    }
    target.innerHTML = '<div class="mdrw-stub">불러오는 중...</div>';
    try{
      const data = await window.MktProxy.blogInboundDates(utm_term);
      if (!data || !data.count){
        target.innerHTML = '<div class="mdrw-stub">매칭되는 인바운드 없음 (utm_term: ' + escAttr(utm_term) + ')</div>';
        return;
      }
      counter.textContent = '· ' + data.count + '건';
      let html = '<div class="mdrw-inbound-wrap">';
      html += '<div class="mdrw-inbound-summary"><span>매칭 utm_term: <code style="font-family:JetBrains Mono,monospace;color:var(--text-2);">'+escHtml(utm_term)+'</code></span><span><span class="num">'+data.count+'</span>건 인입</span></div>';
      (data.items || []).forEach(function(it){
        html += '<div class="mdrw-inbound-item">'
          + '<div class="iro1">'
            + '<span class="dt">'+ escHtml(it.datetime || it.date || '-') +'</span>'
            + (it.service ? '<span class="svc">'+escHtml(it.service)+'</span>' : '')
          + '</div>'
          + '<div class="iro2">'+ escHtml(it.company || '-') + (it.manager ? ' <span class="mgr">· '+escHtml(it.manager)+'</span>' : '') +'</div>'
        + '</div>';
      });
      html += '</div>';
      target.innerHTML = html;
    }catch(err){
      target.innerHTML = '<div class="mdrw-stub" style="color:var(--red);">불러오기 실패: '+ escHtml(err.message) +'</div>';
    }
  }

  function open(row, options){
    if (!row) return;
    init();
    options = options || {};

    const thumb = $id('mdrw-thumb');
    if (row.thumbnail){ thumb.src = row.thumbnail; thumb.style.display = ''; }
    else { thumb.removeAttribute('src'); thumb.style.display = 'none'; }
    setText('mdrw-title', row['제목'] || '-');
    setText('mdrw-date', fmtDate(row['날짜']));
    setText('mdrw-postid', row.postid || '-');
    showTag('mdrw-svc', row.service);
    showTag('mdrw-cat', row.category);
    setText('mdrw-total',   fmt(row.totalVisit));
    setText('mdrw-weekly',  fmt(row.weeklyVisitor));
    setText('mdrw-monthly', fmt(row.monthlyVisitor));
    setText('mdrw-inbound', fmt(row.inbound));
    setText('mdrw-summary', row['본문요약'] || row.summary || '본문 요약이 없습니다.');
    setText('mdrw-meta-postid', row.postid || '-');
    setText('mdrw-meta-svc',    row.service || '-');
    setText('mdrw-meta-cat',    row.category || '-');
    setText('mdrw-meta-utm',    row.utm_term || '-');
    setText('mdrw-meta-date',   fmtDate(row['날짜']));

    const link = $id('mdrw-link');
    if (row['링크']){ link.href = row['링크']; link.style.pointerEvents = ''; link.style.opacity = ''; }
    else { link.removeAttribute('href'); link.style.pointerEvents = 'none'; link.style.opacity = '.4'; }

    const editLink = $id('mdrw-edit-link');
    if (options.editHref){
      editLink.href = options.editHref;
      editLink.style.display = '';
    } else {
      editLink.style.display = 'none';
    }

    $id('mdrw').classList.add('open');
    $id('mdrw-overlay').classList.add('open');
    $id('mdrw').setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    loadInboundDates(row.utm_term);
  }

  function close(){
    if (!_initialized) return;
    $id('mdrw').classList.remove('open');
    $id('mdrw-overlay').classList.remove('open');
    $id('mdrw').setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  window.MktDrawer = { init: init, open: open, close: close };
})();
