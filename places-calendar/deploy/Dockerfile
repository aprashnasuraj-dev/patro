# Two-stage image: build the pages, then serve them with nginx.
#   docker build -f deploy/Dockerfile -t aafnai-places .
#   docker run -p 8080:80 aafnai-places        -> http://localhost:8080/places/
FROM python:3.12-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libraqm0 libfribidi0 libfreetype6 && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ARG YEARS=
ARG BASE_URL=https://www.aafnaipatro.com
ARG PATH_ROOT=
RUN python tests/test_dates.py && python tests/test_units.py \
 && python -m generator.build ${YEARS:+--years $YEARS} --base-url ${BASE_URL} --path-root "${PATH_ROOT}" --out /site --clean \
 && python tests/check_build.py /site

FROM nginx:1.27-alpine
COPY deploy/nginx-standalone.conf /etc/nginx/conf.d/default.conf
COPY deploy/nginx.conf /etc/nginx/conf.d/places.inc
COPY --from=build /site /var/www/aafnai-places
EXPOSE 80
