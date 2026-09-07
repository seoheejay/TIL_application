import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createNote, getNote, getNotes } from '../api/noteApi'
import type { CreateNoteRequest, GetNotesParams } from '../types'

export const noteKeys = {
  all: ['notes'] as const,
  lists: () => [...noteKeys.all, 'list'] as const,
  list: (params: GetNotesParams) => [...noteKeys.lists(), params] as const,
  detail: (id: string) => [...noteKeys.all, 'detail', id] as const,
}

export function useNotes(params: GetNotesParams) {
  return useQuery({
    queryKey: noteKeys.list(params),
    queryFn: () => getNotes(params),
    // 페이지를 넘길 때 목록이 빈 화면으로 깜빡이지 않게 이전 데이터를 유지한다.
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
    },
  })
}
