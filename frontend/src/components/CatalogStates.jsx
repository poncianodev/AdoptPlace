import { Link } from 'react-router-dom'

export function LoadingState({ message = 'Carregando…' }) {
  return (
    <div className="empty state-box state-loading" role="status" aria-live="polite">
      <span className="loading-spinner" aria-hidden="true" />
      <p>{message}</p>
    </div>
  )
}

export function ErrorState({
  title = 'Não foi possível carregar as informações.',
  message = '',
  onRetry,
  retryLabel = 'Tentar novamente',
}) {
  return (
    <div className="empty state-box state-error" role="alert">
      <span className="empty-heart" aria-hidden="true">!</span>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {onRetry && (
        <button type="button" className="button button-outline" onClick={onRetry}>
          {retryLabel}
        </button>
      )}
    </div>
  )
}

export function EmptyState({
  icon = '♡',
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
}) {
  return (
    <div className="empty state-box state-empty">
      <span className="empty-heart" aria-hidden="true">{icon}</span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {actionLabel && actionTo && (
        <Link to={actionTo} className="button">
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && (
        <button type="button" className="button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}

