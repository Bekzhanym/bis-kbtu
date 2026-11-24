import 'package:family_budget/validation.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('amount (same rules as the website)', () {
    for (final v in ['-500', '0', '', '  ', 'abc', '10.123', '1e5', '99999999999']) {
      test('rejects "$v"', () => expect(validateAmount(v), isNotNull));
    }
    for (final v in ['0.01', '1500', '1500.5', '1 500,50', '1,500.50', '1.500,50']) {
      test('accepts "$v"', () => expect(validateAmount(v), isNull));
    }
    test('normalizes separators', () {
      expect(normalizeAmount('1 500,50'), '1500.50');
      expect(normalizeAmount('1,234,567.89'), '1234567.89');
      expect(normalizeAmount('1.500,50'), '1500.50');
    });
  });

  group('email and password', () {
    test('email', () {
      expect(validateEmail('dana.m@example.com'), isNull);
      for (final v in ['', 'dana', 'a@b..com', '.a@b.com', 'a@-b.com']) {
        expect(validateEmail(v), isNotNull, reason: v);
      }
    });
    test('password needs letters and digits, any alphabet', () {
      expect(validatePassword('demo12345'), isNull);
      expect(validatePassword('әңүөқғ12'), isNull);
      expect(validatePassword('aaaaaaaa'), isNotNull);
      expect(validatePassword('12345678'), isNotNull);
      expect(validatePassword('short1'), isNotNull);
    });
    test('name counts emoji as one character', () {
      expect(validateName('😀' * 60), isNull);
      expect(validateName('😀' * 101), isNotNull);
      expect(validateName('   '), isNotNull);
    });
  });

  test('expense date cannot be in the future', () {
    final today = DateTime(2026, 11, 24);
    expect(validateExpenseDate(DateTime(2026, 11, 24, 23), today: today), isNull);
    expect(validateExpenseDate(DateTime(2026, 11, 25), today: today), isNotNull);
    expect(validateExpenseDate(null), isNotNull);
  });
}
