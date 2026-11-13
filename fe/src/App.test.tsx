import { render, screen } from '@testing-library/react'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { PlaneProvider } from './context/PlaneProvider'
import { PlanesProvider } from './context/PlanesProvider'
import { FakeWebSocket } from './test/fakeWebSocket'

function renderApp() {
  return render(
    <PlanesProvider>
      <PlaneProvider>
        <App />
      </PlaneProvider>
    </PlanesProvider>,
  )
}

beforeAll(() => {
  vi.stubGlobal('WebSocket', FakeWebSocket)
})

afterAll(() => {
  vi.unstubAllGlobals()
})

beforeEach(() => {
  FakeWebSocket.reset()
})

describe('App', () => {
  it('renders the map container', () => {
    const { container } = renderApp()

    expect(container.querySelector('.map')).toBeInTheDocument()
  })

  it('renders the status bar', () => {
    renderApp()

    expect(screen.getByRole('contentinfo', { name: 'Status bar' })).toBeInTheDocument()
    expect(screen.getByText('Planes feed: Connecting')).toBeInTheDocument()
  })
})
