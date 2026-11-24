// Client-side checks, the same rules as frontend/src/lib/validation.ts. The server re-checks everything.

final _emailRe = RegExp(r'^(?!\.)(?!.*\.\.)[^\s@]+(?<!\.)@(?!-)[^\s@.]+(\.[^\s@.]+)+$');
const _maxMoney = 9999999999.99;

String? validateName(String v, {int max = 100}) {
  final s = v.trim();
  if (s.isEmpty) return 'Обязательное поле';
  if (s.runes.length > max) return 'Не длиннее $max символов';
  return null;
}

String? validateEmail(String v) {
  final s = v.trim();
  if (s.isEmpty) return 'Введите email';
  if (s.length > 254) return 'Слишком длинный email';
  if (!_emailRe.hasMatch(s)) return 'Некорректный email';
  return null;
}

String? validatePassword(String v) {
  if (v.isEmpty) return 'Введите пароль';
  if (v.length < 8) return 'Минимум 8 символов';
  if (v.length > 128) return 'Не длиннее 128 символов';
  if (!RegExp(r'\p{L}', unicode: true).hasMatch(v) || !RegExp(r'\d').hasMatch(v)) {
    return 'Пароль должен содержать буквы и цифры';
  }
  return null;
}

/// "1 500,50", "1,500.50", "1.500,50" -> "1500.50"
String normalizeAmount(String v) {
  final s = v.replaceAll(RegExp(r'\s'), '');
  if (s.contains(',') && s.contains('.')) {
    final decimal = s.lastIndexOf(',') > s.lastIndexOf('.') ? ',' : '.';
    final thousands = decimal == ',' ? '.' : ',';
    return s.split(thousands).join().replaceFirst(decimal, '.');
  }
  return s.replaceFirst(',', '.');
}

String? validateAmount(String v) {
  final s = normalizeAmount(v);
  if (s.isEmpty) return 'Введите сумму';
  if (!RegExp(r'^-?\d+(\.\d+)?$').hasMatch(s)) return 'Сумма должна быть числом';
  final n = double.parse(s);
  if (n <= 0) return 'Сумма должна быть больше 0';
  if (!RegExp(r'^\d+(\.\d{1,2})?$').hasMatch(s)) return 'Не больше 2 знаков после запятой';
  if (n > _maxMoney) return 'Слишком большая сумма';
  return null;
}

String? validateExpenseDate(DateTime? d, {DateTime? today}) {
  if (d == null) return 'Укажите дату';
  final t = today ?? DateTime.now();
  if (DateTime(d.year, d.month, d.day).isAfter(DateTime(t.year, t.month, t.day))) {
    return 'Дата в будущем: расход ещё не случился';
  }
  return null;
}

String? validateNote(String v, {int max = 200}) =>
    v.trim().runes.length > max ? 'Не длиннее $max символов' : null;
