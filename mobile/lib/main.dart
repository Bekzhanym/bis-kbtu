import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'api/api_client.dart';
import 'auth.dart';
import 'screens/home_shell.dart';
import 'screens/login_screen.dart';
import 'theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('ru');
  final auth = AuthController(ApiClient());
  runApp(FamilyBudgetApp(auth: auth));
  await auth.restore();
}

class FamilyBudgetApp extends StatelessWidget {
  final AuthController auth;
  const FamilyBudgetApp({super.key, required this.auth});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Family Budget',
      debugShowCheckedModeBanner: false,
      theme: appTheme(),
      locale: const Locale('ru'),
      supportedLocales: const [Locale('ru'), Locale('en')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      home: ListenableBuilder(
        listenable: auth,
        builder: (context, _) {
          if (auth.loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
          return auth.user == null ? LoginScreen(auth: auth) : HomeShell(auth: auth);
        },
      ),
    );
  }
}
