import 'package:flutter/material.dart';

import '../api/models.dart';
import '../format.dart';
import '../theme.dart';

/// Category row with a progress bar: navy, amber above 80%, red when over the limit (as on the website).
class LimitBar extends StatelessWidget {
  final CategoryReport c;
  const LimitBar(this.c, {super.key});

  @override
  Widget build(BuildContext context) {
    final usage = c.usage;
    final color = c.overLimit ? danger : (usage ?? 0) > 0.8 ? amber : navy;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Text('${categoryIcon(c.name)}  ', style: const TextStyle(fontSize: 18)),
        Expanded(child: Text(c.name, style: const TextStyle(fontWeight: FontWeight.w700))),
        Text('${kzt(c.spent)} из ${c.limit == null ? 'без лимита' : kzt(c.limit)}',
            style: const TextStyle(color: muted, fontSize: 13)),
      ]),
      const SizedBox(height: 6),
      ClipRRect(
        borderRadius: BorderRadius.circular(2),
        child: LinearProgressIndicator(
            value: usage == null ? 0 : usage.clamp(0, 1).toDouble(), minHeight: 10, color: color, backgroundColor: grey2),
      ),
    ]);
  }
}
