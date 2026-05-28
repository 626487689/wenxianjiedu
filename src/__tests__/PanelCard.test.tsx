import { render, screen } from '@testing-library/react'
import { PanelCard } from '../ui/components/PanelCard'
import { describe, it, expect } from 'vitest'

describe('PanelCard', () => {
  it('should render with default variant', () => {
    render(
      <PanelCard title="Test Panel">
        <div>Test content</div>
      </PanelCard>,
    )
    
    expect(screen.getByText('Test Panel')).toBeInTheDocument()
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('should render with elevated variant', () => {
    render(
      <PanelCard title="Elevated Panel" variant="elevated">
        <div>Elevated content</div>
      </PanelCard>,
    )
    
    expect(screen.getByText('Elevated Panel')).toBeInTheDocument()
    expect(screen.getByText('Elevated content')).toBeInTheDocument()
  })

  it('should render with subtle variant', () => {
    render(
      <PanelCard title="Subtle Panel" variant="subtle">
        <div>Subtle content</div>
      </PanelCard>,
    )
    
    expect(screen.getByText('Subtle Panel')).toBeInTheDocument()
    expect(screen.getByText('Subtle content')).toBeInTheDocument()
  })

  it('should render extra content', () => {
    render(
      <PanelCard title="Panel with Extra" extra="Extra info">
        <div>Content</div>
      </PanelCard>,
    )
    
    expect(screen.getByText('Panel with Extra')).toBeInTheDocument()
    expect(screen.getByText('Extra info')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('should apply animation class', () => {
    const { container } = render(
      <PanelCard title="Animated Panel">
        <div>Content</div>
      </PanelCard>,
    )
    
    const section = container.querySelector('section')
    expect(section).toHaveClass('animate-fadeIn')
  })
})
