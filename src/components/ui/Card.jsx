import './Card.css'

function Card({ children, className = '', as: Tag = 'div', ...rest }) {
  return (
    <Tag className={`ui-card ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  )
}

export default Card
