import 'dart:convert';

import 'package:family_budget/api/api_client.dart';
import 'package:family_budget/format.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:intl/date_symbol_data_local.dart';

class MemoryTokens implements TokenStore {
  String? a, r;
  MemoryTokens([this.a, this.r]);
  @override
  Future<String?> access() async => a;
  @override
  Future<String?> refresh() async => r;
  @override
  Future<void> save(String access, String refresh) async {
    a = access;
    r = refresh;
  }

  @override
  Future<void> clear() async => a = r = null;
}

http.Response json(Object body, [int status = 200]) =>
    http.Response.bytes(utf8.encode(jsonEncode(body)), status, headers: {'content-type': 'application/json'});

const reportJson = {
  'month_start': '2026-10-01', 'total_spent': '128000.00', 'total_limit': '170000.00', 'my_spent': '45000.00',
  'members': [],
  'categories': [
    {'category_id': 1, 'category_name': 'Food', 'monthly_limit': '100000.00', 'spent': '110000.00',
     'remaining': '-10000.00', 'over_limit': true},
    {'category_id': 3, 'category_name': 'Entertainment', 'monthly_limit': null, 'spent': '0', 'remaining': null,
     'over_limit': false},
  ],
};

void main() {
  setUpAll(() => initializeDateFormatting('ru'));

  test('parses the monthly report', () async {
    final api = ApiClient(client: MockClient((_) async => json(reportJson)), tokens: MemoryTokens('t'), base: 'http://x');
    final r = await api.monthlyReport(DateTime(2026, 10));
    expect(r.totalSpent, 128000);
    expect(r.remaining, 42000);
    expect(r.categories.first.overLimit, isTrue);
    expect(r.categories.first.usage, closeTo(1.1, 1e-9));
    expect(r.categories.last.usage, isNull);
  });

  test('expired access token: refreshes once and repeats the request', () async {
    final calls = <String>[];
    final client = MockClient((req) async {
      calls.add('${req.method} ${req.url.path} ${req.headers['Authorization'] ?? ''}');
      if (req.url.path == '/api/auth/refresh') {
        expect(jsonDecode(req.body), {'refresh_token': 'old-refresh'});
        return json({'access_token': 'new', 'refresh_token': 'new-refresh', 'user': {}});
      }
      if (req.headers['Authorization'] == 'Bearer old') return json({'detail': 'Not authenticated'}, 401);
      return json([]);
    });
    final tokens = MemoryTokens('old', 'old-refresh');
    final api = ApiClient(client: client, tokens: tokens, base: 'http://x');
    expect(await api.expenses(DateTime(2026, 10)), isEmpty);
    expect(calls, [
      'GET /api/transactions Bearer old',
      'POST /api/auth/refresh ',
      'GET /api/transactions Bearer new',
    ]);
    expect(tokens.r, 'new-refresh');
  });

  test('refresh fails: tokens cleared and the app is told to log out', () async {
    var loggedOut = false;
    final api = ApiClient(
        client: MockClient((_) async => json({'detail': 'Not authenticated'}, 401)),
        tokens: MemoryTokens('old', 'bad'),
        base: 'http://x')
      ..onLogout = () => loggedOut = true;
    await expectLater(api.me(), throwsA(isA<ApiException>()));
    expect(loggedOut, isTrue);
    expect(await api.tokens.access(), isNull);
  });

  test('server errors are shown in Russian', () async {
    final api = ApiClient(
        client: MockClient((_) async => json({'detail': 'Invalid email or password'}, 401)),
        tokens: MemoryTokens(),
        base: 'http://x');
    await expectLater(
        api.login('a@b.kz', 'x'), throwsA(predicate((e) => e.toString() == 'Неверный email или пароль')));
  });

  test('money and month formatting', () {
    expect(kzt(128000), '128 000 ₸');
    expect(kzt(1990.5), '1 990,50 ₸');
    expect(monthLabel(DateTime(2026, 10)), 'Октябрь 2026');
    expect(categoryIcon('Food'), '🛒');
    expect(categoryIcon('Other'), '💳');
  });
}
