import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}))

const { default: App } = await import('./App')

describe('App', () => {
  it('redirects an unauthenticated visitor to the login page', async () => {
    render(<App />)
    expect(await screen.findByText(/log in to platecost/i)).toBeInTheDocument()
  })
})
