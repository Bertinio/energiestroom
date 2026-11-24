import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = resolve(process.cwd(), 'supabase/migrations/20261124190000_initial_schema.sql')
const migration = readFileSync(migrationPath, 'utf8')
const userTables = ['activities', 'daily_check_ins', 'planned_activities', 'evening_reflections']

describe('RLS-contract', () => {
  it.each(userTables)('schakelt RLS in voor %s', (table) => {
    expect(migration).toContain(`alter table public.${table} enable row level security`)
  })

  it('controleert eigenaarschap voor reads én writes in alle policies', () => {
    const policies = migration.match(/create policy[\s\S]*?with check \(\(select auth\.uid\(\)\) = user_id\);/g)
    expect(policies).toHaveLength(userTables.length)
    for (const policy of policies ?? []) {
      expect(policy).toContain('using ((select auth.uid()) = user_id)')
      expect(policy).toContain('with check ((select auth.uid()) = user_id)')
      expect(policy).toContain('to authenticated')
    }
  })

  it('geeft de anonieme rol geen tabeltoegang', () => {
    expect(migration).toContain(`revoke all on public.${userTables.join(', public.')} from anon`)
  })
})
