#!/bin/sh
set -e

random_secret() {
  node -e "process.stdout.write(require('node:crypto').randomBytes(48).toString('base64url'))"
}

case "$JWT_ACCESS_SECRET" in
  '' | change-me*)
    JWT_ACCESS_SECRET="$(random_secret)"
    export JWT_ACCESS_SECRET
    echo 'JWT_ACCESS_SECRET is missing or still the default: generated a temporary one, sessions end when the container restarts' >&2
    ;;
esac

case "$JWT_REFRESH_SECRET" in
  '' | change-me*)
    JWT_REFRESH_SECRET="$(random_secret)"
    export JWT_REFRESH_SECRET
    echo 'JWT_REFRESH_SECRET is missing or still the default: generated a temporary one, sessions end when the container restarts' >&2
    ;;
esac

node_modules/.bin/prisma migrate deploy
exec node dist/main
