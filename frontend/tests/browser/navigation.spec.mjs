import { test, expect } from '@playwright/test'

async function setupNavApi(page, user = null) {
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }))
  await page.route('https://fonts.gstatic.com/**', route => route.abort())
  await page.route('**/sanctum/csrf-cookie', route => route.fulfill({ status: 204 }))
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname
    const reply = (data, status = 200) => route.fulfill({ status, json: data })
    if (path.endsWith('/auth/me')) return reply(user ? { data: user } : {}, user ? 200 : 401)
    if (path.endsWith('/auth/logout')) { user = null; return reply({}) }
    if (path.endsWith('/pets')) return reply({ data: [], meta: { current_page: 1, last_page: 1, total: 0 } })
    if (path.endsWith('/pets/missing')) return reply({ message: 'Animal não encontrado.' }, 404)
    return reply({ data: [], meta: { current_page: 1, last_page: 1, total: 0 } })
  })
}

test('public navigation shows institutional links and auth CTAs without ambiguous links', async ({ page }) => {
  await setupNavApi(page, null)
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  const header = page.locator('header.header')
  await expect(header.getByRole('link', { name: 'AdoptPlace, início' })).toHaveAttribute('href', '/')
  const nav = header.getByRole('navigation', { name: 'Navegação principal' })
  await expect(nav.getByRole('link', { name: 'Início' })).toHaveAttribute('href', '/')
  await expect(nav.getByRole('link', { name: 'Como funciona' })).toHaveAttribute('href', '/#como-funciona')
  await expect(nav.getByRole('link', { name: 'Explorar animais' })).toHaveAttribute('href', '/animais')
  await expect(nav.getByRole('link', { name: 'ONGs e protetores' })).toHaveCount(0)

  const actions = header.locator('.header-actions')
  await expect(actions.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
  await expect(actions.getByRole('link', { name: /Criar conta/i })).toHaveAttribute('href', '/cadastro')
})

test('authenticated adopter navigation hides institutional links, sets brand to /animais and restricts avatar menu', async ({ page }) => {
  await setupNavApi(page, { id: 'u1', name: 'Mariana Souza', role: 'adopter' })
  await page.goto('/animais', { waitUntil: 'domcontentloaded' })

  const header = page.locator('header.header')
  await expect(header.getByRole('link', { name: /AdoptPlace/i })).toHaveAttribute('href', '/animais')

  const nav = header.getByRole('navigation', { name: 'Navegação principal' })
  await expect(nav.getByRole('link', { name: 'Animais', exact: true })).toHaveAttribute('href', '/animais')
  await expect(nav.getByRole('link', { name: 'Início' })).toHaveCount(0)
  await expect(nav.getByRole('link', { name: 'Como funciona' })).toHaveCount(0)
  await expect(nav.getByRole('link', { name: 'Explorar animais' })).toHaveCount(0)

  const trigger = header.getByRole('button', { name: 'Menu da conta de Mariana Souza' })
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(trigger.locator('.user-avatar')).toHaveText('MS')
  await trigger.click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')

  const menu = header.getByRole('menu')
  await expect(menu.getByRole('menuitem', { name: 'Minha conta' })).toHaveAttribute('href', '/minha-conta')
  await expect(menu.getByRole('menuitem', { name: 'Sair' })).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: 'Painel da organização' })).toHaveCount(0)
  await expect(menu.getByRole('menuitem', { name: 'Administração' })).toHaveCount(0)
})

test('organization owner and admin see only their authorized panel links in avatar menu', async ({ page }) => {
  await setupNavApi(page, { id: 'u2', name: 'Clara ONG', role: 'organization_owner' })
  await page.goto('/animais', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('header.header').getByRole('link', { name: /AdoptPlace/i })).toHaveAttribute('href', '/dashboard')
  await page.getByRole('button', { name: 'Menu da conta de Clara ONG' }).click()
  await expect(page.getByRole('menuitem', { name: 'Painel da organização' })).toHaveAttribute('href', '/dashboard')
  await expect(page.getByRole('menuitem', { name: 'Minha conta' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Administração' })).toHaveCount(0)

  await setupNavApi(page, { id: 'u3', name: 'Carlos Admin', role: 'admin' })
  await page.goto('/animais', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('header.header').getByRole('link', { name: /AdoptPlace/i })).toHaveAttribute('href', '/administracao')
  await page.getByRole('button', { name: 'Menu da conta de Carlos Admin' }).click()
  await expect(page.getByRole('menuitem', { name: 'Administração' })).toHaveAttribute('href', '/administracao')
  await expect(page.getByRole('menuitem', { name: 'Minha conta' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Painel da organização' })).toHaveCount(0)
})

test('avatar menu supports keyboard navigation, Escape focus return and outside click', async ({ page }) => {
  await setupNavApi(page, { id: 'u1', name: 'Mariana Souza', role: 'adopter' })
  await page.goto('/animais', { waitUntil: 'domcontentloaded' })

  const trigger = page.getByRole('button', { name: 'Menu da conta de Mariana Souza' })
  await trigger.focus()
  await page.keyboard.press('ArrowDown')

  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: 'Minha conta' })).toBeFocused()

  await page.keyboard.press('ArrowDown')
  await expect(menu.getByRole('menuitem', { name: 'Sair' })).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
  await expect(trigger).toBeFocused()

  await trigger.click()
  await expect(menu).toBeVisible()
  await page.locator('main#main').click({ position: { x: 10, y: 10 } })
  await expect(menu).toHaveCount(0)
})

for (const width of [320, 375]) {
  test(`mobile navigation and avatar menu work cleanly at ${width}px without overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 740 })
    await setupNavApi(page, null)
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const menuBtn = page.getByRole('button', { name: /Abrir menu|Fechar menu/ })
    await expect(menuBtn).toHaveAttribute('aria-expanded', 'false')
    await menuBtn.click()
    await expect(menuBtn).toHaveAttribute('aria-expanded', 'true')

    const nav = page.locator('header.header nav')
    await expect(nav).toHaveClass(/is-open/)
    await expect(nav.getByRole('link', { name: 'Entrar' })).toBeVisible()
    await expect(nav.getByRole('link', { name: /Criar conta/i })).toBeVisible()

    await nav.getByRole('link', { name: 'Explorar animais' }).click()
    await expect(page).toHaveURL(/\/animais$/)
    await expect(nav).not.toHaveClass(/is-open/)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

    await setupNavApi(page, { id: 'u1', name: 'Mariana Souza', role: 'adopter' })
    await page.goto('/animais', { waitUntil: 'domcontentloaded' })
    const avatarTrigger = page.getByRole('button', { name: 'Menu da conta de Mariana Souza' })
    await avatarTrigger.click()
    const dropdown = page.getByRole('menu')
    await expect(dropdown).toBeVisible()
    const box = await dropdown.boundingBox()
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(width)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
}

test('skip link target #main exists even on error states', async ({ page }) => {
  await setupNavApi(page, null)
  await page.goto('/pets/missing', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('a.skip-link')).toHaveAttribute('href', '#main')
  await expect(page.locator('main#main')).toBeVisible()
})

