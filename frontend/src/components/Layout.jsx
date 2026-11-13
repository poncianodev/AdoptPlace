import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { defaultPathForUser, useAuth } from '../context/AuthContext'
import UserMenu from './UserMenu'
import logo from '../assets/adoptplace-logo.png'

const AUTHENTICATED_NAV_ITEMS = [
  { to: '/animais', label: 'Animais' },
  // Estrutura preparada para o futuro diretório de ONGs e protetores (etapa posterior).
]

function brandDestinationForUser(user) {
  if (!user) return { to: '/', ariaLabel: 'AdoptPlace, início' }
  if (user.role === 'admin') return { to: defaultPathForUser(user), ariaLabel: 'AdoptPlace, administração' }
  if (user.role === 'adopter') return { to: defaultPathForUser(user), ariaLabel: 'AdoptPlace, catálogo de animais' }
  return { to: defaultPathForUser(user), ariaLabel: 'AdoptPlace, painel da organização' }
}

export function Brand({ to = '/', ariaLabel = 'AdoptPlace, início' }) {
  return (
    <Link to={to} className="brand" aria-label={ariaLabel}>
      <img src={logo} alt="" />
      <span>
        adopt<span>place</span>
        <small>ENCONTROS QUE TRANSFORMAM</small>
      </span>
    </Link>
  )
}

export function Header() {
  const { pathname, hash } = useLocation()
  const navigate = useNavigate()
  const routeKey = `${pathname}${hash}`
  const [openRoute, setOpenRoute] = useState(null)
  const open = openRoute === routeKey
  const { user, loading, logout } = useAuth()
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState('')
  const headerRef = useRef(null)
  const menuButtonRef = useRef(null)
  const navId = useId()

  useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        setOpenRoute(null)
        menuButtonRef.current?.focus()
      }
    }

    const handlePointerDown = event => {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        setOpenRoute(null)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [open])

  async function signOut() {
    setLeaving(true)
    setError('')
    try {
      await logout()
      setOpenRoute(null)
      navigate('/login', { replace: true, state: null })
    } catch {
      setError('Não foi possível sair. Tente novamente.')
    } finally {
      setLeaving(false)
    }
  }

  if (['/administracao', '/minha-conta', '/dashboard'].includes(pathname)) {
    return <a className="skip-link" href="#main">Pular para o conteúdo</a>
  }

  const brand = brandDestinationForUser(user)
  const closeNav = () => setOpenRoute(null)

  return (
    <>
      <a className="skip-link" href="#main">Pular para o conteúdo</a>
      <header className="header" ref={headerRef}>
        <div className="container header-inner">
          <Brand to={brand.to} ariaLabel={brand.ariaLabel} />

          <nav id={navId} className={open ? 'is-open' : ''} aria-label="Navegação principal">
            {user ? (
              AUTHENTICATED_NAV_ITEMS.map(item => (
                <NavLink key={item.to} onClick={closeNav} to={item.to}>
                  {item.label}
                </NavLink>
              ))
            ) : (
              <>
                <NavLink onClick={closeNav} to="/" end>Início</NavLink>
                <Link onClick={closeNav} to="/#como-funciona">Como funciona</Link>
                <NavLink onClick={closeNav} to="/animais">Explorar animais</NavLink>
                {!loading && (
                  <div className="mobile-nav-actions">
                    <Link onClick={closeNav} to="/login" className="mobile-nav-link">Entrar</Link>
                    <Link onClick={closeNav} to="/cadastro" className="button button-small mobile-nav-cta">
                      Criar conta <span aria-hidden="true">↗</span>
                    </Link>
                  </div>
                )}
              </>
            )}
          </nav>

          <div className="header-actions">
            {!loading && !user && (
              <>
                <Link className="header-link" to="/login">Entrar</Link>
                <Link className="button button-small button-outline" to="/cadastro">
                  Criar conta <span aria-hidden="true">↗</span>
                </Link>
              </>
            )}

            {user && <UserMenu user={user} leaving={leaving} onSignOut={signOut} />}

            <button
              ref={menuButtonRef}
              className="menu-button"
              type="button"
              aria-label={open ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={open}
              aria-controls={navId}
              onClick={() => setOpenRoute(prev => (prev === routeKey ? null : routeKey))}
            >
              <span />
              <span />
            </button>
          </div>
        </div>
        {error && <p className="container field-error" role="alert">{error}</p>}
      </header>
    </>
  )
}

export function Footer() {
  const { pathname } = useLocation()
  if (['/administracao', '/minha-conta', '/dashboard'].includes(pathname)) return null
  return (
    <footer className="footer">
      <div className="container footer-main">
        <div>
          <Brand />
          <p>Uma plataforma sem fins lucrativos para aproximar <br />quem precisa de um lar de quem tem amor para dar.</p>
        </div>
        <div className="footer-links">
          <strong>Explore</strong>
          <Link to="/animais">Encontre um pet</Link>
          <Link to="/#como-funciona">Como funciona</Link>
        </div>
        <div className="footer-links">
          <strong>Para protetores</strong>
          <Link to="/cadastro">Cadastrar organização</Link>
          <Link to="/login">Acessar portal</Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© AdoptPlace · Feito para transformar encontros em histórias.</span>
        <span className="footer-signature">Adotar muda <em>duas</em> vidas. ♡</span>
      </div>
    </footer>
  )
}
