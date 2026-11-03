from datetime import date


def month_range(d: date) -> tuple[date, date]:
    start = d.replace(day=1)
    end = date(start.year + (start.month == 12), start.month % 12 + 1, 1)
    return start, end
