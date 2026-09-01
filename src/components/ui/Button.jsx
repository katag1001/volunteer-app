import './Button.css'

const VARIANTS = ['primary', 'secondary', 'ghost', 'danger']

function Button({ variant = 'primary', children, className = '', ...rest }) {
  const resolvedVariant = VARIANTS.includes(variant) ? variant : 'primary'
  return (
    <button
      className={`ui-button ui-button--${resolvedVariant} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  )
}

export default Button
