import { describe, expect, it } from 'vitest'
import {
  hasErrors, normalizeAmount, validateAmount, validateBudget, validateDate, validateEmail,
  validateCategoryId, validateLogin, validateMonth, validateName, validateNote, validatePassword,
  validatePasswordChange, validateRegister, validateTransaction,
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

// ---------- regression tests for bugs found in testing (24B032166, docs/test-reports.md) ----------
describe('bug fixes: dates that do not exist', () => {
  it.each(['2026-02-31', '2026-04-31', '2025-02-29', '2026-02-30'])('BUG-01: rejects %j', (v) => {
    expect(validateDate(v)).toBe('Такой даты нет')
  })
  it('accepts 29 Feb in a leap year', () => expect(validateDate('2028-02-29')).toBeUndefined())
  it('BUG-02: rejects years outside 1900..2100', () => {
    expect(validateDate('1899-12-31')).toBeDefined()
    expect(validateDate('2101-01-01')).toBeDefined()
  })
})

describe('bug fixes: budget month', () => {
  it.each(['2026-13', '2026-00'])('BUG-03: rejects month %j', (month) => {
    expect(validateBudget({ category_id: '1', month, monthly_limit: '5000' }).month).toBe('Некорректный месяц')
  })
  it('accepts a normal month', () => expect(validateMonth('2026-10')).toBeUndefined())
})

describe('bug fixes: category id', () => {
  it.each(['abc', '1.5', '-1', '0', ''])('BUG-04: rejects %j', (v) => expect(validateCategoryId(v)).toBeDefined())
})

describe('bug fixes: emails the server rejects', () => {
  it.each(['a@b..com', '.a@b.com', 'a.@b.com', 'a@-b.com'])('BUG-05: rejects %j', (v) => {
    expect(validateEmail(v)).toBeDefined()
  })
})

describe('bug fixes: length counted in characters, like the server', () => {
  it('BUG-06: 60 emoji is a valid name (was 120 UTF-16 units)', () => {
    expect(validateName('😀'.repeat(60))).toBeUndefined()
    expect(validateName('😀'.repeat(101))).toBeDefined()
  })
  it('BUG-06: 150 emoji is a valid note', () => expect(validateNote('😀'.repeat(150))).toBeUndefined())
})

describe('bug fixes: password letters', () => {
  it.each(['ёёёёёёё1', 'әңүөқғһі1'])('BUG-07: accepts %j (ё and Kazakh letters are letters)', (v) => {
    expect(validatePassword(v)).toBeUndefined()
  })
})

describe('bug fixes: thousands separator in amounts', () => {
  it.each([['1,500.50', '1500.50'], ['1.500,50', '1500.50'], ['1,234,567.89', '1234567.89']])(
    'BUG-09: %j -> %j', (input, out) => {
      expect(normalizeAmount(input)).toBe(out)
      expect(validateAmount(input)).toBeUndefined()
    })
  it('still rejects broken input', () => expect(validateAmount('1,5,0')).toBeDefined())
})
