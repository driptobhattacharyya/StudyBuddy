import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'

/** <ConfirmDialog open onOpenChange title description confirmLabel onConfirm={async () => {}} /> */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = 'Delete', onConfirm }) {
  const [busy, setBusy] = useState(false)
  const run = async () => {
    setBusy(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch {
      /* caller shows the error; keep the dialog open */
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !busy && onOpenChange(o)}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button variant="danger" loading={busy} onClick={run}>{confirmLabel}</Button>
        </>
      }
    >
      <span className="sr-only">This action cannot be undone.</span>
    </Dialog>
  )
}
