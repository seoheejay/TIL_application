/**
 * 목 API가 쓰는 인메모리 저장소.
 *
 * 새로고침해도 내용이 남도록 localStorage에 통째로 직렬화한다.
 * 백엔드가 준비되면 이 폴더는 통째로 지워도 된다.
 */

export interface MockUser {
  id: string
  name: string
  email: string
  /** 목이라 평문으로 둔다. 실제 백엔드는 bcrypt 해시를 저장한다. */
  password: string
  memo: string | null
  /**
   * 실제 백엔드는 로그인 토큰을 항상 USER로 발급하고 어드민 토큰은 스크립트로만 만든다.
   * 목에서는 유저 목록 화면도 볼 수 있게 데모 계정을 ADMIN으로 둔다.
   */
  role: 'ADMIN' | 'USER'
  created_at: string
  updated_at: string
}

export interface MockNote {
  id: string
  user_id: string
  title: string
  content: string
  memo_date: string
  tags: string[]
  created_at: string
  updated_at: string
}

interface MockDb {
  users: MockUser[]
  notes: MockNote[]
}

// 필드가 바뀌면 버전을 올린다. 예전 데이터는 버리고 다시 씨앗을 심는다.
const STORAGE_KEY = 'til.mockdb.v2'

/** 백엔드가 ULID를 쓰므로 길이와 문자셋만 비슷하게 흉내 낸다. */
const ULID_CHARS = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
export function mockUlid(): string {
  let out = ''
  for (let i = 0; i < 26; i += 1) {
    out += ULID_CHARS[Math.floor(Math.random() * ULID_CHARS.length)]
  }
  return out
}

function seed(): MockDb {
  const now = new Date().toISOString()
  const demoUser: MockUser = {
    id: mockUlid(),
    name: '데모',
    email: 'demo@example.com',
    password: 'demo1234',
    memo: null,
    role: 'ADMIN',
    created_at: now,
    updated_at: now,
  }

  const notes: MockNote[] = [
    {
      id: mockUlid(),
      user_id: demoUser.id,
      title: 'FastAPI 의존성 주입',
      content:
        'Depends(Provide[Container.user_service]) 형태로 컨테이너에 등록한 팩토리를 주입한다.\n' +
        '서비스가 컨테이너를 직접 import 하면 안 된다. 누가 조립하는지 몰라야 한다.',
      memo_date: '20260901',
      tags: ['fastapi', 'di'],
      created_at: now,
      updated_at: now,
    },
    {
      id: mockUlid(),
      user_id: demoUser.id,
      title: 'SQLAlchemy 세션 다루기',
      content:
        'sessionmaker(autocommit=False, autoflush=False)로 만들고 요청 단위로 열고 닫는다.\n' +
        'with 문으로 감싸면 예외가 나도 확실히 닫힌다.',
      memo_date: '20260903',
      tags: ['sqlalchemy'],
      created_at: now,
      updated_at: now,
    },
    {
      id: mockUlid(),
      user_id: demoUser.id,
      title: '클린 아키텍처 계층',
      content: 'interface -> application -> domain 순으로 안쪽을 향한다. infra는 domain의 인터페이스를 구현한다.',
      memo_date: '20260905',
      tags: ['architecture', 'ddd'],
      created_at: now,
      updated_at: now,
    },
  ]

  return { users: [demoUser], notes }
}

function load(): MockDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as MockDb
  } catch {
    /* 저장소를 못 읽으면 그냥 새로 만든다 */
  }
  const fresh = seed()
  save(fresh)
  return fresh
}

function save(next: MockDb): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* 저장 실패해도 메모리상 db로 계속 동작한다 */
  }
}

export const db = load()

export function persist(): void {
  save(db)
}

/** 개발 중 데이터를 초기화하고 싶을 때 콘솔에서 부른다. */
export function resetMockDb(): void {
  const fresh = seed()
  db.users = fresh.users
  db.notes = fresh.notes
  persist()
}
