import { test, expect } from '@playwright/test'

const samplePet = {
  id: 'p1',
  slug: 'luna-gatinha-com-nome-muito-longo-para-testar-quebra',
  name: 'Luna Gatinha Carinhosa de Porto Ferreira',
  species: 'cat',
  sex: 'female',
  size: 'small',
  approximate_age: '1 ano',
  personality: ['Calma', 'Carinhosa'],
  status: 'published',
  cover_photo: '/demo-pets/luna.png',
  location: { city: 'Porto Ferreira', state: 'SP' },
  organization: { name: 'Amigos de Porto Ferreira', slug: 'amigos-pf' },
}

async function mockCommonRoutes(page, petsHandler) {
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }))
  await page.route('https://fonts.gstatic.com/**', route => route.abort())
  await page.route('**/sanctum/csrf-cookie', route => route.fulfill({ status: 204 }))
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ status: 401, json: {} })
    if (url.pathname.endsWith('/pets')) return petsHandler(route, url)
    return route.fulfill({ status: 200, json: { data: [] } })
  })
}

test('home separates API error from truly empty catalog and supports retry', async ({ page }) => {
  let fail = true
  await mockCommonRoutes(page, route => {
    if (fail) return route.fulfill({ status: 500, json: { message: 'Serviço temporariamente indisponível.' } })
    return route.fulfill({ status: 200, json: { data: [samplePet], meta: { current_page: 1, last_page: 1, total: 1 } } })
  })

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar os destaques agora.')
  await expect(page.getByText('Novos amigos chegarão em breve.')).toHaveCount(0)

  fail = false
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('heading', { name: samplePet.name })).toBeVisible()
})

test('home shows empty state only when API succeeds with zero featured pets', async ({ page }) => {
  await mockCommonRoutes(page, route => route.fulfill({ status: 200, json: { data: [], meta: { current_page: 1, last_page: 1, total: 0 } } }))
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Novos amigos chegarão em breve.')).toBeVisible()
})

test('catalog distinguishes API error, filtered empty state, and truly empty state', async ({ page }) => {
  let mode = 'error'
  await mockCommonRoutes(page, route => {
    if (mode === 'error') return route.fulfill({ status: 503, json: { message: 'Falha de conexão.' } })
    return route.fulfill({ status: 200, json: { data: [], meta: { current_page: 1, last_page: 1, total: 0 } } })
  })

  await page.goto('/animais?species=dog', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar o catálogo.')
  await expect(page.getByText('Nenhum amigo encontrado com esses filtros.')).toHaveCount(0)

  mode = 'empty'
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByText('Nenhum amigo encontrado com esses filtros.')).toBeVisible()

  await page.getByRole('button', { name: 'Limpar filtros' }).first().click()
  await expect(page).toHaveURL(/\/animais$/)
  await expect(page.getByText('Ainda não há animais publicados no catálogo.')).toBeVisible()
})

test('pet card falls back gracefully when image URL is broken', async ({ page }) => {
  await page.route('**/broken-pet.jpg', route => route.fulfill({ status: 404, body: '' }))
  await mockCommonRoutes(page, route => route.fulfill({
    status: 200,
    json: {
      data: [{ ...samplePet, cover_photo: '/broken-pet.jpg' }],
      meta: { current_page: 1, last_page: 1, total: 1 },
    },
  }))

  await page.goto('/animais', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Foto em breve')).toBeVisible()
})

test('catalog mobile filters collapse at 320px, prioritize results, and avoid horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 })
  await mockCommonRoutes(page, (route, url) => {
    const species = url.searchParams.get('species')
    const data = species === 'cat' ? [samplePet] : [samplePet]
    return route.fulfill({ status: 200, json: { data, meta: { current_page: 1, last_page: 1, total: data.length } } })
  })

  await page.goto('/animais', { waitUntil: 'domcontentloaded' })
  const toggle = page.locator('button.catalog-filters-toggle')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('#catalog-filters-form')).toBeHidden()
  await expect(page.getByRole('heading', { name: samplePet.name })).toBeVisible()

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('#catalog-filters-form')).toBeVisible()

  await page.getByLabel('ESPÉCIE').selectOption('cat')
  await page.getByRole('button', { name: /Buscar amigos/i }).click()
  await expect(page).toHaveURL(/\/animais\?species=cat$/)
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

for (const width of [320, 375, 768, 1024, 1440]) {
  test(`home and catalog render without horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 820 })
    await mockCommonRoutes(page, route => route.fulfill({
      status: 200,
      json: { data: [samplePet], meta: { current_page: 1, last_page: 1, total: 1 } },
    }))

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: samplePet.name })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

    await page.goto('/animais', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: samplePet.name })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
}

