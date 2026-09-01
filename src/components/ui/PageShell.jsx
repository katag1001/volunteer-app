import './PageShell.css'

function PageShell({ children }) {
  return (
    <div className="ui-page-shell">
      <div className="ui-page-shell__inner">{children}</div>
    </div>
  )
}

export default PageShell
