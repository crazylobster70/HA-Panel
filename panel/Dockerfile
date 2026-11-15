# Obraz bazowy dobierany do architektury (Supervisor podaje BUILD_ARCH); build.yaml nie jest już potrzebny.
ARG BUILD_ARCH=amd64
ARG BUILD_FROM=ghcr.io/home-assistant/${BUILD_ARCH}-base:latest
FROM ${BUILD_FROM}
RUN apk add --no-cache nodejs
COPY app /app
# Bez s6 (/init): s6 czyści środowisko, a my potrzebujemy SUPERVISOR_TOKEN.
ENTRYPOINT ["node", "/app/server.js"]
