import 'package:flutter/material.dart';

import '../format.dart';
import '../theme.dart';

class MonthPicker extends StatelessWidget {
  final DateTime month;
  final ValueChanged<DateTime> onChanged;
  const MonthPicker({super.key, required this.month, required this.onChanged});

  @override
  Widget build(BuildContext context) => Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton.outlined(
              tooltip: 'Предыдущий месяц', onPressed: () => onChanged(shiftMonth(month, -1)),
              icon: const Icon(Icons.chevron_left, color: magenta)),
          Text(monthLabel(month), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: navy)),
          IconButton.outlined(
              tooltip: 'Следующий месяц', onPressed: () => onChanged(shiftMonth(month, 1)),
              icon: const Icon(Icons.chevron_right, color: magenta)),
        ],
      );
}
