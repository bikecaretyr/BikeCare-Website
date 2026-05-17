import { useCallback, useRef, useState } from 'react'
import { Confirm } from '../components/ui'

interface ConfirmOptions {
  title: string
  message: string
  danger?: boolean
}

export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolveRef = useRef({ current: null as ((value: boolean) => void) | null })

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>(resolve => {
      resolveRef.current.current = resolve
      setOptions(opts)
    })
  }, [])

  const handleClose = useCallback(() => {
    if (resolveRef.current.current) {
      resolveRef.current.current(false)
      resolveRef.current.current = null
    }
    setOptions(null)
  }, [])

  const handleConfirm = useCallback(() => {
    if (resolveRef.current.current) {
      resolveRef.current.current(true)
      resolveRef.current.current = null
    }
    setOptions(null)
  }, [])

  const ConfirmDialog = (
    <Confirm
      open={!!options}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title={options?.title ?? ''}
      message={options?.message ?? ''}
      danger={options?.danger}
    />
  )

  return { confirm, ConfirmDialog }
}
