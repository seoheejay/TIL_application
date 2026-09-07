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
  /** 정확히 8자 ("YYYYMMDD") */
  memo_date: string
  /** 생략 가능. 각 태그는 1~32자. 개수 제한은 없고 생략과 []는 같다. */
  tags?: string[]
}

/** GET /notes 응답 */
export interface GetNotesResponse {
  total_count: number
  page: number
  notes: Note[]
}

export interface GetNotesParams {
  page: number
  items_per_page: number
}
