import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

function getInitials(name) {
  if (typeof name !== 'string') return 'U'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function getRoleLabel(role) {
  if (role === 'admin') return 'Administrador'
  if (role === 'organization_owner') return 'Organização / protetor'
  return 'Adotante'
}

export default function UserMenu({ user, leaving, onSignOut }) {
  const [openPath, setOpenPath] = useState(null)
  const { pathname } = useLocation()
  const open = openPath === pathname
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const focusTargetRef = useRef(null)
  const triggerId = useId()
  const menuId = useId()

  useEffect(() => {
    if (!open) return undefined

    const handlePointerDown = event => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpenPath(null)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  useEffect(() => {
    if (!open || !focusTargetRef.current) return
    const items = Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]') || [])
    if (!items.length) return
    const target = focusTargetRef.current === 'last' ? items[items.length - 1] : items[0]
    focusTargetRef.current = null
    target?.focus()
  }, [open])

  const items = [{ to: '/minha-conta', label: 'Minha conta' }]
  if (user.role === 'organization_owner') {
    items.push({ to: '/dashboard', label: 'Painel da organização' })
  } else if (user.role === 'admin') {
    items.push({ to: '/administracao', label: 'Administração' })
  }

  function handleTriggerClick(event) {
    if (!open && event.detail === 0) {
      focusTargetRef.current = 'first'
    }
    setOpenPath(prev => (prev === pathname ? null : pathname))
  }

  function handleTriggerKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusTargetRef.current = 'first'
      setOpenPath(pathname)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusTargetRef.current = 'last'
      setOpenPath(pathname)
    } else if (event.key === 'Escape' && open) {
      event.preventDefault()
      setOpenPath(null)
    }
  }

  function handleMenuKeyDown(event) {
    const menuItems = Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]') || [])
    const currentIndex = menuItems.indexOf(document.activeElement)

    if (event.key === 'Escape') {
      event.preventDefault()
      setOpenPath(null)
      triggerRef.current?.focus()
      return
    }
    if (event.key === 'Tab') {
      setOpenPath(null)
      return
    }
    if (!menuItems.length) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      const next = currentIndex >= 0 ? (currentIndex + 1) % menuItems.length : 0
      menuItems[next]?.focus()
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      const prev = currentIndex >= 0 ? (currentIndex - 1 + menuItems.length) % menuItems.length : menuItems.length - 1
      menuItems[prev]?.focus()
    } else if (event.key === 'Home') {
      event.preventDefault()
      menuItems[0]?.focus()
    } else if (event.key === 'End') {
      event.preventDefault()
      menuItems[menuItems.length - 1]?.focus()
    }
  }

  const displayName = user?.name?.trim() || 'Minha conta'

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        className="user-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Menu da conta de ${displayName}`}
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="user-avatar" aria-hidden="true">{getInitials(displayName)}</span>
        <span className="user-menu-name">{displayName}</span>
        <svg className="user-menu-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-labelledby={triggerId}
          className="user-menu-dropdown"
          onKeyDown={handleMenuKeyDown}
        >
          <div className="user-menu-summary">
            <strong>{displayName}</strong>
            <span>{getRoleLabel(user.role)}</span>
          </div>
          <div className="user-menu-divider" role="separator" />
          {items.map(item => (
            <Link
              key={item.to}
              to={item.to}
              role="menuitem"
              className="user-menu-item"
              onClick={() => setOpenPath(null)}
            >
              {item.label}
            </Link>
          ))}
          <div className="user-menu-divider" role="separator" />
          <button
            type="button"
            role="menuitem"
            className="user-menu-item user-menu-signout"
            disabled={leaving}
            onClick={() => {
              setOpenPath(null)
              onSignOut()
            }}
          >
            {leaving ? 'Saindo…' : 'Sair'}
          </button>
        </div>
      )}
    </div>
  )
}

