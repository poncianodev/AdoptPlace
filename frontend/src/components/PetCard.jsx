import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useFavorites } from '../context/FavoritesContext'

export function FavoriteButton({ pet }) {
  const { user, loading: authLoading } = useAuth()
  const { favorites, toggle } = useFavorites()
  const navigate = useNavigate()
  const location = useLocation()
  const selected = Boolean(user && favorites.includes(pet.id))
  function handleClick() {
    if (authLoading) return
    if (!user) {
      navigate('/login', { state: { from: `${location.pathname}${location.search}${location.hash}` } })
      return
    }
    toggle(pet.id)
  }
  return (
    <button
      type="button"
      className={`favorite ${selected ? 'selected' : ''}`}
      disabled={authLoading}
      aria-label={`${selected ? 'Remover' : 'Adicionar'} ${pet.name} ${selected ? 'dos' : 'aos'} favoritos`}
      aria-pressed={selected}
      onClick={handleClick}
    >
      <span aria-hidden="true">{selected ? '♥' : '♡'}</span>
    </button>
  )
}

export default function PetCard({ pet }) {
  const [failedImageUrl, setFailedImageUrl] = useState('')
  const slug = pet.slug || pet.id
  const image = pet.cover_photo || pet.photos?.[0]?.url || pet.image
  const showImage = Boolean(image) && failedImageUrl !== image
  const sex = { male: 'Macho', female: 'Fêmea', unknown: 'A confirmar' }[pet.sex] || pet.sex
  const sexSymbol = pet.sex === 'male' || sex === 'Macho' ? '♂ ' : pet.sex === 'female' || sex === 'Fêmea' ? '♀ ' : ''
  const size = { small: 'pequeno', medium: 'médio', large: 'grande' }[pet.size] || pet.size?.toLowerCase()
  const city = pet.location?.city || pet.city
  const state = pet.location?.state || pet.state
  const age = pet.approximate_age || pet.age || 'Idade a confirmar'
  const statusTag = pet.status === 'adoption_in_progress'
    ? 'Reservado — em adoção'
    : pet.status === 'adopted'
      ? 'Já encontrou um lar'
      : 'À espera de um lar'

  return (
    <article className="pet-card">
      <div className="pet-photo">
        <Link to={`/pets/${slug}`} aria-label={`Conhecer ${pet.name}`}>
          {showImage ? (
            <img
              src={image}
              alt={`${pet.name} esperando uma família`}
              loading="lazy"
              onError={() => setFailedImageUrl(image)}
            />
          ) : (
            <span className="pet-photo-fallback" aria-label={`Foto de ${pet.name} em breve`}>
              <span aria-hidden="true">♡</span>
              <small>Foto em breve</small>
            </span>
          )}
        </Link>
        <span className="photo-tag"><i /> {statusTag}</span>
        <FavoriteButton pet={pet} />
      </div>
      <div className="pet-card-body">
        <div className="row">
          <h3><Link to={`/pets/${slug}`}>{pet.name}</Link></h3>
          <span className="sex">{sexSymbol}{sex}</span>
        </div>
        <p className="muted">{age} · Porte {size}</p>
        <div className="tags">
          {(pet.personality || []).slice(0, 2).map(tag => <span key={tag}>{tag}</span>)}
        </div>
        <div className="card-bottom">
          <div className="pet-card-location">
            <span>⌖ {city}{state ? `, ${state}` : ''}</span>
            {pet.organization?.slug && (
              <small className="pet-card-org">
                <Link to={`/organizacoes/${pet.organization.slug}`}>{pet.organization.name}</Link>
              </small>
            )}
          </div>
          <Link to={`/pets/${slug}`} className="pet-card-cta">
            <span>Conhecer</span> ↗
          </Link>
        </div>
      </div>
    </article>
  )
}
