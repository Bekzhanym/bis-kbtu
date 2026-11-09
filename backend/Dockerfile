FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
COPY data ./data
ENV DATABASE_URL=sqlite:////data-volume/budget.db
EXPOSE 8000
# One worker: SQLite + seeding on startup are not safe across several processes.
# --proxy-headers because requests come through nginx.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
