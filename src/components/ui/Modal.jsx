import { useEffect } from 'react'
import './Modal.css'

function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="ui-modal__backdrop" onClick={onClose}>
      <div
        className="ui-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        {title && <h2 className="ui-modal__title">{title}</h2>}
        {children}
      </div>
    </div>
  )
}

export default Modal
