import { useState, useCallback } from 'react'

export function useToast() {
  const [toast, setToast] = useState({ msg: '', type: '', show: false })

  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type, show: true })
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3000)
  }, [])

  return { toast, showToast }
}
