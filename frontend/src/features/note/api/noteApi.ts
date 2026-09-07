import { api } from '@/api/client'
import type {
  CreateNoteRequest,
  GetNotesByTagParams,
  GetNotesParams,
  GetNotesResponse,
  GetTagsResponse,
  Note,
  UpdateNoteRequest,
} from '../types'

/**
 * GET /notes?page=&items_per_page=&search= — 인증 필요.
 * search를 주면 제목·본문에서 그 말이 든 노트만 걸러진다. total_count도 걸러진 개수다.
 */
export async function getNotes({ page, items_per_page, search }: GetNotesParams): Promise<GetNotesResponse> {
  const { data } = await api.get<GetNotesResponse>('/notes', {
    // 빈 문자열을 보내도 백엔드가 무시하지만, 아예 빼서 쿼리스트링을 깔끔하게 둔다
    params: { page, items_per_page, ...(search ? { search } : {}) },
  })
  return data
}

/**
 * GET /notes/tags — 내가 쓴 태그와 각 태그의 내 노트 개수.
 * 많이 쓴 태그가 먼저 온다. 남만 쓴 태그는 오지 않는다.
 */
export async function getTags(): Promise<GetTagsResponse> {
  const { data } = await api.get<GetTagsResponse>('/notes/tags')
  return data
}

/**
 * GET /notes/tags/{tag_name} — 인증 필요.
 * 태그 행은 유저끼리 공유되지만 검색은 user_id로도 걸리므로 남의 노트는 섞이지 않는다.
 * 응답 모양은 GET /notes와 같다.
 */
export async function getNotesByTag({
  tagName,
  page,
  items_per_page,
}: GetNotesByTagParams): Promise<GetNotesResponse> {
  // 태그에 한글이나 #, / 가 들어갈 수 있어서 경로에 넣기 전에 인코딩한다.
  const { data } = await api.get<GetNotesResponse>(`/notes/tags/${encodeURIComponent(tagName)}`, {
    params: { page, items_per_page },
  })
  return data
}

/** GET /notes/{id} — 인증 필요. 남의 노트는 백엔드가 걸러낸다. */
export async function getNote(id: string): Promise<Note> {
  const { data } = await api.get<Note>(`/notes/${id}`)
  return data
}

/** POST /notes — 인증 필요. user_id는 토큰에서 나오므로 본문에 넣지 않는다. */
export async function createNote(payload: CreateNoteRequest): Promise<Note> {
  const { data } = await api.post<Note>('/notes', payload)
  return data
}

/** PUT /notes/{id} — 부분 수정. 없는 노트와 남의 노트는 모두 404. */
export async function updateNote(id: string, payload: UpdateNoteRequest): Promise<Note> {
  const { data } = await api.put<Note>(`/notes/${id}`, payload)
  return data
}

/** DELETE /notes/{id} — 204라 본문이 없다. */
export async function deleteNote(id: string): Promise<void> {
  await api.delete(`/notes/${id}`)
}

/**
 * DELETE /notes/{id}/tags — 노트는 두고 태그 연결만 끊는다. 204.
 * PUT에 tags: [] 를 보내도 같은 결과지만, 이쪽은 다른 필드를 건드릴 위험이 없다.
 */
export async function deleteNoteTags(id: string): Promise<void> {
  await api.delete(`/notes/${id}/tags`)
}
