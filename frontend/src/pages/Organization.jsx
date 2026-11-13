import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../services/api'
import PetCard from '../components/PetCard'
import Reviews from '../components/Reviews'
import Pagination from '../components/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../components/CatalogStates'

export default function Organization() {
  const { slug } = useParams()
  const [page, setPage] = useState(1)
  const [retryCount, setRetryCount] = useState(0)
  const requestKey = `${slug}:${page}:${retryCount}`
  const [result, setResult] = useState({ key: '', profile: null, pets: [], meta: {}, error: '' })

  useEffect(() => {
    let active = true
    Promise.all([api.publicOrganization(slug), api.publicOrganizationPets(slug, page)])
      .then(([organization, petsResult]) => {
        if (active) {
          setResult({
            key: requestKey,
            profile: organization,
            pets: petsResult?.data || [],
            meta: petsResult?.meta || {},
            error: '',
          })
        }
      })
      .catch(() => {
        if (active) {
          setResult({
            key: requestKey,
            profile: null,
            pets: [],
            meta: {},
            error: 'Não foi possível carregar este perfil. Ele pode estar indisponível.',
          })
        }
      })
    return () => { active = false }
  }, [slug, page, requestKey])

  const loading = result.key !== requestKey
  const profile = result.profile
  const pets = result.pets
  const error = loading ? '' : result.error
  const orgLocation = [profile?.city, profile?.state].filter(Boolean).join(', ')

  return (
    <main id="main" className="container detail org-profile">
      <Link to="/animais" className="org-back-link">← Voltar ao catálogo</Link>

      {loading && <LoadingState message="Carregando perfil da organização…" />}

      {!loading && error && (
        <ErrorState
          title="Não foi possível carregar este perfil."
          message={error}
          onRetry={() => setRetryCount(count => count + 1)}
        />
      )}

      {!loading && !error && profile && (
        <>
          <section className="panel org-hero-panel">
            <span className="status">
              {profile.type === 'ngo' ? 'ONG' : 'Protetor individual'} · Cadastro aprovado
            </span>
            <h1>{profile.name}</h1>
            {orgLocation && <p className="muted">⌖ {orgLocation}</p>}
            <p className="org-description">
              {profile.description || 'Cuidando de novos encontros e adoções responsáveis.'}
            </p>
            {profile.contact_publicly_visible && (profile.email || profile.phone) && (
              <div className="org-contact-box">
                <h2>Entre em contato</h2>
                {profile.email && (
                  <p><a href={`mailto:${profile.email}`}>{profile.email}</a></p>
                )}
                {profile.phone && <p>{profile.phone}</p>}
              </div>
            )}
          </section>

          <section className="org-pets-section">
            <h2>À espera de um lar</h2>
            {pets.length > 0 ? (
              <>
                <div className="pet-grid">
                  {pets.map(pet => <PetCard key={pet.id} pet={pet} />)}
                </div>
                <Pagination page={page} meta={result.meta} onChange={setPage} />
              </>
            ) : (
              <EmptyState
                title="Nenhum animal disponível neste momento."
                description="Explore o catálogo completo para conhecer outros animais que aguardam adoção."
                actionLabel="Explorar catálogo"
                actionTo="/animais"
              />
            )}
          </section>

          <Reviews key={slug} slug={slug} />
        </>
      )}
    </main>
  )
}
