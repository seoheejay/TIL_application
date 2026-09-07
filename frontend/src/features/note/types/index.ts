/** note_controller.py의 NoteResponse와 1:1 대응. */
export interface Note {
  id: string
  user_id: string
  title: string
  content: string
  /** "YYYYMMDD" 8자리 문자열 */
  memo_date: string
  /** 응답에서는 Tag 객체가 아니라 이름 문자열 배열로 평탄화되어 온다. */
  tags: string[]
  created_at: string
  updated_at: string
}

/** CreateNoteBody */
export interface CreateNoteRequest {
  /** 1~64자 */
  title: string
  /** 1자 이상 */
  content: string
  /** 정확히 8자 ("YYYYMMDD"). 실제로 존재하는 날짜여야 한다 (2월 31일은 400) */
  memo_date: string
  /** 생략 가능. 각 태그는 1~32자. 개수 제한은 없고 생략과 []는 같다. */
  tags?: string[]
}

/**
 * UpdateNoteBody — 전부 선택. 보낸 필드만 반영된다.
 * tags만 규칙이 다르다:
 *   생략/undefined → 태그를 건드리지 않는다
 *   []             → 태그를 전부 지운다
 *   ["a","b"]      → 통째로 교체한다 (추가가 아니다)
 */
export interface UpdateNoteRequest {
  title?: string
  content?: string
  memo_date?: string
  tags?: string[]
}

/** GET /notes 응답 */
export interface GetNotesResponse {
  total_count: number
  page: number
  notes: Note[]
}

export interface GetNotesParams {
  /** 1 이상. 0이나 음수는 백엔드가 400으로 거른다. */
  page: number
  /** 1~100. 범위를 벗어나면 400. */
  items_per_page: number
}

/** GET /notes/tags/{tag_name} 파라미터 */
export interface GetNotesByTagParams extends GetNotesParams {
  tagName: string
}
