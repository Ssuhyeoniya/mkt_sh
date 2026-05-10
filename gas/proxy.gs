/**
 * Marketing CRM · 중앙 프록시 GAS
 *
 * 한 개의 웹앱(this script) 으로 여러 스프레드시트의 데이터를
 * `?action=<module>.<method>` 형태로 라우팅해서 응답합니다.
 *
 * 프론트엔드에서:
 *   GET <WEBAPP_URL>?action=blog.list
 *   GET <WEBAPP_URL>?action=blog.summary
 *   GET <WEBAPP_URL>?action=health
 *
 * 새 모듈을 추가할 때:
 *   1) modules/<name>.gs 파일을 새로 만들고 함수를 정의
 *   2) 아래 ROUTES 에 'name.method': FunctionName 형태로 등록
 */

function doGet(e)  { return handle_(e); }
function doPost(e) { return handle_(e); }

function handle_(e) {
  const params = (e && e.parameter) ? Object.assign({}, e.parameter) : {};
  if (e && e.postData && e.postData.contents) {
    try { Object.assign(params, JSON.parse(e.postData.contents)); } catch (_) {}
  }

  const ROUTES = {
    'health':           function () { return { ok: true, ts: new Date().toISOString() }; },
    'blog.list':        Blog_list,
    'blog.summary':     Blog_summary,
    'blog.update':      Blog_update,
    'salesmap.list':    Salesmap_list,
    'salesmap.summary': Salesmap_summary,
    // 추후 추가: 'partner.list': Partner_list, 'ads.inapp': Ads_inapp, ...
  };

  const action = String(params.action || '').trim();
  const fn = ROUTES[action];
  const started = Date.now();

  if (!fn) {
    return out_({
      ok: false,
      error: 'unknown_action',
      action: action,
      available: Object.keys(ROUTES)
    });
  }

  try {
    const data = fn(params);
    return out_({
      ok: true,
      action: action,
      data: data,
      tookMs: Date.now() - started,
      ts: new Date().toISOString()
    });
  } catch (err) {
    return out_({
      ok: false,
      action: action,
      error: String(err && err.message || err),
      stack: String(err && err.stack || '').split('\n').slice(0, 4).join('\n')
    });
  }
}

function out_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
