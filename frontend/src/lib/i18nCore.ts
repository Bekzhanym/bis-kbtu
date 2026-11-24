// Dictionaries and helpers (no React). Missing keys fall back to Russian.
export type Lang = 'ru' | 'kk' | 'en'
export const LANGS: { code: Lang; label: string; locale: string }[] = [
  { code: 'ru', label: 'Рус', locale: 'ru-RU' },
  { code: 'kk', label: 'Қаз', locale: 'kk-KZ' },
  { code: 'en', label: 'Eng', locale: 'en-GB' },
]

export const ru = {
  'app.title': 'Семейный бюджет',
  'nav.home': 'Главная', 'nav.transactions': 'Расходы', 'nav.report': 'Отчёт', 'nav.assistant': 'Помощник', 'nav.admin': 'Управление', 'nav.profile': 'Профиль',
  'header.logout': 'Выйти', 'header.language': 'Язык',
  'month.prev': 'Предыдущий месяц', 'month.next': 'Следующий месяц',
  'login.title': 'Вход', 'login.subtitle': 'Family Budget Tracker: семейные расходы и лимиты по месяцам',
  'login.password': 'Пароль', 'login.submit': 'Войти', 'login.busy': 'Вход…',
  'login.noAccount': 'Нет аккаунта?', 'login.register': 'Зарегистрироваться',
  'login.demo': 'Демо-аккаунты', 'login.demoPassword': 'Пароль у всех:', 'role.admin': 'админ', 'role.member': 'участник',
  'register.title': 'Регистрация',
  'register.subtitle': 'Новый аккаунт получает роль «участник». Права администратора выдаёт админ семьи.',
  'register.name': 'Имя и фамилия', 'register.password': 'Пароль', 'register.passwordHint': 'Минимум 8 символов, буквы и цифры',
  'register.confirm': 'Повторите пароль', 'register.submit': 'Создать аккаунт', 'register.busy': 'Создаём…',
  'register.haveAccount': 'Уже есть аккаунт?', 'register.login': 'Войти',
  'dashboard.hello': 'Привет', 'dashboard.subtitle': 'Сводка семейного бюджета за месяц',
  'transactions.title': 'Расходы', 'transactions.mine': 'Ваши расходы. Заметки видны только вам.',
  'transactions.all': 'Все расходы семьи. Чужие заметки скрыты.',
  'report.title': 'Месячный отчёт', 'report.subtitle': 'Общие итоги семьи. Email и заметки в отчёт не попадают.',
  'profile.title': 'Профиль', 'profile.role': 'Роль',
  'admin.title': 'Управление', 'admin.subtitle': 'Доступно только администраторам семьи',
}
export type Key = keyof typeof ru

const kk: Partial<Record<Key, string>> = {
  'app.title': 'Отбасылық бюджет',
  'nav.home': 'Басты бет', 'nav.transactions': 'Шығындар', 'nav.report': 'Есеп', 'nav.assistant': 'Көмекші', 'nav.admin': 'Басқару', 'nav.profile': 'Профиль',
  'header.logout': 'Шығу', 'header.language': 'Тіл',
  'month.prev': 'Алдыңғы ай', 'month.next': 'Келесі ай',
  'login.title': 'Кіру', 'login.subtitle': 'Family Budget Tracker: отбасы шығындары мен айлық лимиттер',
  'login.password': 'Құпиясөз', 'login.submit': 'Кіру', 'login.busy': 'Кіру…',
  'login.noAccount': 'Аккаунтыңыз жоқ па?', 'login.register': 'Тіркелу',
  'login.demo': 'Демо-аккаунттар', 'login.demoPassword': 'Барлығының құпиясөзі:', 'role.admin': 'әкімші', 'role.member': 'қатысушы',
  'register.title': 'Тіркелу',
  'register.subtitle': 'Жаңа аккаунт «қатысушы» рөлін алады. Әкімші құқығын отбасы әкімшісі береді.',
  'register.name': 'Аты-жөні', 'register.password': 'Құпиясөз', 'register.passwordHint': 'Кемінде 8 таңба, әріптер мен сандар',
  'register.confirm': 'Құпиясөзді қайталаңыз', 'register.submit': 'Аккаунт ашу', 'register.busy': 'Ашылуда…',
  'register.haveAccount': 'Аккаунтыңыз бар ма?', 'register.login': 'Кіру',
  'dashboard.hello': 'Сәлем', 'dashboard.subtitle': 'Айлық отбасы бюджетінің қысқаша мәліметі',
  'transactions.title': 'Шығындар', 'transactions.mine': 'Сіздің шығындарыңыз. Жазбаларды тек сіз көресіз.',
  'transactions.all': 'Отбасының барлық шығындары. Басқалардың жазбалары жасырын.',
  'report.title': 'Айлық есеп', 'report.subtitle': 'Отбасының жалпы қорытындысы. Email мен жазбалар есепке кірмейді.',
  'profile.title': 'Профиль', 'profile.role': 'Рөлі',
  'admin.title': 'Басқару', 'admin.subtitle': 'Тек отбасы әкімшілеріне қолжетімді',
}

const en: Partial<Record<Key, string>> = {
  'app.title': 'Family budget',
  'nav.home': 'Home', 'nav.transactions': 'Expenses', 'nav.report': 'Report', 'nav.assistant': 'Assistant', 'nav.admin': 'Manage', 'nav.profile': 'Profile',
  'header.logout': 'Log out', 'header.language': 'Language',
  'month.prev': 'Previous month', 'month.next': 'Next month',
  'login.title': 'Log in', 'login.subtitle': 'Family Budget Tracker: family expenses and monthly limits',
  'login.password': 'Password', 'login.submit': 'Log in', 'login.busy': 'Logging in…',
  'login.noAccount': 'No account yet?', 'login.register': 'Sign up',
  'login.demo': 'Demo accounts', 'login.demoPassword': 'Password for all:', 'role.admin': 'admin', 'role.member': 'member',
  'register.title': 'Sign up',
  'register.subtitle': 'New accounts get the “member” role. A family admin can grant admin rights.',
  'register.name': 'Full name', 'register.password': 'Password', 'register.passwordHint': 'At least 8 characters, letters and digits',
  'register.confirm': 'Repeat password', 'register.submit': 'Create account', 'register.busy': 'Creating…',
  'register.haveAccount': 'Already have an account?', 'register.login': 'Log in',
  'dashboard.hello': 'Hi', 'dashboard.subtitle': 'Family budget summary for the month',
  'transactions.title': 'Expenses', 'transactions.mine': 'Your expenses. Only you can see your notes.',
  'transactions.all': 'All family expenses. Other people’s notes are hidden.',
  'report.title': 'Monthly report', 'report.subtitle': 'Family totals. Emails and notes are not included.',
  'profile.title': 'Profile', 'profile.role': 'Role',
  'admin.title': 'Manage', 'admin.subtitle': 'Available to family admins only',
}

export const DICTS: Record<Lang, Partial<Record<Key, string>>> = { ru, kk, en }
const STORAGE_KEY = 'fbt_lang'

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'ru' || saved === 'kk' || saved === 'en') return saved
  } catch { /* storage unavailable */ }
  const nav = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : 'ru'
  return nav === 'kk' ? 'kk' : nav === 'en' ? 'en' : 'ru'
}

// Current locale for formatting helpers outside React (month names etc.)
let currentLang: Lang = initialLang()
export const getCurrentLang = () => currentLang
export function setCurrentLang(l: Lang) {
  currentLang = l
  try { localStorage.setItem(STORAGE_KEY, l) } catch { /* storage unavailable */ }
}
export const currentLocale = () => LANGS.find((l) => l.code === currentLang)!.locale

export function translate(lang: Lang, key: Key): string {
  return DICTS[lang][key] ?? ru[key]
}

