# TIL Application — 백엔드

FastAPI + SQLAlchemy + MySQL. 노트(TIL) 작성/조회/태그 검색과 JWT 인증을 제공합니다.

## 시작하기

```bash
poetry install

cp .env.example .env      # DATABASE_URL, JWT_SECRET_KEY 를 채웁니다
alembic upgrade head      # 테이블 생성

uvicorn main:app --reload
```

- API 문서: http://127.0.0.1:8000/docs — 우측 상단 **Authorize** 버튼으로 로그인하면 이후 요청에 토큰이 자동으로 붙습니다
- 헬스체크: http://127.0.0.1:8000/health

`JWT_SECRET_KEY` 는 아래 명령으로 만든 값을 쓰세요. 이 값이 유출되면 누구나 ADMIN 토큰을 위조할 수 있습니다.

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 포트

백엔드 기본 포트는 **8000** 입니다. 프론트가 8000 을 쓴다면 둘 중 하나를 옮기세요.

```bash
uvicorn main:app --reload --port 8001    # 백엔드를 옮기는 경우
```

CORS 는 `localhost` / `127.0.0.1` 이면 **포트를 가리지 않고 허용**하므로, 프론트 포트가 바뀌어도 설정을 고칠 필요가 없습니다. 배포 도메인이 생기면 `.env` 의 `CORS_ORIGINS` 에 적습니다.

## API

인증이 필요한 API 는 `Authorization: Bearer <access_token>` 헤더가 필요합니다.

| Method | Path | 권한 | 설명 |
|---|---|---|---|
| POST | `/users` | 공개 | 회원가입 |
| POST | `/users/login` | 공개 | 로그인 → `access_token` |
| GET | `/users/me` | 로그인 | 내 정보 |
| PUT | `/users` | 로그인 | 내 정보 수정 (이름/비밀번호/메모) |
| DELETE | `/users` | 로그인 | 회원 탈퇴 |
| GET | `/users` | **ADMIN** | 전체 유저 목록 |
| POST | `/notes` | 로그인 | 노트 작성 |
| GET | `/notes` | 로그인 | 내 노트 목록 (`search=` 로 제목·본문 검색) |
| GET | `/notes/tags` | 로그인 | 내 태그와 개수 |
| GET | `/notes/tags/{tag_name}` | 로그인 | 태그로 검색 |
| GET | `/notes/{id}` | 로그인 | 노트 단건 |
| PUT | `/notes/{id}` | 로그인 | 노트 수정 |
| DELETE | `/notes/{id}` | 로그인 | 노트 삭제 |
| DELETE | `/notes/{id}/tags` | 로그인 | 태그만 비우기 |

### 로그인

`POST /users/login` 은 JSON 이 아니라 **폼(form-data)** 으로 받습니다. 필드 이름이 `username` 으로 고정되어 있어 여기에 이메일을 담습니다 (OAuth2 규약).

```js
const body = new URLSearchParams({ username: email, password });
const res = await fetch("/users/login", { method: "POST", body });
const { access_token } = await res.json();
```

### 노트 작성

```js
await fetch("/notes", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify({
    title: "오늘 배운 것",
    content: "본문",
    memo_date: "20260907",   // YYYYMMDD, 실제로 존재하는 날짜여야 합니다
    tags: ["TIL", "FastAPI"],
  }),
});
```

응답의 `tags` 는 **문자열 배열**입니다 (서버 내부에서는 객체지만 API 경계에서 이름만 내보냅니다).

### 검색

`GET /notes?search=` 로 제목과 본문을 함께 찾습니다. 대소문자를 가리지 않고, `total_count` 도 걸러진 개수입니다.

```
GET /notes?search=fastapi&page=1&items_per_page=10
```

- 64자까지. 넘으면 400
- 공백만 보내면 검색하지 않은 것으로 봅니다
- `%` 와 `_` 는 글자 그대로 찾습니다 (LIKE 와일드카드로 새지 않게 이스케이프)
- **태그는 검색 대상이 아닙니다.** 태그로 찾으려면 `/notes/tags/{tag_name}` 을 씁니다

### 태그 목록

`GET /notes/tags` 는 내가 쓴 태그와 각 태그가 붙은 **내** 노트 개수를 많이 쓴 순으로 돌려줍니다.

```json
{ "tags": [ { "name": "TIL", "count": 12 }, { "name": "FastAPI", "count": 3 } ] }
```

태그 행은 유저끼리 공유되지만 개수는 내 노트만 셉니다. 남만 쓴 태그는 아예 나오지 않습니다.

> 라우터 선언 순서 주의: `/notes/tags` 는 `/notes/{id}` 와 세그먼트 수가 같아서 **반드시 그보다 위에** 있어야 합니다. 아래에 두면 `id="tags"` 로 잡혀 404가 됩니다. (`/notes/tags/{tag_name}` 은 세그먼트 수가 달라 충돌하지 않습니다.)

### 목록 응답 형태

```json
{ "total_count": 42, "page": 1, "notes": [ ... ] }
```

`page` 는 1 이상, `items_per_page` 는 1~100 입니다. 범위를 벗어나면 400 입니다.

### 수정 시 부분 갱신

`PUT` 은 보낸 필드만 바꿉니다. `tags` 만 규칙이 다릅니다.

| `tags` 값 | 동작 |
|---|---|
| 생략 / `null` | 태그를 건드리지 않음 |
| `[]` | 태그 전부 제거 |
| `["a","b"]` | 통째로 교체 |

### 상태 코드

| 코드 | 의미 |
|---|---|
| 400 | 입력 검증 실패 (본문에 필드별 사유) |
| 401 | 토큰이 없음 / 만료 / 위조 |
| 403 | 로그인했지만 권한 부족 (ADMIN 전용 API) |
| 404 | 없는 노트, **또는 남의 노트** |
| 422 | 이미 가입된 이메일 / 없는 계정 / 비밀번호 불일치 |

> 남의 노트는 403 이 아니라 **404** 입니다. 존재 여부 자체를 알려주지 않기 위함입니다.

### 어드민 토큰

로그인은 항상 `USER` 역할의 토큰을 발급합니다. 어드민 토큰은 서버 시크릿을 가진 사람만 만들 수 있습니다.

```bash
python scripts/create_admin_token.py <user_id>
```

## 테스트

```bash
pytest                                   # 전체
pytest tests/test_notes.py -k 태그        # 일부만
pytest --cov=. --cov-report=term-missing # 커버리지
```

테스트는 **개발 DB 를 건드리지 않습니다.** `DATABASE_URL` 의 DB 이름 뒤에 `_test` 를 붙인 별도 DB 를 만들어 쓰고(예: `fastapi-ca` → `fastapi-ca_test`), 매 테스트마다 테이블을 비웁니다.

## 구조

클린 아키텍처 4계층입니다. 의존성은 항상 안쪽(domain)을 향합니다.

```
note/
├── interface/controllers/   HTTP·Pydantic — FastAPI 를 아는 유일한 계층
├── application/             유스케이스 (id 생성, 시각 기록, 도메인 조립)
├── domain/                  순수 dataclass + 저장소 인터페이스
│   ├── note.py              Note, Tag
│   └── repository/          INoteRepository (추상)
└── infra/                   SQLAlchemy — 도메인 객체 ↔ DB 모델 번역
    ├── db_models/
    └── repository/          INoteRepository 구현
```

- **저장소 인터페이스가 `domain` 에 있는 이유** — "이런 저장 기능이 필요하다"는 요구사항 선언은 도메인의 것이고, "MySQL 로 어떻게 하냐"는 인프라의 것입니다. 그래서 서비스는 DB 를 몰라도 됩니다 (의존성 역전).
- **모든 저장소 메서드가 `user_id` 를 받는 이유** — 소유권 검사를 SQL 의 `WHERE user_id = ?` 까지 내려보냅니다. 컨트롤러에서 깜빡하면 뚫리는 구조가 아니라 시그니처가 강제합니다.
- **의존성 주입** — `containers.py` 에서 조립하고 컨트롤러가 `Depends(Provide[...])` 로 받습니다. 서비스는 자기를 누가 조립하는지 모릅니다.

### Tag 모델링

`Note` ↔ `Note_Tag` ↔ `Tag` 다대다입니다. 태그명은 전역 유니크이고, 같은 이름이면 기존 행을 재사용합니다. 어느 노트에도 붙지 않게 된 태그는 자동 정리됩니다.

`Note` 는 애그리게이트 루트라서 태그를 개별로 추가/삭제하지 않고 **항상 통째로 교체**합니다.

## 알려진 제약

- 리프레시 토큰이 없습니다. 액세스 토큰은 6시간 후 만료되며 재로그인이 필요합니다.
- 커넥션 풀은 `pool_pre_ping` 으로 죽은 연결을 걸러냅니다. MySQL 이 `wait_timeout`(기본 8시간) 으로 유휴 연결을 끊어도 다음 요청이 실패하지 않습니다.
- 역할(`role`)이 DB 에 없습니다. 어드민은 위 스크립트로만 만듭니다.
- `celery`, `redis` 가 의존성에 있지만 아직 쓰지 않습니다.
