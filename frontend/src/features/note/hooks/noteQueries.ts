import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createNote,
  deleteNote,
  deleteNoteTags,
  getNote,
  getNotes,
  getNotesByTag,
  getTags,
  updateNote,
} from '../api/noteApi'
import type { CreateNoteRequest, GetNotesByTagParams, GetNotesParams, UpdateNoteRequest } from '../types'

export const noteKeys = {
  all: ['notes'] as const,
  lists: () => [...noteKeys.all, 'list'] as const,
  list: (params: GetNotesParams) => [...noteKeys.lists(), params] as const,
  detail: (id: string) => [...noteKeys.all, 'detail', id] as const,
  // 태그 검색도 목록의 한 종류라 lists() 아래에 둔다.
  // 노트를 고치거나 지우면 태그 검색 결과도 같이 무효화되어야 하기 때문이다.
  byTag: (params: GetNotesByTagParams) => [...noteKeys.lists(), 'tag', params] as const,
  // 태그 목록은 노트가 바뀔 때 함께 무효화되어야 하므로 all() 아래에 둔다.
  tags: () => [...noteKeys.all, 'tags'] as const,
}

export function useNotes(params: GetNotesParams) {
  return useQuery({
    queryKey: noteKeys.list(params),
    queryFn: () => getNotes(params),
    // 페이지를 넘길 때 목록이 빈 화면으로 깜빡이지 않게 이전 데이터를 유지한다.
    placeholderData: (previous) => previous,
  })
}

export function useTags() {
  return useQuery({
    queryKey: noteKeys.tags(),
    queryFn: getTags,
  })
}

export function useNotesByTag(params: GetNotesByTagParams) {
  return useQuery({
    queryKey: noteKeys.byTag(params),
    queryFn: () => getNotesByTag(params),
    enabled: Boolean(params.tagName),
    placeholderData: (previous) => previous,
  })
}

export function useNote(id: string) {
  return useQuery({
    queryKey: noteKeys.detail(id),
    queryFn: () => getNote(id),
    enabled: Boolean(id),
  })
}

export function useCreateNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateNoteRequest) => createNote(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() })
      // 새 태그가 생겼을 수 있다.
      queryClient.invalidateQueries({ queryKey: noteKeys.tags() })
    },
  })
}

export function useUpdateNote(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateNoteRequest) => updateNote(id, payload),
    onSuccess: (note) => {
      // 응답이 곧 최신 노트라 상세는 다시 받아올 필요가 없다.
      queryClient.setQueryData(noteKeys.detail(id), note)
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() })
      // 태그를 통째로 교체했을 수 있어 개수가 달라진다.
      queryClient.invalidateQueries({ queryKey: noteKeys.tags() })
    },
  })
}

export function useDeleteNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteNote(id),
    onSuccess: (_data, id) => {
      // 지워진 노트의 상세 캐시를 남겨두면 뒤로가기에서 유령 데이터가 보인다.
      queryClient.removeQueries({ queryKey: noteKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() })
      queryClient.invalidateQueries({ queryKey: noteKeys.tags() })
    },
  })
}

export function useDeleteNoteTags(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => deleteNoteTags(id),
    onSuccess: () => {
      // 204라 응답 본문이 없다. 상세를 다시 받아와야 태그가 빈 상태로 보인다.
      queryClient.invalidateQueries({ queryKey: noteKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() })
      queryClient.invalidateQueries({ queryKey: noteKeys.tags() })
    },
  })
}
