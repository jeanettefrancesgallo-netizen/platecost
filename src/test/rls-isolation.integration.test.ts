import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Database } from '@/types/database.types'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error(
    'RLS isolation test requires VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY and ' +
      'SUPABASE_SERVICE_ROLE_KEY (see .env.local) — it runs against the real Supabase project.',
  )
}

const admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY)

interface TestTenant {
  email: string
  userId: string
  client: ReturnType<typeof createClient<Database>>
  orgId: string
  ingredientId: string
}

async function createTenant(label: string): Promise<TestTenant> {
  const email = `rls-test-${label}-${Math.random().toString(36).slice(2, 8)}@platecost-dev.io`
  const password = 'RlsTest1234!'

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createError) throw createError

  const client = createClient<Database>(SUPABASE_URL, ANON_KEY)
  const { error: signInError } = await client.auth.signInWithPassword({ email, password })
  if (signInError) throw signInError

  const { data: org, error: orgError } = await client.rpc('create_organization_with_owner', {
    p_name: `RLS Test Org ${label}`,
    p_slug: `rls-test-${label}-${Math.random().toString(36).slice(2, 8)}`,
    p_base_currency: 'PHP',
  })
  if (orgError) throw orgError

  const { data: ingredient, error: ingredientError } = await client
    .from('ingredients')
    .insert({
      organization_id: org.id,
      name: `Secret ingredient (${label})`,
      base_unit: 'g',
      purchase_unit: 'kg',
      purchase_unit_quantity: 1,
      purchase_unit_cost: 100,
    })
    .select()
    .single()
  if (ingredientError) throw ingredientError

  return { email, userId: created.user.id, client, orgId: org.id, ingredientId: ingredient.id }
}

async function deleteTenant(tenant: TestTenant) {
  await admin.from('organizations').delete().eq('id', tenant.orgId)
  await admin.auth.admin.deleteUser(tenant.userId)
}

describe('RLS isolation between organizations', () => {
  let tenantA: TestTenant
  let tenantB: TestTenant

  beforeAll(async () => {
    ;[tenantA, tenantB] = await Promise.all([createTenant('a'), createTenant('b')])
  })

  afterAll(async () => {
    await Promise.all([deleteTenant(tenantA), deleteTenant(tenantB)])
  })

  it('cannot read another organization\'s row directly', async () => {
    const { data, error } = await tenantA.client
      .from('organizations')
      .select('*')
      .eq('id', tenantB.orgId)

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('cannot read another organization\'s ingredients', async () => {
    const { data, error } = await tenantA.client
      .from('ingredients')
      .select('*')
      .eq('organization_id', tenantB.orgId)

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('cannot read another organization\'s membership rows', async () => {
    const { data, error } = await tenantA.client
      .from('organization_members')
      .select('*')
      .eq('organization_id', tenantB.orgId)

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('cannot insert an ingredient into another organization', async () => {
    const { error } = await tenantA.client.from('ingredients').insert({
      organization_id: tenantB.orgId,
      name: 'Smuggled ingredient',
      base_unit: 'g',
      purchase_unit: 'kg',
      purchase_unit_quantity: 1,
      purchase_unit_cost: 1,
    })

    expect(error).not.toBeNull()
  })

  it('can read its own organization and ingredients', async () => {
    const orgResult = await tenantA.client.from('organizations').select('*').eq('id', tenantA.orgId)
    expect(orgResult.data).toHaveLength(1)

    const ingredientResult = await tenantA.client
      .from('ingredients')
      .select('*')
      .eq('id', tenantA.ingredientId)
    expect(ingredientResult.data).toHaveLength(1)
  })
})
