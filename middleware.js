// Vercel Edge Middleware — 전체 사이트 비밀번호 보호 (비공개 미리보기용)
//
// 동작:
//   - 모든 경로 요청을 가로채 쿠키(mkt_gate)가 유효하지 않으면 비밀번호 입력 페이지를 반환.
//   - 비밀번호는 서버 환경변수 SITE_PASSWORD 로 지정 (소스에 하드코딩하지 않음).
//   - 올바른 비밀번호를 제출하면 HttpOnly 쿠키를 발급하고 원래 경로로 돌려보냄.
//
// 설정: Vercel 프로젝트 → Settings → Environment Variables 에 SITE_PASSWORD 추가.

const COOKIE = 'mkt_gate';

async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function page(message, status) {
  const err = message ? `<div class="err">${message}</div>` : '';
  const html = `<!doctype html><html lang="ko"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>접근 제한 · Marketing CRM</title>
<link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{min-height:100vh;display:flex;align-items:center;justify-content:center;
    font-family:'Pretendard',-apple-system,system-ui,sans-serif;
    background:radial-gradient(120% 120% at 50% 0%,#1b1735 0%,#0f1020 60%,#0a0a14 100%);color:#e6e6ef}
  .card{width:340px;max-width:92vw;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10);
    border-radius:18px;padding:30px 26px;backdrop-filter:blur(8px);box-shadow:0 24px 60px rgba(0,0,0,.45)}
  .mark{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,#6d4eff,#16a34a);margin-bottom:14px}
  .brand{font-size:17px;font-weight:700;letter-spacing:-.2px}
  .sub{font-size:12.5px;color:#a6a6c0;margin-top:5px;line-height:1.5}
  form{margin-top:20px;display:flex;flex-direction:column;gap:10px}
  input{width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:10px;
    padding:11px 13px;color:#fff;font-size:14px;outline:0}
  input:focus{border-color:#6d4eff;box-shadow:0 0 0 3px rgba(109,78,255,.25)}
  button{width:100%;background:#6d4eff;border:0;border-radius:10px;padding:11px;color:#fff;font-size:14px;
    font-weight:600;cursor:pointer}
  button:hover{background:#7c5cff}
  .err{font-size:12.5px;color:#ff8190;background:rgba(220,38,38,.12);border:1px solid rgba(220,38,38,.3);
    border-radius:9px;padding:8px 11px}
  .foot{font-size:11px;color:#6f6f8c;margin-top:16px;text-align:center}
</style></head>
<body>
  <form class="card" method="POST" action="">
    <div class="mark"></div>
    <div class="brand">Marketing CRM</div>
    <div class="sub">비공개 미리보기입니다. 비밀번호를 입력해 주세요.</div>
    ${err}
    <input type="password" name="password" placeholder="비밀번호" autofocus autocomplete="current-password" />
    <button type="submit">입장</button>
    <div class="foot">권한이 있는 사용자만 접근할 수 있습니다.</div>
  </form>
</body></html>`;
  return new Response(html, {
    status: status || 401,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }
  });
}

export default async function middleware(req) {
  const PASS = (typeof process !== 'undefined' && process.env && process.env.SITE_PASSWORD) || '';
  if (!PASS) {
    return page('서버에 SITE_PASSWORD 환경변수가 설정되지 않았습니다. Vercel 설정에서 추가해 주세요.', 503);
  }
  const token = await sha256('v1|' + PASS);

  // 비밀번호 제출 (정적 사이트에는 다른 POST 엔드포인트가 없으므로 모든 POST 를 로그인 시도로 처리)
  if (req.method === 'POST') {
    let pw = '';
    try { const f = await req.formData(); pw = String(f.get('password') || ''); } catch (_) {}
    if (pw === PASS) {
      const url = new URL(req.url);
      const res = new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
      res.headers.append('Set-Cookie',
        `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=2592000`);
      return res;
    }
    return page('비밀번호가 올바르지 않습니다.');
  }

  // 쿠키 검증 → 통과(undefined 반환 시 정적 파일 정상 서빙)
  const cookie = req.headers.get('cookie') || '';
  const ok = cookie.split(';').some(c => c.trim() === COOKIE + '=' + token);
  if (ok) return;

  return page('');
}
