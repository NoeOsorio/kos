import config from '../../tailwind.config.js'

describe('tailwind color tokens', () => {
  it('defines bg-deep', () => {
    expect(config.theme.extend.colors['bg-deep']).toBe('#05000e')
  })
  it('defines purple-primary', () => {
    expect(config.theme.extend.colors['purple-primary']).toBe('#8b5cf6')
  })
  it('defines text-primary', () => {
    expect(config.theme.extend.colors['text-primary']).toBe('#f0eeff')
  })
})
