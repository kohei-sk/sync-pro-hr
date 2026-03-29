"use client"

import { TriangleAlert } from "lucide-react"

interface FieldErrorProps {
  message?: string
}

export function FieldError({ message }: FieldErrorProps) {
  if (!message) return null
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
      <TriangleAlert className="w-3 h-3 shrink-0" />
      {message}
    </p>
  )
}
