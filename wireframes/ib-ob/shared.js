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
    const w = Math.max(40, resizeState.startW + (e.clientX - resizeState.startX));
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
    document.getElementById('modal-title').textContent = r['고객사명'] || '(이름 없음)';
    const tags = [chTag(r['CH']), statusTag(r['성약']), r['기업구분'] ? `<span class="tag-mini tag-none">${esc(r['기업구분'])}</span>` : '', r['고객사 분류'] ? `<span class="tag-mini tag-none">등급 ${esc(r['고객사 분류'])}</span>` : ''].filter(Boolean).join(' ');
    document.getElementById('modal-meta').innerHTML = tags;
    const FULL_KEYS = new Set(['주소','트래킹 경로(UTM)','상세 경로']);
    document.getElementById('modal-body').innerHTML =
      `<div class="field-grid">` +
      window.IBOB_ALL_COLS.map(k => {
        const v = r[k];
        const full = FULL_KEYS.has(k) ? ' full' : '';
        return `<div class="field${full}"><div class="k">${esc(k)}</div><div class="v">${esc(v == null || v === '' ? '-' : v)}</div></div>`;
      }).join('') +
      `</div>`;
    document.getElementById('modal').classList.add('open');
    document.getElementById('modal-back').classList.add('open');
  }
  function closeModal(){
    document.getElementById('modal').classList.remove('open');
    document.getElementById('modal-back').classList.remove('open');
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

  window.IBOB = {
    esc, fmt, statusTag, channelTag, chTag,
    buildHeader, renderTable, resetWidths,
    openModal, closeModal,
    applyFilter, computeKPI, distribute
  };
})();
