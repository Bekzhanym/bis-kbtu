import 'package:flutter/material.dart';

import '../theme.dart';

class ErrorBox extends StatelessWidget {
  final String text;
  final VoidCallback? onRetry;
  const ErrorBox(this.text, {super.key, this.onRetry});

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(14),
        decoration: const BoxDecoration(
            color: Color(0xFFFDECEB), border: Border(left: BorderSide(color: danger, width: 6))),
        child: Row(children: [
          Expanded(child: Text(text, style: const TextStyle(color: danger, fontWeight: FontWeight.w600))),
          if (onRetry != null) TextButton(onPressed: onRetry, child: const Text('Повторить')),
        ]),
      );
}

class EmptyState extends StatelessWidget {
  final String icon;
  final String title;
  final String? text;
  const EmptyState({super.key, required this.icon, required this.title, this.text});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 16),
        child: Column(children: [
          Text(icon, style: const TextStyle(fontSize: 40)),
          const SizedBox(height: 8),
          Text(title, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w700)),
          if (text != null) ...[
            const SizedBox(height: 4),
            Text(text!, textAlign: TextAlign.center, style: const TextStyle(color: muted)),
          ],
        ]),
      );
}

void showToast(BuildContext context, String text, {bool error = false}) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(
      content: Text(text),
      backgroundColor: error ? danger : success,
      behavior: SnackBarBehavior.floating,
    ));
}
