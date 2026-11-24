import 'package:flutter/material.dart';

import '../auth.dart';
import '../theme.dart';
import '../validation.dart';
import '../widgets/common.dart';

class RegisterScreen extends StatefulWidget {
  final AuthController auth;
  const RegisterScreen({super.key, required this.auth});
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  String? _error;
  bool _busy = false;

  Future<void> _submit() async {
    setState(() => _error = null);
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      await widget.auth.register(_name.text, _email.text, _password.text);
      if (mounted) Navigator.of(context).popUntil((r) => r.isFirst);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Регистрация')),
        body: SafeArea(
          child: ListView(padding: const EdgeInsets.all(24), children: [
            const Text('Новый аккаунт получает роль «участник». Права администратора выдаёт админ семьи.',
                style: TextStyle(color: muted)),
            const SizedBox(height: 20),
            if (_error != null) ...[ErrorBox(_error!), const SizedBox(height: 16)],
            Form(
              key: _form,
              child: Column(children: [
                TextFormField(
                    controller: _name,
                    decoration: const InputDecoration(labelText: 'Имя и фамилия'),
                    validator: (v) => validateName(v ?? '')),
                const SizedBox(height: 16),
                TextFormField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(labelText: 'Email'),
                    validator: (v) => validateEmail(v ?? '')),
                const SizedBox(height: 16),
                TextFormField(
                    controller: _password,
                    obscureText: true,
                    decoration: const InputDecoration(
                        labelText: 'Пароль', helperText: 'Минимум 8 символов, буквы и цифры'),
                    validator: (v) => validatePassword(v ?? '')),
                const SizedBox(height: 16),
                TextFormField(
                    controller: _confirm,
                    obscureText: true,
                    decoration: const InputDecoration(labelText: 'Повторите пароль'),
                    validator: (v) => v == _password.text ? null : 'Пароли не совпадают'),
              ]),
            ),
            const SizedBox(height: 24),
            FilledButton(onPressed: _busy ? null : _submit, child: Text(_busy ? 'Создаём…' : 'Создать аккаунт')),
          ]),
        ),
      );
}
