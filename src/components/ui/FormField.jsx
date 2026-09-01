import { useId } from 'react'
import './FormField.css'

function FormField({ label, error, hint, children, htmlFor }) {
  const generatedId = useId()
  const fieldId = htmlFor || generatedId

  return (
    <div className="ui-form-field">
      <label className="ui-form-field__label" htmlFor={fieldId}>
        {label}
      </label>
      {typeof children === 'function'
        ? children(fieldId)
        : children}
      {hint && !error && <p className="ui-form-field__hint">{hint}</p>}
      {error && <p className="ui-form-field__error">{error}</p>}
    </div>
  )
}

export default FormField
