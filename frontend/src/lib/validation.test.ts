import { describe, expect, it } from 'vitest'
import {
  hasErrors, normalizeAmount, validateAmount, validateBudget, validateDate, validateEmail,
  validateLogin, validatePassword, validatePasswordChange, validateRegister, validateTransaction,
} from './validation'

describe('validateAmount (main action rule: amount > 0, max 2 decimals)', () => {
  it.each(['-500', '0', '0.00', '', '  ', 'abc', '10.123', '1e5', '99999999999'])('rejects %j', (v) => {
    expect(validateAmount(v)).toBeDefined()
  })
  it.each(['0.01', '1500', '1500.5', '65000.00', '1 500,50'])('accepts %j', (v) => {
    expect(validateAmount(v)).toBeUndefined()
  })
  it('normalizes spaces and comma', () => {
    expect(normalizeAmount('1 500,50')).toBe('1500.50')
  })
  it('gives a specific message for negative values', () => {
    expect(validateAmount('-500')).toBe('Сумма должна быть больше 0')
  })
})

describe('validateEmail', () => {
  it('accepts a normal address', () => expect(validateEmail('dana.m@example.com')).toBeUndefined())
  it.each(['', 'dana', 'dana@', '@example.com', 'a b@c.com'])('rejects %j', (v) => {
    expect(validateEmail(v)).toBeDefined()
  })
})

describe('validatePassword', () => {
  it.each(['', 'short1', 'onlyletters', '12345678'])('rejects %j', (v) => expect(validatePassword(v)).toBeDefined())
  it('accepts letters + digits, 8+ chars', () => expect(validatePassword('demo12345')).toBeUndefined())
})

describe('validateDate', () => {
  it('requires a date', () => expect(validateDate('')).toBeDefined())
  it('rejects garbage', () => expect(validateDate('2026-13-45')).toBeDefined())
  it('accepts ISO date', () => expect(validateDate('2026-10-21')).toBeUndefined())
})

describe('form validators', () => {
  it('login needs email and password', () => {
    expect(validateLogin({ email: '', password: '' })).toEqual({
      email: 'Введите email', password: 'Введите пароль',
    })
  })
  it('register checks password confirmation', () => {
    const e = validateRegister({ full_name: 'Dana', email: 'd@x.kz', password: 'secret123', confirm: 'secret124' })
    expect(Object.keys(e)).toEqual(['confirm'])
  })
  it('transaction: valid input has no errors', () => {
    const e = validateTransaction({ category_id: '1', amount: '6000', transaction_date: '2026-10-21', note: '' })
    expect(hasErrors(e)).toBe(false)
  })
  it('transaction: catches every bad field', () => {
    const e = validateTransaction({ category_id: '', amount: '0', transaction_date: '', note: 'x'.repeat(201) })
    expect(Object.keys(e).sort()).toEqual(['amount', 'category_id', 'note', 'transaction_date'])
  })
  it('budget needs a month and positive limit', () => {
    const e = validateBudget({ category_id: '1', month: '', monthly_limit: '-1' })
    expect(Object.keys(e).sort()).toEqual(['month', 'monthly_limit'])
  })
  it('new password must differ from current', () => {
    const e = validatePasswordChange({ current: 'demo12345', next: 'demo12345', confirm: 'demo12345' })
    expect(e.next).toBeDefined()
  })
})
