/* table-grid.js
 * Excel-like grid behavior for HTML <table> elements:
 *  - Click cell to select
 *  - Shift+Space   : entire row
 *  - Ctrl+Space    : entire column
 *  - Ctrl+C        : copy selection (TSV, Excel-compatible)
 *  - Ctrl+V        : paste TSV into cells starting at the selected cell
 *  - Arrow keys    : move cell selection
 *  - Esc           : clear selection
 *
 * Also exposes TableGrid.exportExcelFromTable(table, filename) and
 * TableGrid.exportExcel({ headers, rows, filename }) for Excel download buttons.
 */
(function(){
  'use strict';

  const STATE = new WeakMap();

  function getState(table){
    let s = STATE.get(table);
    if (!s){
      s = { anchor:null, focus:null, mode:'cell' };
      STATE.set(table, s);
    }
    return s;
  }

  function clearSelection(table){
    table.querySelectorAll('.gx-sel-cell, .gx-sel-row, .gx-sel-col, .gx-sel-head')
      .forEach(el => el.classList.remove('gx-sel-cell','gx-sel-row','gx-sel-col','gx-sel-head'));
  }

  function tbodyRows(table){
    return table.tBodies[0] ? table.tBodies[0].rows : [];
  }

  function getCellPos(td){
    const tr = td.parentElement;
    const tbody = tr.parentElement;
    if (!tbody || tbody.tagName !== 'TBODY') return null;
    const r = Array.prototype.indexOf.call(tbody.rows, tr);
    const c = Array.prototype.indexOf.call(tr.cells, td);
    return { r, c };
  }

  function paint(table){
    clearSelection(table);
    const s = getState(table);
    if (!s.anchor) return;
    const rows = tbodyRows(table);
    if (!rows.length) return;
    if (s.mode === 'row'){
      const tr = rows[s.anchor.r];
      if (!tr) return;
      Array.from(tr.cells).forEach(td => td.classList.add('gx-sel-row'));
    } else if (s.mode === 'col'){
      Array.from(rows).forEach(tr => {
        const td = tr.cells[s.anchor.c];
        if (td) td.classList.add('gx-sel-col');
      });
      const thead = table.tHead;
      if (thead && thead.rows.length){
        const th = thead.rows[thead.rows.length-1].cells[s.anchor.c];
        if (th) th.classList.add('gx-sel-head');
      }
    } else {
      const f = s.focus || s.anchor;
      const r1 = Math.min(s.anchor.r, f.r), r2 = Math.max(s.anchor.r, f.r);
      const c1 = Math.min(s.anchor.c, f.c), c2 = Math.max(s.anchor.c, f.c);
      for (let i = r1; i <= r2; i++){
        const tr = rows[i]; if (!tr) continue;
        for (let j = c1; j <= c2; j++){
          const td = tr.cells[j];
          if (td) td.classList.add('gx-sel-cell');
        }
      }
    }
  }

  function cellText(td){
    if (!td) return '';
    return (td.innerText || td.textContent || '').replace(/\s+\n/g,'\n').trim();
  }

  function copySelection(table){
    const s = getState(table);
    if (!s.anchor) return false;
    const rows = tbodyRows(table);
    if (!rows.length) return false;
    let matrix = [];
    if (s.mode === 'row'){
      const tr = rows[s.anchor.r];
      if (!tr) return false;
      matrix.push(Array.from(tr.cells).map(cellText));
    } else if (s.mode === 'col'){
      Array.from(rows).forEach(tr => {
        const td = tr.cells[s.anchor.c];
        matrix.push([cellText(td)]);
      });
    } else {
      const f = s.focus || s.anchor;
      const r1 = Math.min(s.anchor.r, f.r), r2 = Math.max(s.anchor.r, f.r);
      const c1 = Math.min(s.anchor.c, f.c), c2 = Math.max(s.anchor.c, f.c);
      for (let i = r1; i <= r2; i++){
        const tr = rows[i]; if (!tr) continue;
        const row = [];
        for (let j = c1; j <= c2; j++) row.push(cellText(tr.cells[j]));
        matrix.push(row);
      }
    }
    const tsv = matrix.map(r => r.join('\t')).join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(tsv).catch(() => fallbackCopy(tsv));
    } else {
      fallbackCopy(tsv);
    }
    return true;
  }

  function fallbackCopy(text){
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch(_){}
    ta.remove();
  }

  function pasteIntoSelection(table, text){
    const s = getState(table);
    if (!s.anchor) return;
    const rows = tbodyRows(table);
    if (!rows.length) return;
    const startR = s.mode === 'col' ? 0 : s.anchor.r;
    const startC = s.mode === 'row' ? 0 : s.anchor.c;
    const matrix = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n').map(line => line.split('\t'));
    for (let i = 0; i < matrix.length; i++){
      const tr = rows[startR + i]; if (!tr) continue;
      for (let j = 0; j < matrix[i].length; j++){
        const td = tr.cells[startC + j]; if (!td) continue;
        td.textContent = matrix[i][j];
      }
    }
    paint(table);
  }

  function attach(table){
    if (!table || table.__gxAttached) return;
    table.__gxAttached = true;
    if (!table.hasAttribute('tabindex')) table.setAttribute('tabindex','0');

    table.addEventListener('mousedown', e => {
      const td = e.target.closest('td');
      if (!td || !table.contains(td)) return;
      if (e.target.closest('button, a, input, select, .resizer')) return;
      const pos = getCellPos(td);
      if (!pos) return;
      const s = getState(table);
      if (e.shiftKey && s.anchor){
        s.mode = 'cell';
        s.focus = pos;
      } else {
        s.mode = 'cell';
        s.anchor = pos;
        s.focus  = pos;
      }
      paint(table);
      table.focus({ preventScroll: true });
    });

    table.addEventListener('keydown', e => {
      const s = getState(table);
      const rows = tbodyRows(table);
      if (!s.anchor && rows.length){
        s.anchor = { r:0, c:0 }; s.focus = { r:0, c:0 }; s.mode = 'cell';
      }
      if (!s.anchor) return;

      const isMod = e.ctrlKey || e.metaKey;

      if (e.key === ' ' && e.shiftKey && !isMod){
        e.preventDefault();
        s.mode = 'row'; paint(table); return;
      }
      if (e.key === ' ' && isMod && !e.shiftKey){
        e.preventDefault();
        s.mode = 'col'; paint(table); return;
      }
      if (isMod && (e.key === 'c' || e.key === 'C')){
        if (copySelection(table)) e.preventDefault();
        return;
      }
      if (isMod && (e.key === 'v' || e.key === 'V')){
        e.preventDefault();
        if (navigator.clipboard && navigator.clipboard.readText){
          navigator.clipboard.readText().then(text => pasteIntoSelection(table, text)).catch(() => {});
        }
        return;
      }
      if (isMod && (e.key === 'a' || e.key === 'A')){
        e.preventDefault();
        const tr0 = rows[0]; if (!tr0) return;
        s.mode = 'cell';
        s.anchor = { r:0, c:0 };
        s.focus  = { r:rows.length-1, c:tr0.cells.length-1 };
        paint(table);
        return;
      }
      if (e.key === 'Escape'){
        s.anchor = null; s.focus = null;
        clearSelection(table);
        return;
      }
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(e.key) >= 0){
        e.preventDefault();
        s.mode = 'cell';
        const tr0 = rows[s.anchor.r] || rows[0];
        const cols = tr0 ? tr0.cells.length : 0;
        let { r, c } = s.anchor;
        if (e.key === 'ArrowUp')    r = Math.max(0, r-1);
        if (e.key === 'ArrowDown')  r = Math.min(rows.length-1, r+1);
        if (e.key === 'ArrowLeft')  c = Math.max(0, c-1);
        if (e.key === 'ArrowRight') c = Math.min(cols-1, c+1);
        s.anchor = { r, c }; s.focus = { r, c };
        paint(table);
      }
    });
  }

  function todayStr(){
    const d = new Date();
    return d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');
  }

  function exportExcel(opts){
    const headers = opts.headers || [];
    const rows = opts.rows || [];
    const filename = opts.filename || ('export_' + todayStr() + '.xls');
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const thead = '<tr>' + headers.map(h => `<th style="background:#f3f4f6;font-weight:600;border:1px solid #d1d5db;padding:6px;">${esc(h)}</th>`).join('') + '</tr>';
    const tbody = rows.map(r => '<tr>' + r.map(v => `<td style="border:1px solid #d1d5db;padding:6px;">${esc(v)}</td>`).join('') + '</tr>').join('');
    const html =
      '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">' +
      '<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Sheet1</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>' +
      '<body><table>' + thead + tbody + '</table></body></html>';
    const blob = new Blob(['﻿' + html], { type:'application/vnd.ms-excel' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  function exportExcelFromTable(table, filename){
    const thead = table.tHead;
    let headers = [];
    if (thead && thead.rows.length){
      const headRow = thead.rows[thead.rows.length-1];
      headers = Array.from(headRow.cells).map(th => cellText(th));
    }
    const rows = Array.from(tbodyRows(table)).map(tr =>
      Array.from(tr.cells).map(td => cellText(td))
    );
    exportExcel({ headers, rows, filename });
  }

  // Inject default selection styling
  const css =
    '.gx-sel-cell{background:rgba(109,78,255,.22) !important;outline:1px solid rgba(109,78,255,.65);outline-offset:-1px;}'+
    '.gx-sel-row{background:rgba(109,78,255,.10) !important;}'+
    '.gx-sel-col{background:rgba(109,78,255,.10) !important;}'+
    '.gx-sel-head{background:rgba(109,78,255,.18) !important;color:var(--text) !important;}'+
    'table[tabindex]:focus{outline:none;}';
  const styleEl = document.createElement('style');
  styleEl.id = 'tablegrid-style';
  styleEl.textContent = css;
  (document.head || document.documentElement).appendChild(styleEl);

  window.TableGrid = {
    attach: attach,
    clear: clearSelection,
    paint: paint,
    exportExcel: exportExcel,
    exportExcelFromTable: exportExcelFromTable
  };
})();
