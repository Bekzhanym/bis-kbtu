// Data classes matching the backend JSON (same fields as frontend/src/api/types.ts).

double _num(dynamic v) => v == null ? 0 : double.parse(v.toString());

class User {
  final int id;
  final String fullName;
  final String email;
  final String role;
  const User({required this.id, required this.fullName, required this.email, required this.role});

  bool get isAdmin => role == 'admin';
  String get firstName => fullName.split(' ').first;

  factory User.fromJson(Map<String, dynamic> j) =>
      User(id: j['user_id'], fullName: j['full_name'], email: j['email'], role: j['role']);
}

class Category {
  final int id;
  final String name;
  final bool isActive;
  const Category({required this.id, required this.name, required this.isActive});

  factory Category.fromJson(Map<String, dynamic> j) =>
      Category(id: j['category_id'], name: j['category_name'], isActive: j['is_active'] ?? true);
}

class Expense {
  final int id;
  final String userName;
  final int categoryId;
  final String categoryName;
  final double amount;
  final DateTime date;
  final String? note;
  final bool isMine;
  const Expense({
    required this.id, required this.userName, required this.categoryId, required this.categoryName,
    required this.amount, required this.date, required this.note, required this.isMine,
  });

  factory Expense.fromJson(Map<String, dynamic> j) => Expense(
        id: j['transaction_id'],
        userName: j['user_full_name'],
        categoryId: j['category_id'],
        categoryName: j['category_name'],
        amount: _num(j['amount']),
        date: DateTime.parse(j['transaction_date']),
        note: j['note'],
        isMine: j['is_mine'] ?? false,
      );
}

class CategoryReport {
  final int categoryId;
  final String name;
  final double? limit;
  final double spent;
  final bool overLimit;
  const CategoryReport({required this.categoryId, required this.name, required this.limit,
      required this.spent, required this.overLimit});

  /// 0..1+ share of the limit used, null when there is no limit.
  double? get usage => limit == null || limit == 0 ? null : spent / limit!;

  factory CategoryReport.fromJson(Map<String, dynamic> j) => CategoryReport(
        categoryId: j['category_id'],
        name: j['category_name'],
        limit: j['monthly_limit'] == null ? null : _num(j['monthly_limit']),
        spent: _num(j['spent']),
        overLimit: j['over_limit'] ?? false,
      );
}

class MonthlyReport {
  final double totalSpent;
  final double totalLimit;
  final double mySpent;
  final List<CategoryReport> categories;
  const MonthlyReport({required this.totalSpent, required this.totalLimit, required this.mySpent,
      required this.categories});

  double get remaining => totalLimit - totalSpent;

  factory MonthlyReport.fromJson(Map<String, dynamic> j) => MonthlyReport(
        totalSpent: _num(j['total_spent']),
        totalLimit: _num(j['total_limit']),
        mySpent: _num(j['my_spent']),
        categories: (j['categories'] as List).map((c) => CategoryReport.fromJson(c)).toList(),
      );
}
