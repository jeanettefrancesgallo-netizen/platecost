import { describe, expect, it } from 'vitest'
import { convertToBaseUnit } from './units'

describe('convertToBaseUnit', () => {
  it('converts kg to g', () => {
    expect(convertToBaseUnit(1, 'kg', 'g')).toBeCloseTo(1000)
  })

  it('converts l to ml', () => {
    expect(convertToBaseUnit(1.5, 'l', 'ml')).toBeCloseTo(1500)
  })

  it('converts oz to g', () => {
    expect(convertToBaseUnit(1, 'oz', 'g')).toBeCloseTo(28.3495)
  })

  it('converts fl oz to ml', () => {
    expect(convertToBaseUnit(1, 'fl oz', 'ml')).toBeCloseTo(29.5735)
  })

  it('is a no-op for matching units', () => {
    expect(convertToBaseUnit(250, 'g', 'g')).toBe(250)
    expect(convertToBaseUnit(3, 'each', 'each')).toBe(3)
  })

  it('rejects an incompatible unit for the base unit', () => {
    expect(() => convertToBaseUnit(1, 'l', 'g')).toThrow()
    expect(() => convertToBaseUnit(1, 'kg', 'ml')).toThrow()
    expect(() => convertToBaseUnit(1, 'kg', 'each')).toThrow()
  })

  it('rejects an unknown unit', () => {
    expect(() => convertToBaseUnit(1, 'gallon', 'ml')).toThrow()
  })
})
