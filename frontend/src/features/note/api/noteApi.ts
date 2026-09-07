import { api } from '@/api/client'
import type { CreateNoteRequest, GetNotesParams, GetNotesResponse, Note } from '../types'

/** GET /notes?page=&items_per_page= — 인증 필요 */
export async function getNotes({ page, items_per_page }: GetNotesParams): Promise<GetNotesResponse> {
  const { data } = await api.get<GetNotesResponse>('/notes', {
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
