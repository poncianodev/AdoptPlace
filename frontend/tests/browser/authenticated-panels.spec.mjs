import { test, expect } from '@playwright/test'

const adopterUser = {
  id: 'u-adopter',
  name: 'Mariana Souza',
  email: 'mariana@example.test',
  role: 'adopter',
  email_verified_at: null,
}

const ngoUser = {
  id: 'u-ngo',
  name: 'Clara ONG',
  email: 'clara@amigospf.test',
  role: 'organization_owner',
  email_verified_at: '2026-11-01T10:00:00Z',
  organization: {
    id: 'o-1',
    name: 'Amigos de Porto Ferreira',
    slug: 'amigos-pf',
    type: 'ngo',
    city: 'Porto Ferreira',
    state: 'SP',
    email: 'contato@amigospf.test',
    phone: '19999999999',
    description: 'Resgate e adoção responsável.',
    contact_publicly_visible: true,
    verification_status: 'approved',
  },
}

const adminUser = {
  id: 'u-admin',
  name: 'Carlos Admin',
  email: 'admin@adoptplace.test',
  role: 'admin',
  email_verified_at: '2026-11-01T10:00:00Z',
}

async function mockAuthPanelApi(page, user, options = {}) {
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }))
  await page.route('https://fonts.gstatic.com/**', route => route.abort())
  await page.route('**/sanctum/csrf-cookie', route => route.fulfill({ status: 204 }))
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url())
    const path = url.pathname
    const method = route.request().method()

    if (path.endsWith('/auth/me')) return route.fulfill({ status: 200, json: { data: user } })
    if (path.endsWith('/account/adoptions')) {
      return route.fulfill({
        status: 200,
        json: {
          data: [
            {
              id: 'a1',
              status: 'approved',
              pet: { name: 'Bento Caramelo', organization: { name: 'Amigos de Porto Ferreira', slug: 'amigos-pf' } },
            },
          ],
          meta: { current_page: 1, last_page: 1 },
        },
      })
    }
    if (path.endsWith('/account/favorites')) {
      return route.fulfill({ status: 200, json: { data: [], meta: { current_page: 1, last_page: 1 } } })
    }
    if (path.endsWith('/organization/pets')) {
      return route.fulfill({
        status: 200,
        json: {
          data: [{ id: 'p1', slug: 'luna', name: 'Luna Gatinha', species: 'cat', size: 'small', approximate_age: '1 ano', status: 'published' }],
          meta: { current_page: 1, last_page: 1, total: 1 },
          counts: { total: 1, published: 1, draft: 0, adoption_in_progress: 0, adopted: 0, archived: 0 },
        },
      })
    }
    if (path.endsWith('/organization/adoption-requests')) {
      return route.fulfill({
        status: 200,
        json: {
          data: [
            {
              id: 'req-1',
              status: 'new',
              pet: { name: 'Luna Gatinha', status: 'published' },
              adopter: {
                name: 'Mariana Souza',
                email: 'mariana@example.test',
                phone: '19999999999',
                city: 'Porto Ferreira',
                state: 'SP',
                housing_type: 'house',
                has_other_pets: false,
                message: 'Tenho quintal telado e muito carinho.',
              },
            },
          ],
          meta: { current_page: 1, last_page: 1, total: 1 },
        },
      })
    }
    if (path.endsWith('/organization') && method === 'PUT') {
      const body = route.request().postDataJSON()
      return route.fulfill({ status: 200, json: { data: { ...ngoUser.organization, ...body } } })
    }
    if (path.endsWith('/admin/organizations')) {
      if (options.failAdmin?.()) return route.fulfill({ status: 503, json: { message: 'Serviço indisponível.' } })
      return route.fulfill({
        status: 200,
        json: {
          data: [{ ...ngoUser.organization, document: '11222333000181' }],
          meta: { current_page: 1, last_page: 1, total: 1 },
        },
      })
    }
    if (path.endsWith('/admin/reviews')) {
      if (options.failAdmin?.()) return route.fulfill({ status: 503, json: { message: 'Serviço indisponível.' } })
      return route.fulfill({ status: 200, json: { data: [], total: 0, current_page: 1, last_page: 1 } })
    }
    return route.fulfill({ status: 200, json: { data: [] } })
  })
}

test('minha conta shows account profile summary, verification badge and adoption actions', async ({ page }) => {
  await mockAuthPanelApi(page, adopterUser)
  await page.goto('/minha-conta', { waitUntil: 'domcontentloaded' })

  await expect(page.getByRole('heading', { name: 'Dados da conta' })).toBeVisible()
  await expect(page.getByText('mariana@example.test')).toBeVisible()
  await expect(page.getByText('Aguardando confirmação')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Recebi o animal: confirmar adoção' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cancelar solicitação' })).toBeVisible()
})

test('ngo dashboard updates organization profile and displays structured adoption requests', async ({ page }) => {
  await mockAuthPanelApi(page, ngoUser)
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })

  await expect(page.getByRole('heading', { name: 'Interesses de adoção' })).toBeVisible()
  await expect(page.getByText('Casa · Porto Ferreira/SP')).toBeVisible()

  await page.getByText('Editar apresentação e contato público').click()
  await page.getByRole('button', { name: 'Salvar perfil' }).click()
  await expect(page.getByText('Perfil atualizado.')).toBeVisible()
})

test('admin panel separates API error from empty list and recovers on retry', async ({ page }) => {
  let fail = true
  await mockAuthPanelApi(page, adminUser, { failAdmin: () => fail })
  await page.goto('/administracao', { waitUntil: 'domcontentloaded' })

  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar os cadastros.')
  fail = false
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('heading', { name: 'Amigos de Porto Ferreira' })).toBeVisible()
})

for (const width of [320, 375, 768, 1024, 1440]) {
  test(`authenticated panels render without horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 820 })

    await mockAuthPanelApi(page, adopterUser)
    await page.goto('/minha-conta', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Minha conta' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

    await mockAuthPanelApi(page, ngoUser)
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Seus bichinhos' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

    await mockAuthPanelApi(page, adminUser)
    await page.goto('/administracao', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Administração' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
}

