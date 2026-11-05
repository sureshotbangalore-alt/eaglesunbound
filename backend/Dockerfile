FROM python:3.12.10-slim-bookworm@sha256:fd95fa221297a88e1cf49c55ec1828edd7c5a428187e67b5d1805692d11588db
WORKDIR /app
COPY requirements.txt requirements.lock ./
RUN python -m pip install --no-cache-dir pip==25.0.1 && python -m pip install --no-cache-dir -r requirements.txt
COPY . .
RUN useradd --create-home eagles && chown -R eagles:eagles /app
USER eagles
EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port 8000 --no-proxy-headers"]
