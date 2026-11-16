// Icons make categories recognisable at a glance. Unknown categories get a neutral icon.
const ICONS: [RegExp, string][] = [
  [/food|еда|продукт|grocer|кафе|restaurant/i, '🛒'],
  [/transport|транспорт|taxi|такси|fuel|бензин/i, '🚌'],
  [/entertain|развлеч|кино|movie|game/i, '🎬'],
  [/health|здоров|аптек|medic/i, '💊'],
  [/educat|образов|учеб|course/i, '📚'],
  [/home|дом|rent|аренд|util|коммун/i, '🏠'],
  [/cloth|одежд/i, '👕'],
  [/gift|подар/i, '🎁'],
  [/travel|путеш/i, '✈️'],
  [/kid|child|дет/i, '🧸'],
]

export function categoryIcon(name: string): string {
  return ICONS.find(([re]) => re.test(name))?.[1] ?? '💳'
}
