import 'package:flutter/material.dart';

// Colours of the website (frontend/src/index.css)
const navy = Color(0xFF141B93);
const magenta = Color(0xFFC0306C);
const magentaSoft = Color(0xFFFBEEF4);
const grey = Color(0xFFF2F1F4);
const grey2 = Color(0xFFE6E5EA);
const muted = Color(0xFF5D6170);
const danger = Color(0xFFC3201B);
const success = Color(0xFF0E7A4E);
const amber = Color(0xFFF39223);

ThemeData appTheme() {
  final scheme = ColorScheme.fromSeed(seedColor: navy, primary: navy, secondary: magenta, error: danger);
  return ThemeData(
    colorScheme: scheme,
    scaffoldBackgroundColor: Colors.white,
    appBarTheme: const AppBarTheme(backgroundColor: navy, foregroundColor: Colors.white, elevation: 0),
    textTheme: const TextTheme(
      headlineMedium: TextStyle(color: navy, fontWeight: FontWeight.w800, letterSpacing: -0.5),
      titleMedium: TextStyle(color: navy, fontWeight: FontWeight.w700),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: magenta,
        minimumSize: const Size.fromHeight(52),
        textStyle: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(6)),
      focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(6), borderSide: const BorderSide(color: navy, width: 2)),
    ),
    navigationBarTheme: const NavigationBarThemeData(indicatorColor: magentaSoft),
  );
}
