// React side of i18n: provider, hook and the language switcher.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { LANGS, getCurrentLang, ru, setCurrentLang, translate, type Key, type Lang } from './i18nCore'

type I18n = { lang: Lang; setLang: (l: Lang) => void; t: (key: Key) => string }
const I18nContext = createContext<I18n>({ lang: 'ru', setLang: () => {}, t: (k) => ru[k] })

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getCurrentLang)
  useEffect(() => { document.documentElement.lang = lang }, [lang])
  const setLang = useCallback((l: Lang) => {
    setCurrentLang(l)
    setLangState(l)
  }, [])
  const t = useCallback((key: Key) => translate(lang, key), [lang])
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useI18n = () => useContext(I18nContext)

export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n()
  return (
    <div className="lang-switch" role="group" aria-label={t('header.language')}>
      {LANGS.map((l) => (
        <button key={l.code} type="button" aria-pressed={lang === l.code} className={lang === l.code ? 'active' : ''}
          onClick={() => setLang(l.code)}>{l.label}</button>
      ))}
    </div>
  )
}
