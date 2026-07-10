/* 사이드바 네비 아코디언 (전 페이지 공용)
 * .nav-section(메인 네비)를 클릭하면 그 아래 .nav-item 들을 펼치고/접는다.
 * 기본: 현재 활성(.active) 항목이 속한 섹션만 펼치고 나머지는 접음.
 * shared.css 종류와 무관하게 동작하도록 필요한 스타일을 직접 주입한다.
 */
(function () {
  function injectCSS() {
    if (document.getElementById('nav-accordion-css')) return;
    const css = `
.nav-section.nav-toggle{ cursor:pointer; display:flex; align-items:center; justify-content:space-between; user-select:none; }
.nav-section.nav-toggle::after{ content:'▾'; font-size:9px; opacity:.55; transition:transform .15s ease; margin-left:8px; }
.nav-section.nav-toggle.collapsed::after{ transform:rotate(-90deg); }
.nav-group{ display:flex; flex-direction:column; }
.nav-group.collapsed{ display:none; }
`;
    const s = document.createElement('style');
    s.id = 'nav-accordion-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function build() {
    injectCSS();
    const heads = document.querySelectorAll('.nav-section');
    heads.forEach(function (head) {
      if (head.dataset.navToggle) return;           // 중복 적용 방지
      // 같은 부모 안에서 다음 .nav-section 전까지의 .nav-item 수집
      const items = [];
      let n = head.nextElementSibling;
      while (n && !n.classList.contains('nav-section')) {
        if (n.classList.contains('nav-item')) items.push(n);
        n = n.nextElementSibling;
      }
      if (!items.length) return;

      const wrap = document.createElement('div');
      wrap.className = 'nav-group';
      head.parentNode.insertBefore(wrap, head.nextSibling);
      items.forEach(function (it) { wrap.appendChild(it); });

      head.dataset.navToggle = '1';
      head.classList.add('nav-toggle');
      const hasActive = items.some(function (it) { return it.classList.contains('active'); });
      if (!hasActive) { wrap.classList.add('collapsed'); head.classList.add('collapsed'); }

      head.addEventListener('click', function () {
        wrap.classList.toggle('collapsed');
        head.classList.toggle('collapsed');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
