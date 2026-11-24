import 'package:family_budget/api/api_client.dart';
import 'package:family_budget/auth.dart';
import 'package:family_budget/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/testing.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'api_client_test.dart' show MemoryTokens;

void main() {
  setUpAll(() => initializeDateFormatting('ru'));

  testWidgets('without a saved token the app shows the login screen and checks the form', (tester) async {
    final auth = AuthController(ApiClient(
        client: MockClient((_) async => throw StateError('no network in this test')),
        tokens: MemoryTokens(),
        base: 'http://x'));
    await auth.restore();
    await tester.pumpWidget(FamilyBudgetApp(auth: auth));
    await tester.pumpAndSettle();

    expect(find.text('Вход'), findsOneWidget);
    await tester.tap(find.widgetWithText(FilledButton, 'Войти'));
    await tester.pump();
    expect(find.text('Введите email'), findsOneWidget);
    expect(find.text('Введите пароль'), findsOneWidget);

    await tester.tap(find.text('dana.m@example.com (участник)'));
    await tester.pump();
    expect(find.text('dana.m@example.com'), findsOneWidget);
  });
}
