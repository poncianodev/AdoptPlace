import { useEffect, useState } from 'react'
import { api } from '../services/api'
import Pagination from './Pagination'
import { ErrorState, LoadingState } from './CatalogStates'

export default function Reviews({ slug }) {
  const [page, setPage] = useState(1)
  const [retryCount, setRetryCount] = useState(0)
  const requestKey = `${slug}:${page}:${retryCount}`
  const [state, setState] = useState({ key: '', data: null, error: '' })

  useEffect(() => {
    let active = true
    api.reviews(slug, page)
      .then(data => {
        if (active) setState({ key: requestKey, data, error: '' })
      })
      .catch(() => {
        if (active) setState({ key: requestKey, data: null, error: 'Não foi possível carregar as avaliações.' })
      })
    return () => { active = false }
  }, [slug, page, requestKey])

  const loading = state.key !== requestKey
  const result = state.data
  const error = loading ? '' : state.error

  return (
    <section className="panel org-reviews-panel">
      <div className="org-reviews-header">
        <div>
          <h2>Experiências de quem adotou</h2>
          <p className="muted">Avaliações de adoções concluídas e confirmadas.</p>
        </div>
        {result && result.count > 0 && (
          <div className="org-reviews-summary" aria-label={`Nota média ${result.average} de 5 em ${result.count} avaliações`}>
            <strong><span aria-hidden="true">★</span> {result.average}</strong>
            <small>de 5 · {result.count} {result.count === 1 ? 'avaliação' : 'avaliações'}</small>
          </div>
        )}
      </div>

      {loading && <LoadingState message="Carregando avaliações…" />}

      {!loading && error && (
        <ErrorState
          title="Não foi possível carregar as avaliações."
          message={error}
          onRetry={() => setRetryCount(count => count + 1)}
        />
      )}

      {!loading && !error && result && (
        <>
          {result.reviews.data.length === 0 ? (
            <p className="muted">Ainda não há avaliações publicadas.</p>
          ) : (
            <div className="org-reviews-list">
              {result.reviews.data.map(item => (
                <article className="adoption-item review-card" key={item.id}>
                  <div className="review-card-top">
                    <span className="review-card-score">
                      <span aria-hidden="true">★</span> {item.rating} de 5
                    </span>
                    <strong>{item.author}</strong>
                  </div>
                  <p className="review-card-comment">{item.comment}</p>
                </article>
              ))}
            </div>
          )}
          <Pagination page={page} meta={result.reviews} onChange={setPage} />
        </>
      )}
    </section>
  )
}
