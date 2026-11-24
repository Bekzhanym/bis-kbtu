import 'package:flutter/material.dart';

import '../api/api_client.dart';
import '../api/models.dart';
import '../format.dart';
import '../validation.dart';
import '../widgets/common.dart';

/// The main action: add an expense. Same checks as the website form.
class AddExpenseScreen extends StatefulWidget {
  final ApiClient api;
  const AddExpenseScreen({super.key, required this.api});
  @override
  State<AddExpenseScreen> createState() => _AddExpenseScreenState();
}

class _AddExpenseScreenState extends State<AddExpenseScreen> {
  final _form = GlobalKey<FormState>();
  final _amount = TextEditingController();
  final _note = TextEditingController();
  late Future<List<Category>> _categories;
  int? _categoryId;
  DateTime _date = DateTime.now();
  String? _error;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _categories = widget.api.categories();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final d = await showDatePicker(
        context: context, initialDate: _date, firstDate: DateTime(2000), lastDate: now, locale: const Locale('ru'));
    if (d != null) setState(() => _date = d);
  }

  Future<void> _submit() async {
    setState(() => _error = validateExpenseDate(_date));
    if (!_form.currentState!.validate() || _error != null) return;
    setState(() => _busy = true);
    try {
      await widget.api.addExpense(
          categoryId: _categoryId!, amount: normalizeAmount(_amount.text), date: _date, note: _note.text);
      if (!mounted) return;
      showToast(context, 'Расход добавлен');
      Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Новый расход')),
        body: FutureBuilder<List<Category>>(
          future: _categories,
          builder: (context, snap) {
            if (snap.hasError) {
              return Padding(padding: const EdgeInsets.all(16), child: ErrorBox(snap.error.toString()));
            }
            if (!snap.hasData) return const Center(child: CircularProgressIndicator());
            final active = snap.data!.where((c) => c.isActive).toList();
            return Form(
              key: _form,
              child: ListView(padding: const EdgeInsets.all(16), children: [
                if (_error != null) ...[ErrorBox(_error!), const SizedBox(height: 16)],
                DropdownButtonFormField<int>(
                  initialValue: _categoryId,
                  decoration: const InputDecoration(labelText: 'Категория'),
                  items: [
                    for (final c in active)
                      DropdownMenuItem(value: c.id, child: Text('${categoryIcon(c.name)}  ${c.name}')),
                  ],
                  onChanged: (v) => setState(() => _categoryId = v),
                  validator: (v) => v == null ? 'Выберите категорию' : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _amount,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(labelText: 'Сумма', prefixText: '₸  ', hintText: '6000'),
                  validator: (v) => validateAmount(v ?? ''),
                ),
                const SizedBox(height: 16),
                InkWell(
                  onTap: _pickDate,
                  child: InputDecorator(
                    decoration: const InputDecoration(labelText: 'Дата', suffixIcon: Icon(Icons.calendar_today)),
                    child: Text(dateLabel(_date)),
                  ),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _note,
                  maxLength: 200,
                  decoration: const InputDecoration(
                      labelText: 'Заметка', helperText: 'Необязательно, видна только вам', hintText: 'Например, продукты в Magnum'),
                  validator: (v) => validateNote(v ?? ''),
                ),
                const SizedBox(height: 24),
                FilledButton(onPressed: _busy ? null : _submit, child: Text(_busy ? 'Сохранение…' : 'Добавить расход')),
              ]),
            );
          },
        ),
      );
}
