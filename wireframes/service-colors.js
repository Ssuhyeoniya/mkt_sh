/* 서비스(제품) 브랜드 컬러 — 서비스 표시 도표(도넛/막대 등)에서 서비스명별 고정 색상.
   서비스명 라벨이 이 맵에 있으면 해당 브랜드 컬러를, 없으면 각 차트의 기본 팔레트를 사용한다. */
(function () {
  var SERVICE_COLORS = {
    '식권대장': '#1db53a',
    '복지대장': '#405EBC',
    '복지대장몰': '#405EBC',
    '배달대장': '#1c7a22',
    '퀵대장': '#194abf',
    '광고대장': '#d22239',
    '단체선물대장': '#fd402c',
    '커피대장': '#876549',
    '매점대장': '#4267eb',
    '의무교육대장': '#003764',
    '푸드트럭대장': '#DC4E44',
    '문자대장': '#1599e3',
    '사무기기대장': '#00827a'
  };
  // 서비스명 → 브랜드 컬러 (없으면 null). 공백 트리밍만 적용.
  function serviceColor(name) {
    return SERVICE_COLORS[String(name == null ? '' : name).trim()] || null;
  }
  window.SERVICE_COLORS = SERVICE_COLORS;
  window.serviceColor = serviceColor;
})();
