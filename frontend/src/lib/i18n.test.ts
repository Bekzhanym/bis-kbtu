import { describe, expect, it } from 'vitest'
import { DICTS, translate } from './i18nCore'

describe('i18n (24B032166)', () => {
  it('translates into Kazakh and English', () => {
    expect(translate('kk', 'nav.transactions')).toBe('Шығындар')
    expect(translate('en', 'nav.transactions')).toBe('Expenses')
    expect(translate('ru', 'nav.transactions')).toBe('Расходы')
  })
})

describe('dictionaries are complete', () => {
  it.each(['kk', 'en'] as const)('%s has every key', (lang) => {
    const missing = Object.keys(DICTS.ru).filter((k) => !(k in DICTS[lang]))
    expect(missing).toEqual([])
  })
})
