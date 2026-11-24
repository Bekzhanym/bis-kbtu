import 'package:flutter/material.dart';

import '../auth.dart';
import '../theme.dart';
import '../validation.dart';
import '../widgets/common.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  final AuthController auth;
  const LoginScreen({super.key, required this.auth});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  String? _error;
  bool _busy = false;

  Future<void> _submit() async {
    setState(() => _error = null);
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      await widget.auth.login(_email.text, _password.text);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _demo(String email) => setState(() {
        _email.text = email;
        _password.text = 'demo12345';
      });

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Family Budget', style: TextStyle(fontWeight: FontWeight.w800))),
        body: SafeArea(
          child: ListView(padding: const EdgeInsets.all(24), children: [
            Text('Вход', style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 6),
            const Text('Семейные расходы и лимиты по месяцам', style: TextStyle(color: muted)),
            const SizedBox(height: 24),
            if (_error != null) ...[ErrorBox(_error!), const SizedBox(height: 16)],
            Form(
              key: _form,
              child: Column(children: [
                TextFormField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  autofillHints: const [AutofillHints.email],
                  decoration: const InputDecoration(labelText: 'Email'),
                  validator: (v) => validateEmail(v ?? ''),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _password,
                  obscureText: true,
                  autofillHints: const [AutofillHints.password],
                  decoration: const InputDecoration(labelText: 'Пароль'),
                  validator: (v) => (v ?? '').isEmpty ? 'Введите пароль' : null,
                  onFieldSubmitted: (_) => _submit(),
                ),
              ]),
            ),
            const SizedBox(height: 24),
            FilledButton(onPressed: _busy ? null : _submit, child: Text(_busy ? 'Вход…' : 'Войти')),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => Navigator.of(context)
                  .push(MaterialPageRoute(builder: (_) => RegisterScreen(auth: widget.auth))),
              child: const Text('Нет аккаунта? Зарегистрироваться', style: TextStyle(color: magenta)),
            ),
            const Divider(height: 32),
            const Text('Демо-аккаунты (пароль demo12345):', style: TextStyle(color: muted)),
            TextButton(onPressed: () => _demo('alex.sebelev@example.com'), child: const Text('alex.sebelev@example.com (админ)')),
            TextButton(onPressed: () => _demo('dana.m@example.com'), child: const Text('dana.m@example.com (участник)')),
          ]),
        ),
      );
}
