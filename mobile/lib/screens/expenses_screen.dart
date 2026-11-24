import 'package:flutter/material.dart';

import '../api/api_client.dart';
import '../api/models.dart';
import '../format.dart';
import '../theme.dart';
import '../widgets/common.dart';
import '../widgets/month_picker.dart';

/// My expenses for the month. Swipe left to delete (with "Undo", like the website).
class ExpensesScreen extends StatefulWidget {
  final ApiClient api;
  final DateTime month;
  final ValueChanged<DateTime> onMonth;
  const ExpensesScreen({super.key, required this.api, required this.month, required this.onMonth});
  @override
  State<ExpensesScreen> createState() => _ExpensesScreenState();
}

class _ExpensesScreenState extends State<ExpensesScreen> {
  List<Expense>? _rows;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(ExpensesScreen old) {
    super.didUpdateWidget(old);
    if (old.month != widget.month) _load();
  }

  Future<void> _load() async {
    setState(() {
      _rows = null;
      _error = null;
    });
    try {
      final rows = await widget.api.expenses(widget.month);
      if (mounted) setState(() => _rows = rows);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  Future<void> _delete(Expense t) async {
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _rows!.remove(t));
    try {
      await widget.api.deleteExpense(t.id);
      messenger.showSnackBar(SnackBar(
        content: Text('Расход ${kzt(t.amount)} (${t.categoryName}) удалён'),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 8),
        action: SnackBarAction(
          label: 'Отменить',
          onPressed: () async {
            await widget.api.addExpense(categoryId: t.categoryId, amount: t.amount.toStringAsFixed(2), date: t.date, note: t.note);
            _load();
          },
        ),
      ));
    } catch (e) {
      if (mounted) showToast(context, e.toString(), error: true);
      _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final rows = _rows;
    final total = rows?.fold<double>(0, (s, t) => s + t.amount) ?? 0;
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(padding: const EdgeInsets.fromLTRB(16, 16, 16, 96), children: [
        Text('Расходы', style: Theme.of(context).textTheme.headlineMedium),
        const Text('Ваши расходы. Заметки видны только вам.', style: TextStyle(color: muted)),
        const SizedBox(height: 12),
        MonthPicker(month: widget.month, onChanged: widget.onMonth),
        const SizedBox(height: 8),
        if (_error != null) ErrorBox(_error!, onRetry: _load),
        if (rows == null && _error == null)
          const Padding(padding: EdgeInsets.all(40), child: Center(child: CircularProgressIndicator())),
        if (rows != null && rows.isEmpty)
          const EmptyState(icon: '🧾', title: 'В этом месяце расходов нет', text: 'Добавьте первый расход кнопкой «+ Расход».'),
        if (rows != null && rows.isNotEmpty) ...[
          for (final t in rows)
            Dismissible(
              key: ValueKey(t.id),
              direction: t.isMine ? DismissDirection.endToStart : DismissDirection.none,
              background: Container(
                alignment: Alignment.centerRight,
                padding: const EdgeInsets.only(right: 20),
                color: danger,
                child: const Icon(Icons.delete, color: Colors.white),
              ),
              onDismissed: (_) => _delete(t),
              child: ListTile(
                contentPadding: EdgeInsets.zero,
                leading: CircleAvatar(backgroundColor: grey, child: Text(categoryIcon(t.categoryName))),
                title: Text(t.categoryName, style: const TextStyle(fontWeight: FontWeight.w700)),
                subtitle: Text([dateLabel(t.date), if (t.note != null) t.note!].join(' · '),
                    maxLines: 1, overflow: TextOverflow.ellipsis),
                trailing: Text(kzt(t.amount), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              ),
            ),
          const Divider(),
          Row(children: [
            Expanded(child: Text('Итого: ${rows.length} записей', style: const TextStyle(fontWeight: FontWeight.w700))),
            Text(kzt(total), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          ]),
          const SizedBox(height: 4),
          const Text('Смахните влево, чтобы удалить.', style: TextStyle(color: muted, fontSize: 13)),
        ],
      ]),
    );
  }
}
