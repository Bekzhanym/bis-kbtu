import 'package:intl/intl.dart';

final _money = NumberFormat.decimalPatternDigits(locale: 'ru', decimalDigits: 0);

/// 128000 -> "128 000 ₸"; kopecks only when they exist
String kzt(double? v) {
  if (v == null) return '—';
  final whole = v == v.roundToDouble();
  final s = whole ? _money.format(v) : NumberFormat.decimalPatternDigits(locale: 'ru', decimalDigits: 2).format(v);
  return '${s.replaceAll(' ', ' ')} ₸';
}

String monthLabel(DateTime m) {
  final s = DateFormat('LLLL yyyy', 'ru').format(m);
  return s[0].toUpperCase() + s.substring(1);
}

String dateLabel(DateTime d) => DateFormat('d MMM', 'ru').format(d);

DateTime monthStart(DateTime d) => DateTime(d.year, d.month);

DateTime shiftMonth(DateTime m, int delta) => DateTime(m.year, m.month + delta);

/// Same icons as frontend/src/lib/categories.ts
const _icons = [
  ('food|еда|продукт|grocer|кафе|restaurant', '🛒'),
  ('transport|транспорт|taxi|такси|fuel|бензин', '🚌'),
  ('entertain|развлеч|кино|movie|game', '🎬'),
  ('health|здоров|аптек|medic', '💊'),
  ('educat|образов|учеб|course', '📚'),
  ('home|дом|rent|аренд|util|коммун', '🏠'),
];

String categoryIcon(String name) {
  for (final (pattern, icon) in _icons) {
    if (RegExp(pattern, caseSensitive: false).hasMatch(name)) return icon;
  }
  return '💳';
}
