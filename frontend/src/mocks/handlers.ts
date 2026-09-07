import { http, HttpResponse } from 'msw'
import { apiUrl } from '@/api/config'
import { db, mockUlid, persist } from './db'
import type { MockNote, MockUser } from './db'
import { createMockJwt, readUserFromAuthHeader } from './jwt'
import type { MockTokenUser } from './jwt'

/** user_controller.py의 UserResponse 모양으로 깎는다 (password, role 제외). */
function toUserResponse(user: MockUser) {
  const { password: _password, role: _role, ...rest } = user
  return rest
}

/** note_controller.py처럼 tags를 이름 문자열 배열로 평탄화해 내려준다. */
function toNoteResponse(note: MockNote) {
  return { ...note, tags: [...note.tags] }
}

/** 백엔드의 RequestValidationError 핸들러가 내려주는 400 배열 형태. */
function validationError(field: string, msg: string) {
  return HttpResponse.json([{ loc: ['body', field], msg, type: 'value_error' }], { status: 400 })
}

/** 토큰이 없거나 깨졌을 때. 백엔드 detail은 영어이고 프런트는 어차피 문구를 바꿔 보여준다. */
function unauthorized() {
  return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
}

/** 없는 노트와 남의 노트를 구분하지 않는다. 백엔드도 둘 다 404다. */
function notFound() {
  return HttpResponse.json({ detail: 'Not Found' }, { status: 404 })
}

/** 백엔드의 422는 본문이 없다. */
function unprocessable() {
  return new HttpResponse(null, { status: 422 })
}

/** 인증이 필요한 핸들러에서 공통으로 쓰는 사용자 추출. */
function requireUser(request: Request): MockTokenUser | null {
  return readUserFromAuthHeader(request.headers.get('Authorization'))
}

function readPage(request: Request) {
  const url = new URL(request.url)
  const page = Number(url.searchParams.get('page') ?? '1') || 1
  const itemsPerPage = Number(url.searchParams.get('items_per_page') ?? '10') || 10
  return { page, itemsPerPage, start: (page - 1) * itemsPerPage }
}

/** 백엔드처럼 공백만 있는 검색어는 검색하지 않은 것으로 본다. */
function readSearch(request: Request): string | null {
  const raw = new URL(request.url).searchParams.get('search')
  const trimmed = raw?.trim()
  return trimmed ? trimmed : null
}

export const handlers = [
  // ---------- auth ----------

  /**
   * POST /users/login — OAuth2PasswordRequestForm(form-urlencoded, username/password).
   * 없는 이메일이면 422(본문 없음), 비밀번호가 틀리면 401. 백엔드와 같다.
   */
  http.post(apiUrl('/users/login'), async ({ request }) => {
    const form = new URLSearchParams(await request.text())
    const email = form.get('username') ?? ''
    const password = form.get('password') ?? ''

    const user = db.users.find((candidate) => candidate.email === email)
    if (!user) return unprocessable()
    if (user.password !== password) {
      return HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 })
    }

    return HttpResponse.json({ access_token: createMockJwt(user.id, user.role), token_type: 'bearer' })
  }),

  // ---------- users ----------

  /** POST /users — 회원가입. 중복 이메일이면 백엔드와 똑같이 422. */
  http.post(apiUrl('/users'), async ({ request }) => {
    const body = (await request.json()) as { name?: string; email?: string; password?: string }

    if (!body.name) return validationError('name', 'Field required')
    if (body.name.length < 2) return validationError('name', 'String should have at least 2 characters')
    if (!body.email) return validationError('email', 'Field required')
    if (!body.password) return validationError('password', 'Field required')
    if (body.password.length < 8) {
      return validationError('password', 'String should have at least 8 characters')
    }

    if (db.users.some((user) => user.email === body.email)) return unprocessable()

    const now = new Date().toISOString()
    const user: MockUser = {
      id: mockUlid(),
      name: body.name,
      email: body.email,
      password: body.password,
      memo: null,
      role: 'USER',
      created_at: now,
      updated_at: now,
    }
    db.users.push(user)
    persist()

    return HttpResponse.json(toUserResponse(user), { status: 201 })
  }),

  /** GET /users/me — 토큰 주인의 정보. */
  http.get(apiUrl('/users/me'), ({ request }) => {
    const tokenUser = requireUser(request)
    if (!tokenUser) return unauthorized()

    const user = db.users.find((candidate) => candidate.id === tokenUser.id)
    if (!user) return unprocessable()

    return HttpResponse.json(toUserResponse(user))
  }),

  /** GET /users?page=&items_per_page= — ADMIN 전용, 페이지네이션. */
  http.get(apiUrl('/users'), ({ request }) => {
    const tokenUser = requireUser(request)
    if (!tokenUser) return unauthorized()
    if (tokenUser.role !== 'ADMIN') {
      return HttpResponse.json({ detail: 'Not enough permissions' }, { status: 403 })
    }

    const { page, itemsPerPage, start } = readPage(request)
    const sorted = [...db.users].sort((a, b) => b.created_at.localeCompare(a.created_at))

    return HttpResponse.json({
      total_count: sorted.length,
      page,
      users: sorted.slice(start, start + itemsPerPage).map(toUserResponse),
    })
  }),

  /** PUT /users — 토큰 주인만 수정. 보낸 필드만 반영, memo는 빈 문자열이면 지운다. */
  http.put(apiUrl('/users'), async ({ request }) => {
    const tokenUser = requireUser(request)
    if (!tokenUser) return unauthorized()

    const user = db.users.find((candidate) => candidate.id === tokenUser.id)
    if (!user) return unprocessable()

    const body = (await request.json()) as { name?: string; password?: string; memo?: string }
    if (body.name) user.name = body.name
    if (body.password) user.password = body.password
    if (body.memo !== undefined) user.memo = body.memo
    user.updated_at = new Date().toISOString()
    persist()

    return HttpResponse.json(toUserResponse(user))
  }),

  /**
   * DELETE /users — 회원 탈퇴. 204.
   * 백엔드는 FK ON DELETE CASCADE로 노트까지 지우므로 목도 같이 지운다.
   */
  http.delete(apiUrl('/users'), ({ request }) => {
    const tokenUser = requireUser(request)
    if (!tokenUser) return unauthorized()

    const index = db.users.findIndex((candidate) => candidate.id === tokenUser.id)
    if (index === -1) return unprocessable()

    db.users.splice(index, 1)
    db.notes = db.notes.filter((note) => note.user_id !== tokenUser.id)
    persist()

    return new HttpResponse(null, { status: 204 })
  }),

  // ---------- notes ----------

  /** GET /notes?page=&items_per_page= — 본인 노트만. */
  http.get(apiUrl('/notes'), ({ request }) => {
    const tokenUser = requireUser(request)
    if (!tokenUser) return unauthorized()

    const { page, itemsPerPage, start } = readPage(request)
    const search = readSearch(request)

    const mine = db.notes
      .filter((note) => {
        if (note.user_id !== tokenUser.id) return false
        if (!search) return true
        // 백엔드는 제목·본문을 대소문자 없이 본다. LIKE 와일드카드는 글자로 취급한다.
        const needle = search.toLowerCase()
        return (
          note.title.toLowerCase().includes(needle) || note.content.toLowerCase().includes(needle)
        )
      })
      // 최근 메모 날짜가 위로 오게 한다.
      .sort((a, b) => b.memo_date.localeCompare(a.memo_date))

    return HttpResponse.json({
      total_count: mine.length,
      page,
      notes: mine.slice(start, start + itemsPerPage).map(toNoteResponse),
    })
  }),

  /** POST /notes — user_id는 토큰에서 온다. */
  http.post(apiUrl('/notes'), async ({ request }) => {
    const tokenUser = requireUser(request)
    if (!tokenUser) return unauthorized()

    const body = (await request.json()) as {
      title?: string
      content?: string
      memo_date?: string
      tags?: string[]
    }

    // CreateNoteBody의 Field 제약을 그대로 흉내 낸다.
    if (!body.title || body.title.length > 64) {
      return validationError('title', 'String should have at most 64 characters')
    }
    if (!body.content) return validationError('content', 'String should have at least 1 character')
    if (!body.memo_date || body.memo_date.length !== 8) {
      return validationError('memo_date', 'String should have exactly 8 characters')
    }
    if (body.tags?.some((tag) => tag.length < 1 || tag.length > 32)) {
      return validationError('tags', 'String should have at most 32 characters')
    }

    const now = new Date().toISOString()
    const note: MockNote = {
      id: mockUlid(),
      user_id: tokenUser.id,
      title: body.title,
      content: body.content,
      memo_date: body.memo_date,
      tags: Array.from(new Set(body.tags ?? [])),
      created_at: now,
      updated_at: now,
    }
    db.notes.push(note)
    persist()

    return HttpResponse.json(toNoteResponse(note), { status: 201 })
  }),

  /**
   * GET /notes/tags — 내 태그와 개수. 많이 쓴 순, 같으면 이름순.
   * '/notes/:id' 와 세그먼트 수가 같아서 반드시 그보다 먼저 등록해야 한다.
   * 아래에 두면 /notes/tags 요청이 id="tags" 로 잡혀 404가 된다.
   */
  http.get(apiUrl('/notes/tags'), ({ request }) => {
    const tokenUser = requireUser(request)
    if (!tokenUser) return unauthorized()

    const counts = new Map<string, number>()
    for (const note of db.notes) {
      if (note.user_id !== tokenUser.id) continue
      for (const tag of note.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1)
      }
    }

    const tags = [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))

    return HttpResponse.json({ tags })
  }),

  /**
   * GET /notes/tags/{tag_name} — 태그로 검색. 응답 모양은 GET /notes와 같다.
   * '/notes/:id' 보다 먼저 등록해 둔다. MSW는 세그먼트 수로 구분하지만 순서를 명확히 한다.
   */
  http.get(apiUrl('/notes/tags/:tagName'), ({ request, params }) => {
    const tokenUser = requireUser(request)
    if (!tokenUser) return unauthorized()

    const tagName = decodeURIComponent(String(params.tagName))
    const { page, itemsPerPage, start } = readPage(request)

    const matched = db.notes
      .filter((note) => note.user_id === tokenUser.id && note.tags.includes(tagName))
      .sort((a, b) => b.memo_date.localeCompare(a.memo_date))

    return HttpResponse.json({
      total_count: matched.length,
      page,
      notes: matched.slice(start, start + itemsPerPage).map(toNoteResponse),
    })
  }),

  /** DELETE /notes/{id}/tags — 노트는 두고 태그만 비운다. 204. */
  http.delete(apiUrl('/notes/:id/tags'), ({ request, params }) => {
    const tokenUser = requireUser(request)
    if (!tokenUser) return unauthorized()

    const note = db.notes.find((candidate) => candidate.id === params.id && candidate.user_id === tokenUser.id)
    if (!note) return notFound()

    note.tags = []
    note.updated_at = new Date().toISOString()
    persist()

    return new HttpResponse(null, { status: 204 })
  }),

  /** GET /notes/{id} — 남의 노트는 없는 것으로 취급(404). */
  http.get(apiUrl('/notes/:id'), ({ request, params }) => {
    const tokenUser = requireUser(request)
    if (!tokenUser) return unauthorized()

    const note = db.notes.find((candidate) => candidate.id === params.id && candidate.user_id === tokenUser.id)
    if (!note) return notFound()

    return HttpResponse.json(toNoteResponse(note))
  }),

  /**
   * PUT /notes/{id} — 부분 수정. 보낸 필드만 반영한다.
   * tags는 undefined면 건드리지 않고, []면 전부 지운다. 백엔드와 같다.
   */
  http.put(apiUrl('/notes/:id'), async ({ request, params }) => {
    const tokenUser = requireUser(request)
    if (!tokenUser) return unauthorized()

    const note = db.notes.find((candidate) => candidate.id === params.id && candidate.user_id === tokenUser.id)
    if (!note) return notFound()

    const body = (await request.json()) as {
      title?: string
      content?: string
      memo_date?: string
      tags?: string[]
    }

    if (body.title !== undefined && (body.title.length < 1 || body.title.length > 64)) {
      return validationError('title', 'String should have at most 64 characters')
    }
    if (body.content !== undefined && body.content.length < 1) {
      return validationError('content', 'String should have at least 1 character')
    }
    if (body.memo_date !== undefined && body.memo_date.length !== 8) {
      return validationError('memo_date', 'String should have exactly 8 characters')
    }
    if (body.tags?.some((tag) => tag.length < 1 || tag.length > 32)) {
      return validationError('tags', 'String should have at most 32 characters')
    }

    if (body.title) note.title = body.title
    if (body.content) note.content = body.content
    if (body.memo_date) note.memo_date = body.memo_date
    if (body.tags !== undefined) note.tags = Array.from(new Set(body.tags))
    note.updated_at = new Date().toISOString()
    persist()

    return HttpResponse.json(toNoteResponse(note))
  }),

  /** DELETE /notes/{id} — 204. */
  http.delete(apiUrl('/notes/:id'), ({ request, params }) => {
    const tokenUser = requireUser(request)
    if (!tokenUser) return unauthorized()

    const index = db.notes.findIndex(
      (candidate) => candidate.id === params.id && candidate.user_id === tokenUser.id,
    )
    if (index === -1) return notFound()

    db.notes.splice(index, 1)
    persist()

    return new HttpResponse(null, { status: 204 })
  }),
]
