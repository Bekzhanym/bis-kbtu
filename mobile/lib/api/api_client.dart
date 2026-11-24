import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'models.dart';

/// Backend address. Override: flutter run --dart-define=API_BASE=http://10.0.2.2:8000
const apiBase = String.fromEnvironment('API_BASE', defaultValue: 'https://bis-kbtu.onrender.com');

class ApiException implements Exception {
  final int status;
  final String message;
  ApiException(this.status, this.message);
  @override
  String toString() => message;
}

/// Server messages -> Russian, the same list as frontend/src/api/client.ts
const _messages = {
  'Invalid email or password': 'Неверный email или пароль',
  'Email already registered': 'Этот email уже зарегистрирован',
  'Not authenticated': 'Сессия истекла, войдите снова',
  'Invalid refresh token': 'Сессия истекла, войдите снова',
  'Category does not exist or is inactive': 'Категория не существует или отключена',
  'You can only change your own expenses': 'Можно изменять только свои расходы',
  'Database constraint violated': 'Данные нарушают ограничения базы данных',
  'Value error, Expense date cannot be in the future': 'Дата расхода не может быть в будущем',
  'Value error, Password must contain letters and digits': 'Пароль должен содержать буквы и цифры',
};

String messageFrom(dynamic detail, String fallback) {
  if (detail is String) return _messages[detail] ?? detail;
  if (detail is List) {
    return detail.map((d) => _messages[d['msg']] ?? d['msg'].toString()).join('; ');
  }
  return fallback;
}

/// Where tokens live. An interface so tests can use memory instead of the device storage.
abstract class TokenStore {
  Future<String?> access();
  Future<String?> refresh();
  Future<void> save(String access, String refresh);
  Future<void> clear();
}

class PrefsTokenStore implements TokenStore {
  Future<SharedPreferences> get _p => SharedPreferences.getInstance();
  @override
  Future<String?> access() async => (await _p).getString('fbt_token');
  @override
  Future<String?> refresh() async => (await _p).getString('fbt_refresh');
  @override
  Future<void> save(String access, String refresh) async {
    final p = await _p;
    await p.setString('fbt_token', access);
    await p.setString('fbt_refresh', refresh);
  }

  @override
  Future<void> clear() async {
    final p = await _p;
    await p.remove('fbt_token');
    await p.remove('fbt_refresh');
  }
}

String _date(DateTime d) =>
    '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

class ApiClient {
  final http.Client _http;
  final TokenStore tokens;
  final String base;
  /// Called when the session is over (refresh failed): the app goes back to the login screen.
  void Function()? onLogout;
  Future<bool>? _refreshing;

  ApiClient({http.Client? client, TokenStore? tokens, this.base = apiBase})
      : _http = client ?? http.Client(),
        tokens = tokens ?? PrefsTokenStore();

  Future<dynamic> _request(String method, String path,
      {Object? body, Map<String, String>? query, bool retried = false}) async {
    final uri = Uri.parse('$base$path').replace(
        queryParameters: query == null ? null : {for (final e in query.entries) if (e.value.isNotEmpty) e.key: e.value});
    final token = await tokens.access();
    final headers = {
      if (body != null) 'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
    http.Response res;
    try {
      final req = http.Request(method, uri)..headers.addAll(headers);
      if (body != null) req.body = jsonEncode(body);
      res = await http.Response.fromStream(await _http.send(req).timeout(const Duration(seconds: 60)));
    } catch (_) {
      throw ApiException(0, 'Сервер недоступен. Проверьте интернет.');
    }

    if (res.statusCode == 401 && token != null) {
      // access token expired: get a new pair once and repeat the request
      if (!retried && await _refreshTokens()) {
        return _request(method, path, body: body, query: query, retried: true);
      }
      await tokens.clear();
      onLogout?.call();
    }
    final text = utf8.decode(res.bodyBytes);
    if (res.statusCode >= 400) {
      dynamic data;
      try {
        data = jsonDecode(text);
      } catch (_) {}
      final fallback = res.statusCode >= 500 ? 'Сервер недоступен, попробуйте позже' : 'Ошибка ${res.statusCode}';
      throw ApiException(res.statusCode, messageFrom(data is Map ? data['detail'] : null, fallback));
    }
    return text.isEmpty ? null : jsonDecode(text);
  }

  /// One refresh at a time: parallel 401s wait for the same call.
  Future<bool> _refreshTokens() {
    return _refreshing ??= () async {
      try {
        final refresh = await tokens.refresh();
        if (refresh == null) return false;
        final res = await _http.post(Uri.parse('$base/api/auth/refresh'),
            headers: {'Content-Type': 'application/json'}, body: jsonEncode({'refresh_token': refresh}));
        if (res.statusCode != 200) return false;
        final data = jsonDecode(utf8.decode(res.bodyBytes));
        await tokens.save(data['access_token'], data['refresh_token']);
        return true;
      } catch (_) {
        return false;
      } finally {
        _refreshing = null;
      }
    }();
  }

  Future<User> _session(dynamic data) async {
    await tokens.save(data['access_token'], data['refresh_token']);
    return User.fromJson(data['user']);
  }

  // ---------- auth ----------
  Future<User> login(String email, String password) async => _session(await _request('POST', '/api/auth/login',
      body: {'email': email.trim().toLowerCase(), 'password': password}));

  Future<User> register(String fullName, String email, String password) async =>
      _session(await _request('POST', '/api/auth/register',
          body: {'full_name': fullName.trim(), 'email': email.trim().toLowerCase(), 'password': password}));

  Future<User> me() async => User.fromJson(await _request('GET', '/api/auth/me'));

  Future<void> logout() => tokens.clear();

  // ---------- data ----------
  Future<List<Category>> categories() async =>
      (await _request('GET', '/api/categories') as List).map((c) => Category.fromJson(c)).toList();

  Future<MonthlyReport> monthlyReport(DateTime month) async =>
      MonthlyReport.fromJson(await _request('GET', '/api/reports/monthly', query: {'month': _date(month)}));

  Future<List<Expense>> expenses(DateTime month) async =>
      (await _request('GET', '/api/transactions', query: {'month': _date(month)}) as List)
          .map((t) => Expense.fromJson(t))
          .toList();

  Future<Expense> addExpense({required int categoryId, required String amount, required DateTime date, String? note}) async =>
      Expense.fromJson(await _request('POST', '/api/transactions', body: {
        'category_id': categoryId,
        'amount': amount,
        'transaction_date': _date(date),
        'note': (note == null || note.trim().isEmpty) ? null : note.trim(),
      }));

  Future<void> deleteExpense(int id) => _request('DELETE', '/api/transactions/$id');
}
