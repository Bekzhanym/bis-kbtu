import 'package:flutter/material.dart';

import '../auth.dart';
import '../format.dart';
import 'add_expense_screen.dart';
import 'dashboard_screen.dart';
import 'expenses_screen.dart';

/// Bottom navigation like the mobile website: Главная / Расходы. The month is shared between tabs.
class HomeShell extends StatefulWidget {
  final AuthController auth;
  const HomeShell({super.key, required this.auth});
  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _tab = 0;
  DateTime _month = monthStart(DateTime.now());
  int _version = 0; // bump to reload both tabs after a change

  Future<void> _add() async {
    final saved = await Navigator.of(context).push<bool>(
        MaterialPageRoute(builder: (_) => AddExpenseScreen(api: widget.auth.api)));
    if (saved == true) setState(() => _version++);
  }

  @override
  Widget build(BuildContext context) {
    final user = widget.auth.user!;
    final pages = [
      DashboardScreen(key: ValueKey('d$_version'), api: widget.auth.api, user: user, month: _month,
          onMonth: (m) => setState(() => _month = m)),
      ExpensesScreen(key: ValueKey('e$_version'), api: widget.auth.api, month: _month,
          onMonth: (m) => setState(() => _month = m)),
    ];
    return Scaffold(
      appBar: AppBar(
        title: const Text('Family Budget', style: TextStyle(fontWeight: FontWeight.w800)),
        actions: [
          IconButton(
            tooltip: 'Выйти',
            icon: const Icon(Icons.logout),
            onPressed: widget.auth.logout,
          ),
        ],
      ),
      body: IndexedStack(index: _tab, children: pages),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _add,
        backgroundColor: Theme.of(context).colorScheme.secondary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('Расход'),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (i) => setState(() => _tab = i),
        destinations: const [
          NavigationDestination(icon: Text('🏠', style: TextStyle(fontSize: 22)), label: 'Главная'),
          NavigationDestination(icon: Text('🧾', style: TextStyle(fontSize: 22)), label: 'Расходы'),
        ],
      ),
    );
  }
}
