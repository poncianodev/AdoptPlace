import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { ErrorState, LoadingState } from '../components/CatalogStates'

const labels = {
  dog: 'Cachorro',
  cat: 'Gato',
  other: 'Outro',
  male: 'Macho',
  female: 'Fêmea',
  unknown: 'A confirmar',
  small: 'Pequeno',
  medium: 'Médio',
  large: 'Grande',
}

const healthLabels = {
  vaccinated: 'Vacinado(a)',
  neutered: 'Castrado(a)',
  dewormed: 'Vermifugado(a)',
  special_needs: 'Necessidades especiais',
}

function formatHealthBadges(rawHealth) {
  if (Array.isArray(rawHealth)) {
    return rawHealth
      .filter(item => typeof item === 'string' && item.trim() && item !== 'notes')
      .map(item => healthLabels[item] || item)
  }
  if (!rawHealth || typeof rawHealth !== 'object') {
    return []
  }
  return Object.entries(rawHealth)
    .filter(([key, value]) => key !== 'notes' && Boolean(value))
    .map(([key]) => healthLabels[key] || key.replaceAll('_', ' '))
}

export default function PetDetail() {
  const { user, loading: authLoading } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [retryCount, setRetryCount] = useState(0)
  const requestKey = `${id}:${retryCount}`
  const [result, setResult] = useState({ key: '', pet: null, error: '', status: 0 })
  const [activePhoto, setActivePhoto] = useState(null)
  const [failedPhotos, setFailedPhotos] = useState({})
  const [formOpen, setFormOpen] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    api.pet(id)
      .then(data => {
        if (active) setResult({ key: requestKey, pet: data, error: '', status: 200 })
      })
      .catch(err => {
        if (active) {
          setResult({
            key: requestKey,
            pet: null,
            error: err.message || 'Não foi possível carregar este animal.',
            status: err.status || 0,
          })
        }
      })
    return () => { active = false }
  }, [id, requestKey])

  const loading = result.key !== requestKey
  const pet = loading ? null : result.pet
  const error = loading ? '' : result.error

  if (loading) {
    return (
      <main id="main" className="container detail">
        <LoadingState message="Buscando esse bichinho…" />
      </main>
    )
  }

  if (!pet) {
    const isNotFound = result.status === 404
    return (
      <main id="main" className="container detail">
        <div className="detail-top">
          <Link to="/animais">← Voltar para o catálogo</Link>
        </div>
        {isNotFound ? (
          <div className="empty state-box">
            <span className="empty-heart" aria-hidden="true">♡</span>
            <h1>Esse bichinho não foi encontrado</h1>
            <p>{error || 'Ele pode já ter sido adotado ou não estar mais disponível.'}</p>
            <Link className="button" to="/animais">Explorar catálogo</Link>
          </div>
        ) : (
          <ErrorState
            title="Não foi possível carregar este perfil."
            message={error}
            onRetry={() => setRetryCount(count => count + 1)}
          />
        )}
      </main>
    )
  }

  const galleryPhotos = Array.isArray(pet.photos)
    ? pet.photos.map(item => (typeof item === 'string' ? item : item?.url)).filter(Boolean)
    : []
  const rawPhotos = [
    ...(pet.cover_photo ? [pet.cover_photo] : []),
    ...galleryPhotos,
  ]
  const allPhotos = Array.from(new Set(rawPhotos))
  const photo = (activePhoto && allPhotos.includes(activePhoto))
    ? activePhoto
    : (allPhotos[0] || null)
  const activeIndex = photo ? allPhotos.indexOf(photo) : -1
  const mainPhotoFailed = Boolean(photo && failedPhotos[photo])

  const health = formatHealthBadges(pet.health)
  const healthNotes = !Array.isArray(pet.health) && typeof pet.health?.notes === 'string'
    ? pet.health.notes.trim()
    : ''
  const locationParts = [pet.location?.neighborhood, pet.location?.city].filter(Boolean).join(' · ')
  const fullLocation = [locationParts, pet.location?.state].filter(Boolean).join(', ')
  const facts = [
    ['Espécie', labels[pet.species] || pet.species],
    ...(pet.breed ? [['Raça', pet.breed]] : []),
    ['Idade', pet.approximate_age || 'A confirmar'],
    ['Porte', labels[pet.size] || pet.size],
    ['Sexo', labels[pet.sex] || pet.sex || 'A confirmar'],
  ]

  function markPhotoFailed(url) {
    if (!url) return
    setFailedPhotos(current => (current[url] ? current : { ...current, [url]: true }))
  }

  function handleGalleryKeyDown(event) {
    if (allPhotos.length <= 1) return
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      const next = allPhotos[(activeIndex + 1) % allPhotos.length]
      setActivePhoto(next)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      const prev = allPhotos[(activeIndex - 1 + allPhotos.length) % allPhotos.length]
      setActivePhoto(prev)
    }
  }

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: `Adote ${pet.name}`, url: window.location.href })
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href)
      }
      setMessage('Link pronto para compartilhar!')
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setMessage('Não foi possível copiar o link automaticamente.')
      }
    }
  }

  function handleAdoptClick() {
    if (!user) {
      navigate('/login', { state: { from: `${location.pathname}${location.search}` } })
      return
    }
    setFormOpen(value => !value)
  }

  const orgLocation = [pet.organization?.city, pet.organization?.state].filter(Boolean).join(', ')

  return (
    <main id="main" className="container detail">
      <div className="detail-top">
        <Link to="/animais" className="detail-back-link">← Voltar para o catálogo</Link>
        <button type="button" className="button button-outline button-small detail-share-button" onClick={share}>
          Compartilhar <span aria-hidden="true">↗</span>
        </button>
      </div>

      <div className="detail-grid">
        <div className="detail-main-column">
          <div className="detail-photo">
            <div className="detail-photo-frame">
              {photo && !mainPhotoFailed ? (
                <img
                  src={photo}
                  alt={`${pet.name} — foto ${activeIndex + 1} de ${allPhotos.length}`}
                  onError={() => markPhotoFailed(photo)}
                />
              ) : (
                <div className="detail-photo-fallback" aria-label={`Foto de ${pet.name} em breve`}>
                  <span aria-hidden="true">♡</span>
                  <p>{mainPhotoFailed ? 'Não foi possível carregar esta foto' : 'Foto em breve'}</p>
                </div>
              )}
              {allPhotos.length > 1 && (
                <span className="detail-photo-counter" aria-live="polite">
                  {activeIndex + 1} / {allPhotos.length}
                </span>
              )}
            </div>

            {allPhotos.length > 1 && (
              <div
                className="detail-gallery"
                role="group"
                aria-label="Galeria de fotos do animal"
                onKeyDown={handleGalleryKeyDown}
              >
                {allPhotos.map((url, index) => (
                  <button
                    key={`${url}-${index}`}
                    type="button"
                    className={`detail-thumb ${photo === url ? 'is-active' : ''}`}
                    aria-label={`Ver foto ${index + 1} de ${pet.name}`}
                    aria-pressed={photo === url}
                    onClick={() => setActivePhoto(url)}
                  >
                    {failedPhotos[url] ? (
                      <span className="detail-thumb-fallback" aria-hidden="true">♡</span>
                    ) : (
                      <img src={url} alt="" onError={() => markPhotoFailed(url)} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <section className="detail-story">
            <span className="eyebrow">UM POUQUINHO SOBRE MIM</span>
            <h2>Oi, eu sou {pet.name}!</h2>
            <p>{pet.description}</p>
            {pet.personality?.length > 0 && (
              <div className="tags">{pet.personality.map(tag => <span key={tag}>{tag}</span>)}</div>
            )}
            <h3>Cuidados de saúde</h3>
            {health.length > 0 && (
              <div className="health">{health.map(item => <span key={item}>✓ {item}</span>)}</div>
            )}
            {healthNotes && <p className="health-notes">{healthNotes}</p>}
            <p className="muted">Confirme o histórico e as necessidades de saúde diretamente com a organização.</p>
          </section>
        </div>

        <aside className="adoption-card">
          <span className={`status ${pet.status === 'adopted' ? 'adopted' : ''}`}>
            {pet.status === 'adoption_in_progress'
              ? '● Reservado — em processo de adoção'
              : pet.status === 'adopted'
                ? '● Já encontrou um lar'
                : '● À espera de uma família'}
          </span>
          <h1>{pet.name}</h1>
          {fullLocation && <p className="muted detail-location">⌖ {fullLocation}</p>}

          <div className="pet-facts">
            {facts.map(([label, value]) => (
              <div key={label}>
                <small>{label}</small>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          <hr />
          <h3>Um lar é um compromisso para a vida.</h3>
          <p>Conte um pouco sobre você para quem cuida de {pet.name}.</p>

          {(!pet.status || pet.status === 'published') ? (
            <button
              type="button"
              className="button full-width"
              disabled={authLoading}
              aria-expanded={formOpen}
              onClick={handleAdoptClick}
            >
              {formOpen ? 'Fechar formulário' : `Quero adotar ${pet.name} ↗`}
            </button>
          ) : (
            <p className="muted">
              {pet.status === 'adoption_in_progress'
                ? 'Este animal está reservado em processo de adoção no momento.'
                : 'Este animal já foi adotado.'}
            </p>
          )}

          <p className="small muted">Seus dados serão enviados somente à organização responsável.</p>

          {pet.organization && (
            <div className="detail-org-wrap">
              <span className="detail-org-label">Responsável pelo animal</span>
              <Link className="organization" to={`/organizacoes/${pet.organization.slug}`}>
                <span className="org-avatar" aria-hidden="true">♡</span>
                <div>
                  <strong>{pet.organization.name} ↗</strong>
                  {orgLocation && <small>{orgLocation}</small>}
                  <small>Ver perfil da organização</small>
                </div>
              </Link>
            </div>
          )}
        </aside>
      </div>

      {formOpen && (!pet.status || pet.status === 'published') && user && (
        <AdoptionForm
          pet={pet}
          user={user}
          onSuccess={() => {
            setFormOpen(false)
            setMessage('Interesse enviado! Acompanhe o andamento em Minha conta.')
          }}
        />
      )}
      {message && <p role="status" className="feedback">{message}</p>}
    </main>
  )
}

function AdoptionForm({ pet, user, onSuccess }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    const data = Object.fromEntries(new FormData(event.currentTarget))
    data.has_other_pets = data.has_other_pets === '1'
    try { await api.adoptionRequest(pet.id, data); onSuccess() }
    catch (err) { setError(Object.values(err.errors || {}).flat().join(' ') || err.message) }
    finally { setBusy(false) }
  }
  return (
    <section className="panel">
      <span className="eyebrow">ADOÇÃO RESPONSÁVEL</span>
      <h2>Conte sobre o futuro lar de {pet.name}</h2>
      <form onSubmit={submit} className="adoption-form">
        <label className="field">Nome completo<input name="name" defaultValue={user?.name || ''} required maxLength={120} /></label>
        <label className="field">E-mail<input name="email" type="email" defaultValue={user?.email || ''} required /></label>
        <label className="field">Telefone/WhatsApp<input name="phone" required maxLength={30} /></label>
        <label className="field">Cidade<input name="city" required /></label>
        <label className="field">Estado (UF)<input name="state" required minLength={2} maxLength={2} /></label>
        <label className="field">Tipo de moradia<select name="housing_type" required><option value="">Selecione</option><option value="house">Casa</option><option value="apartment">Apartamento</option><option value="farm">Sítio ou fazenda</option><option value="other">Outro</option></select></label>
        <label className="field">Possui outros animais?<select name="has_other_pets" required><option value="0">Não</option><option value="1">Sim</option></select></label>
        <label className="field">Experiência com animais<textarea name="experience" maxLength={1000} /></label>
        <label className="field">Por que deseja adotar?<textarea name="message" required minLength={20} maxLength={2000} /></label>
        <label className="checkbox-label"><input name="privacy_consent" value="1" type="checkbox" required /> Autorizo o envio destes dados à organização responsável por este animal.</label>
        <button className="button" disabled={busy}>{busy ? 'Enviando…' : 'Enviar interesse'}</button>
        {error && <p className="feedback" role="alert">{error}</p>}
      </form>
    </section>
  )
}
