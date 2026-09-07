# Frontend

FastAPI 백엔드(`/users`, `/notes`)에 대응하는 React 클라이언트.

## 스택

| | |
|---|---|
| 빌드 | Vite 6 |
| UI | React 18 + TypeScript (strict) |
| 라우팅 | React Router 6 (`createBrowserRouter`) |
| 서버 상태 | TanStack Query 5 |
| HTTP | axios (JWT 인터셉터) |
| 스타일 | 일반 CSS + 커스텀 프로퍼티 (라이트/다크 자동) |

## 실행

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
```

리포지터리 루트에서도 됩니다. 루트 `package.json`이 `frontend`로 넘겨줍니다.

```bash
npm install      # frontend 의존성까지 함께 설치
npm run dev
```

기본값은 **실제 백엔드**에 붙는 설정입니다. 별도 터미널에서 백엔드를 띄워 둡니다
(리포지터리 루트, 루트 `README.md` 참고).

```bash
uvicorn main:app --reload   # http://127.0.0.1:8000
```

Vite dev 서버가 `/api` → `http://127.0.0.1:8000`으로 프록시하므로 백엔드의
CORS 설정과 무관하게 동작합니다. 백엔드 없이 화면만 보려면 아래 목 API를 켭니다.

```bash
npm run typecheck   # tsc --noEmit
npm run build       # 타입체크 + 프로덕션 번들
```

### 목 API

`.env.development`의 `VITE_USE_MOCK`이 스위치입니다.

| 값 | 동작 |
|---|---|
| `false` (기본) | 실제 백엔드로 요청 (vite 프록시 `/api` → `http://127.0.0.1:8000`) |
| `true` | [MSW](https://mswjs.io)가 서비스 워커로 요청을 가로채 브라우저 안에서 응답 |

```
목 데모 계정   demo@example.com / demo1234   (목에서만 ADMIN 권한)
```

- 핸들러는 [`src/mocks/handlers.ts`](src/mocks/handlers.ts)에 있고, 실제 컨트롤러의
  경로·상태 코드·검증 규칙(제목 64자, `memo_date` 8자, 중복 이메일 422, 어드민 전용 403 등)을
  그대로 흉내 냅니다.
- 데이터는 `localStorage`에 남아 새로고침해도 유지됩니다. 콘솔에서
  `__resetMockDb()`를 부르면 초기화됩니다.
- `VITE_USE_MOCK`은 dev에서만 읽히므로 `npm run build` 결과물에는 목 코드가
  들어가지 않습니다.

## 폴더 구조

```
frontend/
├── index.html
├── vite.config.ts          /api 프록시, @ alias
├── tsconfig.json
└── src/
    ├── main.tsx
    ├── App.tsx             QueryClient > Auth > Router 순으로 감싼다
    ├── api/
    │   ├── config.ts       API base URL, 목 사용 여부
    │   ├── client.ts       axios 인스턴스, JWT 주입, 에러 정규화
    │   └── queryClient.ts  4xx는 재시도하지 않는 기본 설정
    ├── mocks/              MSW 목 API (VITE_USE_MOCK=true 일 때만 로드)
    │   ├── handlers.ts     실제 컨트롤러의 응답/검증을 흉내
    │   ├── db.ts           localStorage에 남는 인메모리 저장소
    │   ├── jwt.ts          목 전용 JWT 생성/파싱
    │   └── browser.ts      워커 기동
    ├── components/
    │   ├── common/         Button, Field, Alert, Spinner, Pagination, TagList, EmptyState
    │   └── layout/         Layout, Header
    ├── features/           백엔드 도메인과 1:1 대응
    │   ├── auth/           로그인, 토큰 보관, JWT 디코딩
    │   ├── user/           회원가입, 내 정보 조회/수정, 유저 목록(ADMIN)
    │   └── note/           노트 생성/목록/상세
    ├── pages/              라우트 단위 화면 (조립만 담당)
    ├── router/             라우트 정의, ProtectedRoute, PublicOnlyRoute
    ├── store/authStorage   localStorage 토큰 (React 밖에서도 읽어야 해서 모듈)
    ├── styles/global.css
    ├── types/api.ts        에러 응답 타입
    └── utils/date.ts       memo_date(YYYYMMDD) <-> input[type=date] 변환
```

### 설계 의도

- **`features/` 우선**: 백엔드가 도메인별 계층 구조를 쓰므로 프론트도 같은 축으로
  나눠 대응 관계를 명확히 했습니다. 한 기능을 고칠 때 한 폴더만 열면 됩니다.
- **`pages/`는 얇게**: 라우팅과 조립만 하고, 로직과 UI는 `features/` 안에 둡니다.
- **에러는 한 곳에서 정규화**: 백엔드가 상황마다 다른 모양으로 에러를 주기 때문에
  (`400` 검증 배열 / `422` 빈 본문 / `{detail}`) `normalizeError`에서 흡수하고
  화면은 `message`와 `fieldErrors`만 봅니다.

## 백엔드 API 대응

| 화면 | 엔드포인트 | 권한 |
|---|---|---|
| `/signup` | `POST /users` | 공개 |
| `/login` | `POST /users/login` (form-urlencoded `username`/`password`) | 공개 |
| `/me` | `GET /users/me`, `PUT /users` (이름/비밀번호/메모) | 로그인 |
| `/users` | `GET /users?page&items_per_page` | **ADMIN** |
| `/notes` | `GET /notes?page&items_per_page` | 로그인 |
| `/notes/new` | `POST /notes` | 로그인 |
| `/notes/:id` | `GET /notes/{id}` | 로그인 |

### 에러 처리 규칙

백엔드의 상태 코드는 호출마다 뜻이 다릅니다. `normalizeError(error, overrides)`의 두 번째
인자로 화면이 문구를 정합니다.

| 코드 | 백엔드 | 화면 |
|---|---|---|
| 400 | 검증 실패, 필드별 사유 배열 | 인풋 아래에 필드별 메시지 |
| 401 | 토큰 없음/만료/위조, 로그인 비밀번호 불일치 | 토큰을 지우고 로그인 화면으로. 로그인 화면에서는 "이메일 또는 비밀번호" 문구 |
| 403 | ADMIN 전용 API | 권한 안내 |
| 404 | 없는 노트, 남의 노트 | 그대로 표시 |
| 422 | 중복 이메일(가입) / 없는 계정(로그인) | 각 화면이 문구 지정 |

### 어드민

로그인 토큰은 항상 `USER`라서 `/users` 메뉴는 토큰의 `role`이 `ADMIN`일 때만 보입니다.
어드민 토큰은 백엔드의 `python scripts/create_admin_token.py <user_id>`로 만든 값을
브라우저 `localStorage`의 `til.access_token`에 넣으면 됩니다.

## 백엔드에는 있지만 아직 화면이 없는 기능

- `PUT /notes/{id}`, `DELETE /notes/{id}`, `DELETE /notes/{id}/tags` — 노트 수정/삭제
- `GET /notes/tags/{tag_name}` — 태그로 검색
- `DELETE /users` — 회원 탈퇴
