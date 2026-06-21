/* IB/OB 분석 — 공용 앱 컨트롤러 (데이터 로드 + 전역 필터)
 * 3시안 공통: 데모/GAS 로드, 서비스·인지채널·기간·성약 필터.
 * 네비/섹션 렌더는 페이지가 onRender(filteredRows) 로 구현한다.
 */
window.AnalysisApp = (function () {
  const A = window.Analysis;
  const $ = id => document.getElementById(id);
  let RAW = [];
  let onRender = function () {};
  const STATE = { svc: '', aware: '', conv: false, dateStart: '', dateEnd: '', range: '' };

  function setStatus(t, k) { const el = $('status'); if (!el) return; el.className = 'status ' + (k || ''); el.textContent = t; }
  function ymd(d) { return A.ymd(d); }
  function yesterday() { const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(0, 0, 0, 0); return d; }

  function applyFilter(rows) {
    let out = rows;
    if (STATE.svc) out = out.filter(r => String(r['서비스 인입 구분'] || '') === STATE.svc);
    if (STATE.aware) out = out.filter(r => String(r['인지채널'] || '') === STATE.aware);
    if (STATE.conv) out = out.filter(A.isConv);
    if (STATE.dateStart || STATE.dateEnd) out = out.filter(r => {
      const d = String(r['IB 인입 일자'] || '').slice(0, 10); if (!d) return false;
      if (STATE.dateStart && d < STATE.dateStart) return false;
      if (STATE.dateEnd && d > STATE.dateEnd) return false;
      return true;
    });
    return out;
  }
  function filtered() { return applyFilter(RAW); }
  function rerender() {
    updateRangeInfo();
    onRender(filtered());
  }

  function fillSelect(id, key, allLabel) {
    const el = $(id); if (!el) return;
    const vals = Array.from(new Set(RAW.map(r => String(r[key] || '').trim()).filter(Boolean))).sort();
    el.innerHTML = `<option value="">${allLabel}</option>` + vals.map(v => `<option value="${A.esc(v)}">${A.esc(v)}</option>`).join('');
  }
  function fillFilters() {
    fillSelect('fSvc', '서비스 인입 구분', '서비스 전체');
    fillSelect('fAware', '인지채널', '인지채널 전체');
  }

  function setQuickRange(days) {
    const end = yesterday(), start = new Date(end); start.setDate(start.getDate() - (days - 1));
    if ($('date-start')) $('date-start').value = ymd(start);
    if ($('date-end')) $('date-end').value = ymd(end);
    STATE.dateStart = ymd(start); STATE.dateEnd = ymd(end); STATE.range = String(days); rerender();
  }
  function clearRange() {
    if ($('date-start')) $('date-start').value = '';
    if ($('date-end')) $('date-end').value = '';
    STATE.dateStart = STATE.dateEnd = STATE.range = ''; rerender();
  }
  function updateRangeInfo() {
    document.querySelectorAll('.qbtn').forEach(b => b.classList.toggle('active', b.dataset.range === STATE.range && !!STATE.range));
    const el = $('range-info'); if (el) el.textContent = (!STATE.dateStart && !STATE.dateEnd) ? '전체 기간' : `${STATE.dateStart || '...'} ~ ${STATE.dateEnd || '...'}`;
  }

  async function load(force) {
    const url = (window.MktProxy && MktProxy.getUrl()) || '';
    if ($('gas-url')) $('gas-url').value = url;
    if ($('btn-disconnect')) $('btn-disconnect').style.display = url ? '' : 'none';
    if (!url) {
      RAW = A.demo();
      setStatus('데모 데이터 분석 중 (' + RAW.length + '건)', 'demo');
      fillFilters(); rerender(); return;
    }
    try {
      setStatus(force ? '새로고침 중…' : '불러오는 중…');
      const data = await MktProxy.ibobListCached(force);
      RAW = (data && data.rows && data.rows.length) ? data.rows : A.demo();
      setStatus('● 연결됨 · ' + RAW.length + '건' + (data && data._fromCache ? ' · 캐시됨' : ''), 'ok');
      fillFilters(); rerender();
    } catch (err) {
      RAW = A.demo();
      setStatus('연결 실패: ' + err.message + ' (데모로 대체)', 'err');
      fillFilters(); rerender();
    }
  }

  function bind() {
    if ($('fSvc')) $('fSvc').addEventListener('change', e => { STATE.svc = e.target.value; rerender(); });
    if ($('fAware')) $('fAware').addEventListener('change', e => { STATE.aware = e.target.value; rerender(); });
    if ($('fConv')) $('fConv').addEventListener('change', e => { STATE.conv = e.target.checked; rerender(); });
    document.querySelectorAll('.qbtn').forEach(b => b.addEventListener('click', () => setQuickRange(Number(b.dataset.range))));
    if ($('date-start')) $('date-start').addEventListener('change', e => { STATE.dateStart = e.target.value; STATE.range = ''; rerender(); });
    if ($('date-end')) $('date-end').addEventListener('change', e => { STATE.dateEnd = e.target.value; STATE.range = ''; rerender(); });
    if ($('btn-clear-date')) $('btn-clear-date').addEventListener('click', clearRange);
    if ($('fReset')) $('fReset').addEventListener('click', () => {
      STATE.svc = STATE.aware = ''; STATE.conv = false;
      if ($('fSvc')) $('fSvc').value = ''; if ($('fAware')) $('fAware').value = ''; if ($('fConv')) $('fConv').checked = false;
      clearRange();
    });
    if ($('btn-connect')) $('btn-connect').addEventListener('click', () => {
      const v = $('gas-url').value.trim(); if (!v || !window.MktProxy) return;
      MktProxy.setUrl(v); MktProxy.ibobClearCache && MktProxy.ibobClearCache(); load(true);
    });
    if ($('btn-disconnect')) $('btn-disconnect').addEventListener('click', () => {
      if (!window.MktProxy) return; MktProxy.setUrl(''); $('gas-url').value = '';
      MktProxy.ibobClearCache && MktProxy.ibobClearCache(); load();
    });
    if ($('btn-refresh')) $('btn-refresh').addEventListener('click', () => {
      if (window.MktProxy && MktProxy.ibobClearCache) MktProxy.ibobClearCache();
      load(true);
    });
  }

  function init(cfg) {
    onRender = (cfg && cfg.onRender) || onRender;
    bind();
    load();
  }
  return { init, filtered, state: STATE, reload: load };
})();
