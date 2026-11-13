import { test, expect } from '@playwright/test'

const petMulti = {
  id: 'p1',
  slug: 'luna',
  name: 'Luna Gatinha Carinhosa',
  species: 'cat',
  breed: 'SRD',
  sex: 'female',
  size: 'small',
  approximate_age: '1 ano',
  description: 'Muito dócil e acostumada com ambientes tranquilos.',
  personality: ['Calma', 'Carinhosa'],
  health: { vaccinated: true, neutered: true, dewormed: false, special_needs: false, notes: 'Vacinação em dia.' },
  status: 'published',
  cover_photo: '/demo-pets/luna.png',
  photos: [{ url: '/demo-pets/luna.png' }, { url: '/demo-pets/pipoca.png' }],
  location: { neighborhood: 'Centro', city: 'Porto Ferreira', state: 'SP' },
  organization: { name: 'Amigos de Porto Ferreira', slug: 'amigos-pf', city: 'Porto Ferreira', state: 'SP' },
}

async function mockDetailRoutes(page, handlers = {}) {
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }))
  await page.route('https://fonts.gstatic.com/**', route => route.abort())
  await page.route('**/sanctum/csrf-cookie', route => route.fulfill({ status: 204 }))
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/auth/me')) return route.fulfill({ status: 401, json: {} })
    if (path.startsWith('/api/v1/pets/') && handlers.pet) return handlers.pet(route, path)
    if (path.endsWith('/organizations/amigos-pf/pets') && handlers.orgPets) return handlers.orgPets(route)
    if (path.endsWith('/organizations/amigos-pf/reviews') && handlers.orgReviews) return handlers.orgReviews(route)
    if (path.endsWith('/organizations/amigos-pf') && handlers.org) return handlers.org(route)
    return route.fulfill({ status: 200, json: { data: [] } })
  })
}

test('pet detail gallery supports single/multiple photos, keyboard navigation and broken image fallback', async ({ page }) => {
  await page.route('**/broken-detail.jpg', route => route.fulfill({ status: 404, body: '' }))
  await mockDetailRoutes(page, {
    pet: (route, path) => {
      if (path.endsWith('/single')) {
        return route.fulfill({ status: 200, json: { data: { ...petMulti, photos: [{ url: '/demo-pets/luna.png' }] } } })
      }
      if (path.endsWith('/broken')) {
        return route.fulfill({ status: 200, json: { data: { ...petMulti, cover_photo: '/broken-detail.jpg', photos: [{ url: '/broken-detail.jpg' }] } } })
      }
      return route.fulfill({ status: 200, json: { data: petMulti } })
    },
  })

  await page.goto('/pets/single', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.detail-gallery')).toHaveCount(0)

  await page.goto('/pets/luna', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.detail-photo-counter')).toHaveText('1 / 2')
  const thumb1 = page.getByRole('button', { name: 'Ver foto 1 de Luna Gatinha Carinhosa' })
  const thumb2 = page.getByRole('button', { name: 'Ver foto 2 de Luna Gatinha Carinhosa' })
  await expect(thumb1).toHaveAttribute('aria-pressed', 'true')

  await thumb1.focus()
  await page.keyboard.press('ArrowRight')
  await expect(thumb2).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.detail-photo-counter')).toHaveText('2 / 2')

  await page.goto('/pets/broken', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Não foi possível carregar esta foto')).toBeVisible()
})

test('pet detail distinguishes 404 not found from 500 API error with retry', async ({ page }) => {
  let fail = true
  await mockDetailRoutes(page, {
    pet: (route, path) => {
      if (path.endsWith('/missing')) return route.fulfill({ status: 404, json: { message: 'Animal não encontrado.' } })
      if (fail) return route.fulfill({ status: 500, json: { message: 'Erro temporário no servidor.' } })
      return route.fulfill({ status: 200, json: { data: petMulti } })
    },
  })

  await page.goto('/pets/missing', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Esse bichinho não foi encontrado' })).toBeVisible()

  await page.goto('/pets/luna', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar este perfil.')

  fail = false
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('heading', { name: petMulti.name, exact: true })).toBeVisible()
})

test('organization profile respects contact visibility, displays review summary and handles API errors', async ({ page }) => {
  let failOrg = true
  await mockDetailRoutes(page, {
    org: route => {
      if (failOrg) return route.fulfill({ status: 503, json: {} })
      return route.fulfill({
        status: 200,
        json: {
          data: {
            name: 'Amigos de Porto Ferreira',
            type: 'ngo',
            city: 'Porto Ferreira',
            state: 'SP',
            description: 'Resgate e adoção responsável.',
            contact_publicly_visible: false,
            email: 'privado@amigospf.test',
            phone: '19999999999',
          },
        },
      })
    },
    orgPets: route => route.fulfill({ status: 200, json: { data: [petMulti], meta: { current_page: 1, last_page: 1 } } }),
    orgReviews: route => route.fulfill({
      status: 200,
      json: {
        average: 4.5,
        count: 2,
        reviews: {
          current_page: 1,
          last_page: 1,
          data: [{ id: 'r1', rating: 5, author: 'Mariana', comment: 'Atendimento muito atencioso!' }],
        },
      },
    }),
  })

  await page.goto('/organizacoes/amigos-pf', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar este perfil.')

  failOrg = false
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('heading', { name: 'Amigos de Porto Ferreira' })).toBeVisible()
  await expect(page.getByText('privado@amigospf.test')).toHaveCount(0)
  await expect(page.getByText('4.5')).toBeVisible()
  await expect(page.getByText('Atendimento muito atencioso!')).toBeVisible()
})

for (const width of [320, 375, 768, 1024, 1440]) {
  test(`pet detail and organization profile have no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 820 })
    await mockDetailRoutes(page, {
      pet: route => route.fulfill({ status: 200, json: { data: petMulti } }),
      org: route => route.fulfill({
        status: 200,
        json: {
          data: {
            name: 'Amigos de Porto Ferreira',
            type: 'ngo',
            city: 'Porto Ferreira',
            state: 'SP',
            description: 'Resgate e adoção responsável.',
            contact_publicly_visible: true,
            email: 'contato@amigospf.test',
          },
        },
      }),
      orgPets: route => route.fulfill({ status: 200, json: { data: [petMulti], meta: { current_page: 1, last_page: 1 } } }),
      orgReviews: route => route.fulfill({
        status: 200,
        json: { average: 5, count: 1, reviews: { current_page: 1, last_page: 1, data: [{ id: 'r1', rating: 5, author: 'Ana', comment: 'Excelente experiência.' }] } },
      }),
    })

    await page.goto('/pets/luna', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: petMulti.name, exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

    await page.goto('/organizacoes/amigos-pf', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Amigos de Porto Ferreira' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
}

