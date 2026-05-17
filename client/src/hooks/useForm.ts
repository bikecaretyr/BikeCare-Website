import { Dispatch, SetStateAction, useState } from 'react'

export function useForm<T extends Record<string, unknown>>(initial: T) {
  const [form, setForm] = useState<T>(initial)
  const [saving, setSaving] = useState(false)

  const set = (field: keyof T, value: unknown) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const reset = () => {
    setForm(initial)
  }

  return {
    form,
    setForm,
    set,
    reset,
    saving,
    setSaving: setSaving as Dispatch<SetStateAction<boolean>>,
  }
}
