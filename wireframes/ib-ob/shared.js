/* IB/OB 종합 페이지 공용 로직 (테이블 · 모달 · 필터) */
(function(){
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function fmt(n){ const v = Number(n); return isFinite(v) ? v.toLocaleString('ko-KR') : (n||'-'); }
  function statusTag(v){
    const s = String(v||'').trim();
    if (s === 'Y' || s === '성약') return `<span class="tag-mini tag-y">성약</span>`;
    if (s === '협의중') return `<span class="tag-mini tag-mid">협의중</span>`;
    if (s === '드롭')   return `<span class="tag-mini tag-drop">드롭</span>`;
    if (s === '무응답') return `<span class="tag-mini tag-none">무응답</span>`;
    if (!s) return '<span class="muted">-</span>';
    return `<span class="tag-mini tag-none">${esc(s)}</span>`;
  }
  function channelTag(v){
    const s = String(v||'').trim();
    if (!s) return '<span class="muted">-</span>';
    return `<span class="tag-mini tag-ch">${esc(s)}</span>`;
  }
  function chTag(v){
    const s = String(v||'').trim().toUpperCase();
    if (s === 'IB') return `<span class="tag-mini tag-ib">IB</span>`;
    if (s === 'OB') return `<span class="tag-mini tag-ob">OB</span>`;
    if (!s) return '<span class="muted">-</span>';
    return `<span class="tag-mini tag-none">${esc(s)}</span>`;
  }

  const W_KEY = 'ibob_col_widths_v1';
  function loadWidths(){ try { return JSON.parse(localStorage.getItem(W_KEY)||'{}'); } catch(_){ return {}; } }
  function saveWidths(){
    const obj = {};
    document.querySelectorAll('#cg col').forEach((c,i) => { obj[window.IBOB_ROW_COLS[i].key] = Math.round(c.getBoundingClientRect().width); });
    try { localStorage.setItem(W_KEY, JSON.stringify(obj)); } catch(_){}
  }
  function resetWidths(){
    try { localStorage.removeItem(W_KEY); } catch(_){}
    document.querySelectorAll('#cg col').forEach((c,i)=>{ c.style.width = window.IBOB_ROW_COLS[i].w + 'px'; });
  }

  function buildHeader(){
    const cg = document.getElementById('cg');
    const th = document.getElementById('th-row');
    const saved = loadWidths();
    cg.innerHTML = window.IBOB_ROW_COLS.map((c,i) => `<col data-i="${i}" style="width:${(saved[c.key]||c.w)}px"/>`).join('');
    th.innerHTML = window.IBOB_ROW_COLS.map((c,i) => {
      const align = c.align === 'right' ? 'right' : (c.align === 'center' ? 'center' : 'left');
      return `<th data-i="${i}" style="text-align:${align}">${esc(c.label)}<span class="resizer" data-i="${i}"></span></th>`;
    }).join('');
    document.querySelectorAll('#th-row .resizer').forEach(h => {
      h.addEventListener('mousedown', startResize);
    });
  }
  let resizeState = null;
  function startResize(e){
    e.preventDefault();
    const i = Number(e.target.dataset.i);
    const col = document.querySelectorAll('#cg col')[i];
    resizeState = { col, startX: e.clientX, startW: col.getBoundingClientRect().width };
    e.target.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', onResize);
    window.addEventListener('mouseup', endResize);
  }
  function onResize(e){
    if (!resizeState) return;
    const w = Math.max(24, resizeState.startW + (e.clientX - resizeState.startX));
    resizeState.col.style.width = w + 'px';
  }
  function endResize(){
    if (!resizeState) return;
    document.querySelectorAll('#th-row .resizer.dragging').forEach(el=>el.classList.remove('dragging'));
    document.body.style.cursor = '';
    saveWidths();
    resizeState = null;
    window.removeEventListener('mousemove', onResize);
    window.removeEventListener('mouseup', endResize);
  }

  function renderTable(rows){
    const tbody = document.getElementById('rows');
    const cnt = document.getElementById('result-count');
    if (cnt) cnt.textContent = rows.length + '건';
    if (!rows.length){
      tbody.innerHTML = `<tr><td colspan="${window.IBOB_ROW_COLS.length}"><div class="empty">조건에 맞는 행이 없습니다.</div></td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map((r, i) => {
      return '<tr data-i="'+i+'">' + window.IBOB_ROW_COLS.map(c => {
        const align = c.align === 'right' ? 'text-align:right' : (c.align === 'center' ? 'text-align:center' : '');
        const cls = (c.mono ? 'num-cell ' : '');
        let html;
        if (c.render === 'status') html = statusTag(r[c.key]);
        else if (c.render === 'channel') html = channelTag(r[c.key]);
        else if (c.render === 'detail') html = `<button class="detail-btn" data-i="${i}">상세보기</button>`;
        else {
          let v = r[c.key];
          if (v == null || v === '') html = '<span class="muted">-</span>';
          else if (c.bold) html = `<span style="font-weight:600">${esc(v)}</span>`;
          else if (typeof v === 'number') html = fmt(v);
          else html = esc(v);
        }
        const t = (typeof r[c.key] === 'string') ? r[c.key] : '';
        return `<td class="${cls}" style="${align}" title="${esc(t)}">${html}</td>`;
      }).join('') + '</tr>';
    }).join('');
    tbody.querySelectorAll('.detail-btn').forEach(b => {
      b.addEventListener('click', e => {
        e.stopPropagation();
        openModal(rows[Number(b.dataset.i)]);
      });
    });
  }

  function openModal(r){
    if (!r) return;
    if (window.MktIbobDrawer) { window.MktIbobDrawer.open(r); return; }
    console.warn('[ib-ob] MktIbobDrawer 미로드 — _detail-drawer.js 가 필요합니다.');
  }
  function closeModal(){
    if (window.MktIbobDrawer) window.MktIbobDrawer.close();
  }

  /* ─ 필터 (검색 + 성약 상태 + CH) ─ */
  function applyFilter(rows, q, status, ch){
    const ql = (q || '').toLowerCase();
    return rows.filter(r => {
      if (status && status !== 'all'){
        if (status === 'y'   && !(r['성약'] === 'Y' || r['성약'] === '성약')) return false;
        if (status === 'mid' && r['성약'] !== '협의중') return false;
        if (status === 'drop'&& r['성약'] !== '드롭') return false;
      }
      if (ch && ch !== 'all'){
        if (String(r['CH']||'').toUpperCase() !== ch.toUpperCase()) return false;
      }
      if (ql){
        const blob = (r['고객사명']+' '+r['주소']+' '+r['검색 키워드']+' '+r['트래킹 경로(UTM)']+' '+r['시도']+' '+r['지역구']).toLowerCase();
        if (blob.indexOf(ql) < 0) return false;
      }
      return true;
    });
  }

  /* ─ KPI 계산 ─ */
  function computeKPI(rows){
    const total = rows.length;
    const ib    = rows.filter(r => String(r['CH']||'').toUpperCase() === 'IB').length;
    const ob    = rows.filter(r => String(r['CH']||'').toUpperCase() === 'OB').length;
    const conv  = rows.filter(r => r['성약'] === 'Y' || r['성약'] === '성약').length;
    const mid   = rows.filter(r => r['성약'] === '협의중').length;
    const drop  = rows.filter(r => r['성약'] === '드롭' || r['성약'] === '무응답').length;
    const rate  = total ? Math.round(conv * 100 / total) : 0;
    return { total, ib, ob, conv, mid, drop, rate };
  }

  /* ─ 분포 집계 (인지채널 · 유입구분 · 시도 · 기업구분) ─ */
  function distribute(rows, key){
    const map = {};
    rows.forEach(r => {
      const k = String(r[key]||'기타').trim() || '기타';
      map[k] = (map[k]||0) + 1;
    });
    return Object.keys(map).map(k => ({ name:k, count:map[k] }))
      .sort((a,b) => b.count - a.count);
  }

  /* ───────── 셀 선택 + 클립보드 (Excel/Sheets 유사) ─────────
   * - 클릭: 단일 셀 선택
   * - Ctrl+Space: 활성 셀이 속한 열 전체 선택
   * - Shift+Space: 활성 셀이 속한 행 전체 선택
   * - Ctrl+C: 선택 셀 텍스트를 TSV(탭 구분)로 클립보드 복사
   * - Ctrl+V: 클립보드 텍스트를 선택된 모든 셀에 표시 (로컬 변경 · 시트 미반영)
   */
  let ACTIVE_CELL = null;          // { td, tr, rowIdx, colIdx }
  const SELECTED = new Set();      // 'rowIdx,colIdx'
  let _cellEvtBound = false;

  function _flashStatus(text, cls){
    const el = document.getElementById('status');
    if (!el) { console.log('[ibob]', text); return; }
    const prev = el.textContent, prevCls = el.className;
    el.textContent = text;
    el.className = 'status ' + (cls || 'ok');
    setTimeout(() => { el.textContent = prev; el.className = prevCls; }, 1800);
  }
  function _clearSel(){
    document.querySelectorAll('.ibob-table tbody td.selected, .ibob-table tbody td.cell-active')
      .forEach(td => td.classList.remove('selected','cell-active'));
    SELECTED.clear();
  }
  function _cellInfo(td){
    const tr = td.closest('tr'); if (!tr) return null;
    const tbody = tr.parentElement; if (!tbody) return null;
    const trs = Array.from(tbody.querySelectorAll('tr'));
    const rowIdx = trs.indexOf(tr);
    const colIdx = Array.from(tr.children).indexOf(td);
    return { td, tr, rowIdx, colIdx };
  }
  function _selectSingle(td){
    _clearSel();
    const info = _cellInfo(td); if (!info) return;
    info.td.classList.add('selected','cell-active');
    ACTIVE_CELL = info;
    SELECTED.add(info.rowIdx + ',' + info.colIdx);
  }
  function _selectColumn(colIdx){
    _clearSel();
    const tbody = document.querySelector('#tbl tbody');
    Array.from(tbody.querySelectorAll('tr')).forEach((tr, rIdx) => {
      const td = tr.children[colIdx]; if (!td) return;
      td.classList.add('selected');
      SELECTED.add(rIdx + ',' + colIdx);
    });
    if (ACTIVE_CELL) ACTIVE_CELL.td.classList.add('cell-active');
  }
  function _selectRow(tr){
    _clearSel();
    const tbody = tr.parentElement;
    const rowIdx = Array.from(tbody.querySelectorAll('tr')).indexOf(tr);
    Array.from(tr.children).forEach((td, colIdx) => {
      td.classList.add('selected');
      SELECTED.add(rowIdx + ',' + colIdx);
    });
    if (ACTIVE_CELL) ACTIVE_CELL.td.classList.add('cell-active');
  }
  function _selectionAsTSV(){
    const tbody = document.querySelector('#tbl tbody');
    const trs = Array.from(tbody.querySelectorAll('tr'));
    const grouped = {};
    SELECTED.forEach(k => {
      const [r, c] = k.split(',').map(Number);
      if (!grouped[r]) grouped[r] = {};
      const td = trs[r] && trs[r].children[c];
      grouped[r][c] = td ? td.textContent.trim() : '';
    });
    const rows = Object.keys(grouped).map(Number).sort((a,b)=>a-b);
    return rows.map(r => {
      const cols = Object.keys(grouped[r]).map(Number).sort((a,b)=>a-b);
      return cols.map(c => grouped[r][c]).join('\t');
    }).join('\n');
  }
  async function _copySelection(){
    if (!SELECTED.size) return;
    const text = _selectionAsTSV();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText){
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
      }
      _flashStatus('✓ ' + SELECTED.size + '개 셀 복사됨', 'ok');
    } catch(err){ _flashStatus('복사 실패: ' + err.message, 'err'); }
  }
  async function _pasteSelection(){
    if (!SELECTED.size) return;
    try {
      let text = '';
      if (navigator.clipboard && navigator.clipboard.readText){
        text = await navigator.clipboard.readText();
      } else { _flashStatus('이 브라우저는 붙여넣기를 지원하지 않습니다', 'err'); return; }
      if (text == null) return;
      const tbody = document.querySelector('#tbl tbody');
      const trs = Array.from(tbody.querySelectorAll('tr'));
      // 단순 정책: 클립보드 텍스트 첫 라인의 첫 셀 값을 선택된 모든 셀에 표시 (로컬 변경)
      const firstVal = String(text).split(/[\r\n]/)[0].split('\t')[0];
      SELECTED.forEach(k => {
        const [r, c] = k.split(',').map(Number);
        const td = trs[r] && trs[r].children[c];
        if (td) td.textContent = firstVal;
      });
      _flashStatus('✓ ' + SELECTED.size + '개 셀에 붙여넣기 (로컬 표시만 · 시트 미반영)', 'ok');
    } catch(err){ _flashStatus('붙여넣기 실패: ' + err.message, 'err'); }
  }
  function attachCellSelection(){
    const tbl = document.getElementById('tbl');
    if (!tbl || _cellEvtBound) return;
    _cellEvtBound = true;

    tbl.addEventListener('click', e => {
      if (e.target.closest('.detail-btn')) return;       // 상세보기 버튼은 셀 선택 안 함
      if (e.target.closest('thead')) return;             // 헤더 클릭은 무시 (리사이저용)
      const td = e.target.closest('td');
      if (!td) return;
      _selectSingle(td);
    });

    document.addEventListener('keydown', e => {
      const inField = /INPUT|TEXTAREA|SELECT/.test(((e.target||{}).tagName)||'');
      if (inField) return;
      const isMod = e.ctrlKey || e.metaKey;

      // Ctrl+Space → 컬럼 전체
      if (isMod && e.code === 'Space'){
        if (!ACTIVE_CELL) return;
        e.preventDefault(); _selectColumn(ACTIVE_CELL.colIdx); return;
      }
      // Shift+Space → 행 전체
      if (e.shiftKey && !isMod && e.code === 'Space'){
        if (!ACTIVE_CELL) return;
        e.preventDefault(); _selectRow(ACTIVE_CELL.tr); return;
      }
      // Ctrl+C
      if (isMod && (e.key === 'c' || e.key === 'C')){
        if (!SELECTED.size) return;
        e.preventDefault(); _copySelection(); return;
      }
      // Ctrl+V
      if (isMod && (e.key === 'v' || e.key === 'V')){
        if (!SELECTED.size) return;
        e.preventDefault(); _pasteSelection(); return;
      }
      // Esc → 선택 해제
      if (e.key === 'Escape'){
        if (SELECTED.size){ _clearSel(); ACTIVE_CELL = null; }
      }
    });
  }

  window.IBOB = {
    esc, fmt, statusTag, channelTag, chTag,
    buildHeader, renderTable, resetWidths,
    openModal, closeModal,
    applyFilter, computeKPI, distribute,
    attachCellSelection
  };
})();
