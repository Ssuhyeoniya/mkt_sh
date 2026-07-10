# Repository conventions for Claude Code

## 로우테이블(Row Table) 표준

페이지에 **데이터 로우 테이블**(여러 행을 보여주는 `<table>` 데이터 그리드)을 만들 때는 항상 아래 패턴을 따른다. 기준 구현은 `salesmap/a/index.html` 이다.

### 1. `table-grid.js` (저장소 루트) 를 로드한다

페이지에서 `proxy-client.js` 다음 줄에 추가:

```html
<script src="./proxy-client.js"></script>
<script src="../table-grid.js"></script>
```

경로는 페이지 깊이에 맞춰 조정 (`../table-grid.js`, `../../table-grid.js` 등).

### 2. 테이블 엘리먼트에 `id="tbl"` 을 부여하고 attach 한다

```html
<table class="…" id="tbl">
  <colgroup>…</colgroup>
  <thead><tr>…</tr></thead>
  <tbody id="rows"></tbody>
</table>
```

테이블 헤더 빌드(`buildHeader()`) 직후, 또는 DOMContentLoaded 직후 한 번 호출:

```js
TableGrid.attach(document.getElementById('tbl'));
```

이걸로 다음 동작이 활성화된다:
- 셀 클릭 → 셀 선택 (Shift+Click 으로 범위 확장)
- **Shift+Space** → 활성 셀이 속한 행 전체
- **Ctrl+Space** → 활성 셀이 속한 열 전체
- **Ctrl+C** → 선택을 TSV 로 클립보드 복사 (Excel 호환)
- **Ctrl+V** → 클립보드 TSV 를 선택 셀부터 붙여넣기
- 방향키 / Esc / Ctrl+A

### 3. 새로고침 버튼은 두지 않는다

`<button id="btn-refresh">` 와 그 이벤트 핸들러를 만들지 않는다. 페이지에 이미 있으면 제거한다.

데이터 재요청은 GAS 연결 토글(`btn-connect`/`btn-disconnect`)에서 처리한다. 필요한 경우 페이지 로딩 시 자동으로 다시 불러오게 한다.

### 4. 엑셀 다운로드 버튼을 추가한다

CSV 버튼이 있으면 옆에, 없으면 단독으로 다음과 같이 추가:

```html
<button class="ghost-btn" id="btn-export-xls" title="엑셀 다운로드 (.xls)">⇩ 엑셀</button>
```

핸들러는 둘 중 하나로:

```js
// (A) 컬럼 정의(COLS)가 있는 페이지 — 필터된 데이터를 명시적으로 전달
$('btn-export-xls').addEventListener('click', () => {
  const rows = applyFilter(CURRENT);
  const headers = COLS.map(c => c.label);
  const data = rows.map((r, i) => COLS.map(c =>
    c.key === '_no' ? (i+1) : (r[c.key] ?? '')
  ));
  TableGrid.exportExcel({ headers, rows: data, filename: 'export_' + todayStr() + '.xls' });
});

// (B) 현재 화면에 그려진 테이블을 그대로
$('btn-export-xls').addEventListener('click', () => {
  TableGrid.exportExcelFromTable(document.getElementById('tbl'), 'export.xls');
});
```

### 5. 행 클릭으로 상세 드로어를 여는 경우 dblclick 으로 바꾼다

싱글클릭은 셀 선택에 양보한다:

```js
tbody.querySelectorAll('tr').forEach(tr => {
  tr.addEventListener('dblclick', () => openDrawer(rows[Number(tr.dataset.i)]));
});
```

행 안에 별도의 상세 버튼이 있으면 그 버튼만 단일 클릭으로 열고 `stopPropagation()` 한다.

### 6. 툴바에 안내 문구를 추가한다

```html
<span class="text-[11.5px] muted ml-2">셀 클릭 · Ctrl+C 복사 · Shift+Space 행 · Ctrl+Space 열 · 더블클릭 상세</span>
```

### 적용된 페이지

- `salesmap/a/index.html` (리드 로우테이블 — 기준 구현)
- `salesmap/index.html`
- `blog/index.html`
- `ib-ob/index.html`

### div 기반 행 그리드는 `<table>` 로 변환한다

기존에 `display:grid` 로 만든 div 기반 행 그리드(예: `.table-head` + `.post-row`)는
실제 `<table>` 로 바꾼다. 시각 그대로 두려면 `display:block` 으로 테이블 디폴트를 끈 뒤
`<tr>` 에 `display:grid; grid-template-columns: …` 를 그대로 얹으면 된다 — `blog/index.html` 참고.
