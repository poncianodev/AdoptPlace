import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PetCard from '../components/PetCard'
import { EmptyState, ErrorState, LoadingState } from '../components/CatalogStates'
import Pagination from '../components/Pagination'
import { preferredScrollBehavior } from '../utils/scroll'
import { api } from '../services/api'

const states = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ')
const emptyFilters = { species: '', size: '', sex: '', city: '', state: '' }

function readFiltersFromParams(searchParams) {
  return {
    species: searchParams.get('species') || '',
    size: searchParams.get('size') || '',
    sex: searchParams.get('sex') || '',
    city: searchParams.get('city') || '',
    state: (searchParams.get('state') || '').toUpperCase(),
  }
}

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams()
  const searchKey = searchParams.toString()
  const activeFilters = readFiltersFromParams(searchParams)
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1)

  const [draftState, setDraftState] = useState({ key: searchKey, values: activeFilters })
  const draft = draftState.key === searchKey ? draftState.values : activeFilters

  const [retryCount, setRetryCount] = useState(0)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const requestKey = `${searchKey}:${retryCount}`
  const [result, setResult] = useState({ key: '', data: [], meta: {}, error: '' })

  useEffect(() => {
    let active = true
    const params = new URLSearchParams(searchKey)
    const currentFilters = readFiltersFromParams(params)
    const currentPage = Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1)

    api.pets({ ...currentFilters, page: currentPage, per_page: 12 })
      .then(response => {
        if (!active) return
        setResult({
          key: requestKey,
          data: response?.data || [],
          meta: response?.meta || {},
          error: '',
        })
      })
      .catch(err => {
        if (!active) return
        setResult({
          key: requestKey,
          data: [],
          meta: {},
          error: err.message || 'Não foi possível carregar o catálogo de animais.',
        })
      })

    return () => { active = false }
  }, [searchKey, requestKey])

  const loading = result.key !== requestKey
  const error = loading ? '' : result.error
  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length
  const hasActiveFilters = activeFilterCount > 0
  const total = result.meta?.total ?? result.data.length

  function updateDraft(event) {
    const { name, value } = event.target
    setDraftState(current => {
      const base = current.key === searchKey ? current.values : activeFilters
      return { key: searchKey, values: { ...base, [name]: value } }
    })
  }

  function applyFilters(nextFilters, nextPage = 1) {
    const params = {}
    Object.entries(nextFilters).forEach(([key, value]) => {
      const trimmed = typeof value === 'string' ? value.trim() : value
      if (trimmed) params[key] = key === 'state' ? trimmed.toUpperCase() : trimmed
    })
    if (nextPage > 1) params.page = String(nextPage)
    setSearchParams(params)
  }

  function handleSubmit(event) {
    event.preventDefault()
    applyFilters(draft, 1)
    setFiltersOpen(false)
  }

  function clearFilters() {
    setDraftState({ key: '', values: emptyFilters })
    setSearchParams({})
    setFiltersOpen(false)
  }

  function handlePageChange(nextPage) {
    applyFilters(activeFilters, nextPage)
    window.scrollTo({ top: 0, behavior: preferredScrollBehavior() })
  }

  return (
    <main id="main" className="container catalog catalog-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">
            <i /> CATÁLOGO COMPLETO
          </span>
          <h1>
            Encontre um amigo para a{' '}
            <span className="serif-em">sua história.</span>
          </h1>
          <p className="muted">
            Pesquise entre os animais disponíveis para adoção responsável em ONGs e protetores aprovados.
          </p>
        </div>
      </div>

      <section className="catalog-filters" aria-label="Filtros do catálogo">
        <div className="catalog-filters-bar">
          <button
            type="button"
            className="catalog-filters-toggle"
            aria-expanded={filtersOpen}
            aria-controls="catalog-filters-form"
            onClick={() => setFiltersOpen(open => !open)}
          >
            <span>
              Filtros
              {activeFilterCount > 0 && (
                <span className="filter-count-badge">{activeFilterCount}</span>
              )}
            </span>
            <small>{filtersOpen ? 'Ocultar' : 'Mostrar'}</small>
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              className="button button-outline catalog-filters-clear-mobile"
              onClick={clearFilters}
            >
              Limpar filtros
            </button>
          )}
        </div>
        <form id="catalog-filters-form" className={`search-bar catalog-search-bar ${filtersOpen ? 'is-open' : ''}`} onSubmit={handleSubmit}>
          <label>
            <span>ESPÉCIE</span>
            <select name="species" value={draft.species} onChange={updateDraft}>
              <option value="">Todos os bichinhos</option>
              <option value="dog">Cachorro</option>
              <option value="cat">Gato</option>
              <option value="other">Outro</option>
            </select>
          </label>
          <label>
            <span>PORTE</span>
            <select name="size" value={draft.size} onChange={updateDraft}>
              <option value="">Todos os tamanhos</option>
              <option value="small">Pequeno</option>
              <option value="medium">Médio</option>
              <option value="large">Grande</option>
            </select>
          </label>
          <label>
            <span>SEXO</span>
            <select name="sex" value={draft.sex} onChange={updateDraft}>
              <option value="">Todos</option>
              <option value="female">Fêmea</option>
              <option value="male">Macho</option>
              <option value="unknown">Não identificado</option>
            </select>
          </label>
          <label>
            <span>CIDADE</span>
            <input
              name="city"
              value={draft.city}
              onChange={updateDraft}
              placeholder="Ex.: Porto Ferreira"
              maxLength={100}
            />
          </label>
          <label>
            <span>ESTADO (UF)</span>
            <select name="state" value={draft.state} onChange={updateDraft}>
              <option value="">Todos</option>
              {states.map(uf => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </label>
          <div className="catalog-filter-actions">
            <button className="button" type="submit" disabled={loading}>
              Buscar amigos ⌕
            </button>
            {hasActiveFilters && (
              <button
                className="button button-outline"
                type="button"
                onClick={clearFilters}
              >
                Limpar filtros
              </button>
            )}
          </div>
        </form>
      </section>

      <div className="catalog-meta">
        <span aria-live="polite">
          {loading
            ? 'Buscando animais disponíveis…'
            : error
              ? 'Não foi possível atualizar os resultados'
              : `${total} ${total === 1 ? 'amigo encontrado' : 'amigos encontrados'}`}
        </span>
        <span className="demo-label">
          {result.meta?.last_page > 1
            ? `Página ${page} de ${result.meta.last_page}`
            : hasActiveFilters
              ? `${activeFilterCount} ${activeFilterCount === 1 ? 'filtro ativo' : 'filtros ativos'}`
              : 'Organizações e protetores aprovados'}
        </span>
      </div>

      {error && (
        <ErrorState
          title="Não foi possível carregar o catálogo."
          message={error}
          onRetry={() => setRetryCount(count => count + 1)}
        />
      )}

      {!error && loading && (
        <LoadingState message="Carregando animais disponíveis…" />
      )}

      {!error && !loading && result.data.length > 0 && (
        <>
          <div className="pet-grid">
            {result.data.map(pet => (
              <PetCard key={pet.id} pet={pet} />
            ))}
          </div>
          <Pagination page={page} meta={result.meta} onChange={handlePageChange} />
        </>
      )}

      {!error && !loading && result.data.length === 0 && (
        hasActiveFilters ? (
          <EmptyState
            title="Nenhum amigo encontrado com esses filtros."
            description="Tente ajustar espécie, porte, sexo ou localização para visualizar outros animais disponíveis."
            actionLabel="Limpar filtros"
            onAction={clearFilters}
          />
        ) : (
          <EmptyState
            title="Ainda não há animais publicados no catálogo."
            description="Organizações e protetores aprovados publicam novos perfis continuamente. Volte em breve!"
          />
        )
      )}
    </main>
  )
}
