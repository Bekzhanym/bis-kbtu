import 'package:flutter/material.dart';

import '../api/api_client.dart';
import '../api/models.dart';
import '../format.dart';
import '../theme.dart';
import '../widgets/common.dart';
import '../widgets/limit_bar.dart';
import '../widgets/month_picker.dart';

/// Home: month totals and category limits (the website's dashboard, MVP version).
class DashboardScreen extends StatefulWidget {
  final ApiClient api;
  final User user;
  final DateTime month;
  final ValueChanged<DateTime> onMonth;
  const DashboardScreen({super.key, required this.api, required this.user, required this.month, required this.onMonth});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late Future<MonthlyReport> _report;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(DashboardScreen old) {
    super.didUpdateWidget(old);
    if (old.month != widget.month) _load();
  }

  void _load() => _report = widget.api.monthlyReport(widget.month);

  @override
  Widget build(BuildContext context) => RefreshIndicator(
        onRefresh: () async {
          setState(_load);
          await _report;
        },
        child: ListView(padding: const EdgeInsets.fromLTRB(16, 16, 16, 96), children: [
          Text('Привет, ${widget.user.firstName}', style: Theme.of(context).textTheme.headlineMedium),
          const Text('Сводка семейного бюджета за месяц', style: TextStyle(color: muted)),
          const SizedBox(height: 12),
          MonthPicker(month: widget.month, onChanged: widget.onMonth),
          const SizedBox(height: 12),
          FutureBuilder<MonthlyReport>(
            future: _report,
            builder: (context, snap) {
              if (snap.hasError) return ErrorBox(snap.error.toString(), onRetry: () => setState(_load));
              if (!snap.hasData) {
                return const Padding(padding: EdgeInsets.all(40), child: Center(child: CircularProgressIndicator()));
              }
              final r = snap.data!;
              final over = r.categories.where((c) => c.overLimit).toList();
              return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                _Totals(r),
                const SizedBox(height: 16),
                for (final c in over)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: const BoxDecoration(
                          color: Color(0xFFFFF4DC), border: Border(left: BorderSide(color: amber, width: 6))),
                      child: Text('Лимит «${c.name}» превышен на ${kzt(c.spent - (c.limit ?? 0))}',
                          style: const TextStyle(color: Color(0xFF8A5100), fontWeight: FontWeight.w600)),
                    ),
                  ),
                const SizedBox(height: 8),
                Text('Лимиты по категориям', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 12),
                if (r.categories.isEmpty)
                  const EmptyState(icon: '🧾', title: 'В этом месяце расходов нет',
                      text: 'Нажмите «+ Расход» или перейдите стрелками в другой месяц.')
                else
                  for (final c in r.categories) Padding(padding: const EdgeInsets.only(bottom: 18), child: LimitBar(c)),
              ]);
            },
          ),
        ]),
      );
}

class _Totals extends StatelessWidget {
  final MonthlyReport r;
  const _Totals(this.r);

  Widget _row(String label, String value, {bool strong = false, bool bad = false}) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        margin: const EdgeInsets.only(bottom: 6),
        color: strong ? (bad ? danger : const Color(0xFF4B5768)) : grey,
        child: Row(children: [
          Expanded(child: Text(label, style: TextStyle(color: strong ? Colors.white : null, fontSize: 16))),
          Text(value,
              style: TextStyle(
                  fontWeight: FontWeight.w700, fontSize: 16,
                  color: strong ? Colors.white : bad ? danger : null)),
        ]),
      );

  @override
  Widget build(BuildContext context) => Column(children: [
        _row('Потрачено семьёй', kzt(r.totalSpent)),
        _row('Мои расходы', kzt(r.mySpent)),
        _row('Сумма лимитов', kzt(r.totalLimit)),
        _row('Остаток', kzt(r.remaining), strong: true, bad: r.remaining < 0),
      ]);
}
