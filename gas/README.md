# Marketing CRM · GAS 프록시

n개의 구글 스프레드시트를 **하나의 GAS 웹앱(프록시)**으로 통합 라우팅합니다.
프론트엔드는 이 웹앱 URL 하나만 알면 모든 데이터를 받을 수 있습니다.

```
[Frontend] ──▶  Proxy GAS  ──▶  blog.list   →  BLOG_RAW_DATA 시트
                            ──▶  blog.summary →  BLOG_RAW_DATA 시트
                            ──▶  partner.list (예정)
                            ──▶  ads.inapp   (예정)
                            ──▶  ...
```

## 파일 구성

| 파일 | 역할 |
|---|---|
| `proxy.gs` | `doGet/doPost` 라우터, 모든 모듈을 `ROUTES`에 등록 |
| `modules/blog.gs` | BLOG_RAW_DATA 시트 모듈 (`Blog_list`, `Blog_summary`) |

새 시트가 추가될 때 `modules/<name>.gs` 를 만들고 `proxy.gs`의 `ROUTES`에 등록만 하면 됩니다.

## 배포 방법 (최초 1회)

1. https://script.google.com 접속 → **새 프로젝트**
2. `Code.gs` 의 내용을 지우고 → `proxy.gs` 내용 붙여넣기
3. 좌측 `+` → 스크립트 → 이름 `blog` → `modules/blog.gs` 내용 붙여넣기
4. 우측 상단 **배포** → **새 배포** → 유형: **웹 앱**
   - 설명: `mkt_proxy_v1`
   - 다음 사용자로 실행: **나**
   - 액세스 권한: **모든 사용자**
5. 배포 후 **웹 앱 URL** 복사 (`https://script.google.com/macros/s/.../exec`)
6. 브라우저에서 다음 주소로 동작 확인:
   - `<URL>?action=health` → `{"ok":true,...}`
   - `<URL>?action=blog.list` → 블로그 행 데이터

## 코드 수정 후 재배포

수정할 때마다 새 버전을 배포하지 않아도 됩니다.
**배포 → 배포 관리 → 톱니바퀴(편집) → 버전: 새 버전 → 배포** 하면 같은 URL이 유지됩니다.

## 와이어프레임에 연결

배포된 웹 앱 URL을 wireframe 페이지의 상단 입력창에 붙여넣고 [연결]을 누르면,
페이지가 자동으로 `?action=blog.list` 를 호출하여 실데이터를 표시합니다.
URL은 브라우저 localStorage(`mkt_gas_url`)에 저장되어 다음 방문 시 자동 적용됩니다.

## 시크릿 관리

- 시트 ID 등 민감하지 않은 식별자는 모듈 상단 상수로 관리합니다 (`BLOG_SHEET_ID`).
- API 키나 외부 토큰이 필요한 경우 GAS의 **스크립트 속성**(File > Project properties > Script properties)을 사용하세요.

## 트러블슈팅

### "연결 실패" 또는 "GAS가 HTML 에러 페이지 반환"
새 모듈을 추가했는데 갑자기 모든 라우트가 실패한다면:

1. **모듈 파일이 GAS 프로젝트에 추가됐는지** 확인 (`modules/<name>.gs`)
2. **함수명이 정확한지** 확인 (예: `Salesmap_list`, `Salesmap_summary`)
3. **재배포**: 배포 → 배포 관리 → 톱니바퀴(편집) → 버전: 새 버전 → 배포 (URL 유지)
4. GAS 에디터의 **실행** 메뉴에서 함수를 한 번 직접 실행 → 권한 승인
5. 브라우저에서 `<URL>?action=health` 로 접속 → JSON 응답 오는지 확인
6. `<URL>?action=unknown` 으로 접속 → `available` 배열에 등록된 라우트가 모두 보이는지 확인

`proxy.gs`는 모듈 함수가 정의되어 있을 때만 라우트를 등록하므로, 모듈 파일이 누락되어도 health 와 다른 모듈은 정상 동작합니다.

## 응답 포맷

성공:
```json
{ "ok": true, "action": "blog.list", "data": { "rows": [...], "total": 24, "headers": [...] }, "tookMs": 142, "ts": "2026-05-10T07:30:00.000Z" }
```
실패:
```json
{ "ok": false, "action": "blog.list", "error": "sheet_not_found:BLOG_RAW_DATA" }
```
