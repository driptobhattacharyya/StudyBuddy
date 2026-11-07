// Tiny global toast store so toasts can be fired from anywhere (including non-React code
// such as axios interceptors). The <Toaster /> component in components/ui renders them.
let toasts = []
let nextId = 1
const listeners = new Set()

function emit() {
  for (const l of listeners) l()
}

export function subscribeToasts(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getToasts() {
  return toasts
}

export function dismissToast(id) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

function push(variant, title, options = {}) {
  const id = nextId++
  const toast = { id, variant, title, description: options.description, duration: options.duration ?? 5000 }
  toasts = [...toasts.slice(-3), toast]
  emit()
  return id
}

/**
 * toast('Saved') or toast.success('Saved', { description: '...' }).
 * Variants: success | error | info | warning.
 */
export const toast = Object.assign((title, options) => push('info', title, options), {
  success: (title, options) => push('success', title, options),
  error: (title, options) => push('error', title, { duration: 7000, ...options }),
  info: (title, options) => push('info', title, options),
  warning: (title, options) => push('warning', title, options),
  dismiss: dismissToast,
})
