"use client"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as api from "./api"
import type { UserCreateInput, UserEditInput } from "./schemas"
export function useUsers() {
  return useQuery({ queryKey: ["users", "list"], queryFn: api.listUsers })
}
export function useCreateUser() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: UserCreateInput) => api.createUser(input),
    onSuccess: () => client.invalidateQueries({ queryKey: ["users"] }),
  })
}
export function useUpdateUser(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: UserEditInput) => api.updateUser(id, input),
    onSuccess: () => client.invalidateQueries(),
  })
}
export function useSetUserActive(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (active: boolean) => api.setUserActive(id, active),
    onSuccess: () => client.invalidateQueries({ queryKey: ["users"] }),
  })
}
export function useResetUserPassword(id: string) {
  return useMutation({ mutationFn: (password: string) => api.resetUserPassword(id, password) })
}
export function useDeleteUser(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => api.deleteUser(id),
    onSuccess: () => client.invalidateQueries({ queryKey: ["users"] }),
  })
}
