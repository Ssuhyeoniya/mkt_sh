# 배포 가이드 — Vercel(비밀번호 보호) + GitHub Pages 끄기

실제 서비스는 **Vercel** 에서 비밀번호로 보호하여 제공하고, **GitHub Pages** 의 공개
노출은 끕니다.

---

## 1. GitHub Pages 끄기

1. GitHub 저장소 → **Settings → Pages**
2. **Build and deployment → Source** 를 **`None`** 으로 변경 후 저장
   - 이것이 유일하고 확실한 비활성화 방법입니다.
   - (이전에 시도한 `_config.yml` 콘텐츠 제외 방식은 Vercel 빌드를 망가뜨려 404 를
     유발할 수 있어 제거했습니다. Pages 비활성화는 반드시 Settings 에서 하세요.)
3. 완전한 비공개가 필요하면 저장소를 **Private** 로 전환하는 것이 가장 확실합니다.

> 참고: 이전에 안내한 `raw.githack.com` 링크는 GitHub raw 콘텐츠를 직접 읽는
> 외부 프록시라 Pages 와 무관하게 동작합니다. 비공개가 필요하면 그 링크는 더 이상
> 공유하지 마세요. (소스 자체는 저장소가 private 가 아니면 접근 가능)

---

## 2. Vercel 에 배포

1. [vercel.com](https://vercel.com) 로그인 → **Add New… → Project** → 이 GitHub 저장소 **Import**
2. **Framework Preset**: `Other` (저장소의 `vercel.json` 이 `"framework": null` 로 지정)
   - Build/Output 설정 비움 (정적 서빙)
3. **Environment Variables** 에 비밀번호 추가:
   - Name: `SITE_PASSWORD`
   - Value: (원하는 비밀번호)
   - Environment: Production / Preview 모두 체크
4. **Deploy**
5. 배포 후 도메인 접속 → **비밀번호 입력 페이지**가 먼저 뜨고, 올바른 비밀번호 입력 시
   30일간 유지되는 쿠키가 발급되어 접속됩니다.

### 배포 브랜치
- 현재 작업은 `claude/great-planck-kbrw5m` 브랜치에 있습니다.
- 프로덕션으로 보려면 **Vercel → Settings → Git → Production Branch** 를 해당 브랜치로
  지정하거나, `main` 에 병합하세요.
- 다른 브랜치는 자동으로 **Preview 배포** 가 생기며, 동일하게 비밀번호 보호가 적용됩니다.

### 진입 경로
- 루트(`/`) 접속 시 `index.html` 이 대시보드로 리다이렉트합니다.
- IB/OB 분석 3안 비교: `/wireframes/ib-ob/analysis/`
- IB/OB 종합: `/wireframes/ib-ob/`

---

## 3. 비밀번호 변경 / 로그아웃

- **변경**: Vercel 환경변수 `SITE_PASSWORD` 수정 후 재배포. 기존 쿠키는 자동 무효화됩니다.
  (쿠키 토큰이 비밀번호 해시 기반이라, 비밀번호가 바뀌면 기존 쿠키는 통과하지 못함)
- **로그아웃**: 브라우저 쿠키(`mkt_gate`) 삭제.

## 동작 원리 (요약)

- `middleware.js` (Vercel Edge Middleware) 가 모든 요청을 가로채 쿠키를 검사합니다.
- 비밀번호는 서버 환경변수에만 존재하고, 검증은 **서버(엣지)** 에서 이뤄지므로
  클라이언트 소스만으로 우회할 수 없습니다.
- 쿠키에는 비밀번호 원문이 아니라 SHA-256 해시 토큰만 저장됩니다.
