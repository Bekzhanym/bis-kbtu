import 'package:flutter/foundation.dart';

import 'api/api_client.dart';
import 'api/models.dart';

/// Who is logged in. Screens listen to it; logout anywhere sends the app back to the login screen.
class AuthController extends ChangeNotifier {
  final ApiClient api;
  User? user;
  bool loading = true;

  AuthController(this.api) {
    api.onLogout = () {
      user = null;
      notifyListeners();
    };
  }

  /// On start: if a token is saved, ask the server who we are.
  Future<void> restore() async {
    try {
      if (await api.tokens.access() != null) user = await api.me();
    } catch (_) {
      await api.tokens.clear();
    }
    loading = false;
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    user = await api.login(email, password);
    notifyListeners();
  }

  Future<void> register(String name, String email, String password) async {
    user = await api.register(name, email, password);
    notifyListeners();
  }

  Future<void> logout() async {
    await api.logout();
    user = null;
    notifyListeners();
  }
}
