#!/usr/bin/env bash
set -euo pipefail

# Déploiement de jsuisdechire vers le serveur Flask de production.
# Usage : ./deploy.sh
# Surcharges possibles : REMOTE_HOST=... RUN_HTTP_CHECKS=0 ./deploy.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE_DEPLOY="${ENV_FILE_DEPLOY:-${ROOT_DIR}/.env.deploy}"

if [[ -f "$ENV_FILE_DEPLOY" ]]; then
  echo "Chargement des réglages depuis ${ENV_FILE_DEPLOY}"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE_DEPLOY"
  set +a
fi

APP_NAME="${APP_NAME:-jsuisdechire}"
REMOTE_HOST="${REMOTE_HOST:-192.168.1.30}"
REMOTE_USER="${REMOTE_USER:-toxyk}"
REMOTE_PORT="${REMOTE_PORT:-22}"
REMOTE_APP_DIR="${REMOTE_APP_DIR:-/opt/jsuisdechire/app}"
REMOTE_SERVICE="${REMOTE_SERVICE:-jsuisdechire}"
REMOTE_APP_USER="${REMOTE_APP_USER:-jsuis}"
REMOTE_APP_GROUP="${REMOTE_APP_GROUP:-jsuis}"
REMOTE_BACKUP_ROOT="${REMOTE_BACKUP_ROOT:-/var/backups/jsuisdechire}"
PUBLIC_URL="${PUBLIC_URL:-https://jsuisdechire.com}"
RUN_HTTP_CHECKS="${RUN_HTTP_CHECKS:-1}"
HTTP_TIMEOUT="${HTTP_TIMEOUT:-20}"

if [[ -n "$REMOTE_USER" ]]; then
  SSH_TARGET="${REMOTE_USER}@${REMOTE_HOST}"
else
  SSH_TARGET="$REMOTE_HOST"
fi
TMP_DIR="$(mktemp -d "/tmp/${APP_NAME}.deploy.XXXXXX")"
ARCHIVE_PATH="${TMP_DIR}/${APP_NAME}.tar.gz"
REMOTE_ARCHIVE="${APP_NAME}-deploy-$(date +%Y%m%d-%H%M%S)-$$.tar.gz"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Commande introuvable : $1" >&2
    exit 1
  fi
}

require_file() {
  if [[ ! -f "$ROOT_DIR/$1" ]]; then
    echo "Fichier local introuvable : $ROOT_DIR/$1" >&2
    exit 1
  fi
}

shell_quote() {
  printf '%q' "$1"
}

require_command ssh
require_command scp
require_command tar
require_file app.py
require_file templates/base.html
require_file templates/t6.html
require_file templates/t7.html
require_file static/js/t6.js
require_file static/js/t7.js
require_file static/icons/icon-192.png
require_file static/icons/icon-512.png

if command -v python3 >/dev/null 2>&1; then
  echo "Vérification syntaxique de app.py..."
  python3 - "$ROOT_DIR/app.py" <<'PY'
import ast
import pathlib
import sys

ast.parse(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
PY
fi

echo "Création de l'archive de déploiement..."
export COPYFILE_DISABLE=1
tar \
  --format ustar \
  --exclude='./.git' \
  --exclude='./.venv' \
  --exclude='./__pycache__' \
  --exclude='./*.pyc' \
  --exclude='./*.sqlite' \
  --exclude='./data.sqlite' \
  --exclude='./.env*' \
  --exclude='./static/uploads' \
  --exclude='./.DS_Store' \
  --exclude='./._*' \
  --exclude='./*.log' \
  -czf "$ARCHIVE_PATH" \
  -C "$ROOT_DIR" .

echo "Envoi vers ${SSH_TARGET}:${REMOTE_APP_DIR}..."
scp -P "$REMOTE_PORT" "$ARCHIVE_PATH" "${SSH_TARGET}:/tmp/${REMOTE_ARCHIVE}"

REMOTE_APP_DIR_Q="$(shell_quote "$REMOTE_APP_DIR")"
REMOTE_SERVICE_Q="$(shell_quote "$REMOTE_SERVICE")"
REMOTE_APP_USER_Q="$(shell_quote "$REMOTE_APP_USER")"
REMOTE_APP_GROUP_Q="$(shell_quote "$REMOTE_APP_GROUP")"
REMOTE_BACKUP_ROOT_Q="$(shell_quote "$REMOTE_BACKUP_ROOT")"
REMOTE_ARCHIVE_Q="$(shell_quote "$REMOTE_ARCHIVE")"
APP_NAME_Q="$(shell_quote "$APP_NAME")"

REMOTE_ENV="REMOTE_APP_DIR=${REMOTE_APP_DIR_Q} REMOTE_SERVICE=${REMOTE_SERVICE_Q} REMOTE_APP_USER=${REMOTE_APP_USER_Q} REMOTE_APP_GROUP=${REMOTE_APP_GROUP_Q} REMOTE_BACKUP_ROOT=${REMOTE_BACKUP_ROOT_Q} REMOTE_ARCHIVE=${REMOTE_ARCHIVE_Q} APP_NAME=${APP_NAME_Q}"

ssh -p "$REMOTE_PORT" "$SSH_TARGET" "${REMOTE_ENV} bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail

run_root() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  else
    sudo -n "$@"
  fi
}

if ! run_root test -d "$REMOTE_APP_DIR"; then
  echo "Répertoire distant introuvable : ${REMOTE_APP_DIR}" >&2
  exit 1
fi

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_PATH="${REMOTE_BACKUP_ROOT}/${APP_NAME}-${TIMESTAMP}.tar.gz"
STAGING_DIR="/tmp/${APP_NAME}.staging.$$"

cleanup_remote() {
  rm -rf "$STAGING_DIR"
  rm -f "/tmp/${REMOTE_ARCHIVE}"
}
trap cleanup_remote EXIT

echo "Sauvegarde distante : ${BACKUP_PATH}"
run_root mkdir -p "$REMOTE_BACKUP_ROOT"
run_root tar \
  --format ustar \
  --exclude='./.venv' \
  --exclude='./__pycache__' \
  --exclude='./*.pyc' \
  -czf "$BACKUP_PATH" \
  -C "$REMOTE_APP_DIR" .

mkdir -p "$STAGING_DIR"
tar -xzf "/tmp/${REMOTE_ARCHIVE}" -C "$STAGING_DIR"

for required_file in app.py templates/base.html templates/t6.html templates/t7.html static/js/t6.js static/js/t7.js static/icons/icon-192.png static/icons/icon-512.png; do
  if [[ ! -f "${STAGING_DIR}/${required_file}" ]]; then
    echo "Fichier absent de l'archive : ${required_file}" >&2
    exit 1
  fi
done

echo "Installation des fichiers applicatifs..."
run_root install -o "$REMOTE_APP_USER" -g "$REMOTE_APP_GROUP" -m 0644 "${STAGING_DIR}/app.py" "${REMOTE_APP_DIR}/app.py"
run_root mkdir -p "${REMOTE_APP_DIR}/templates" "${REMOTE_APP_DIR}/static"
run_root cp -a "${STAGING_DIR}/templates/." "${REMOTE_APP_DIR}/templates/"
run_root cp -a "${STAGING_DIR}/static/." "${REMOTE_APP_DIR}/static/"
run_root chown -R "${REMOTE_APP_USER}:${REMOTE_APP_GROUP}" "${REMOTE_APP_DIR}/templates" "${REMOTE_APP_DIR}/static"

echo "Vérification des fichiers t6/t7 et des logos..."
run_root test -f "${REMOTE_APP_DIR}/templates/t6.html"
run_root test -f "${REMOTE_APP_DIR}/templates/t7.html"
run_root test -f "${REMOTE_APP_DIR}/static/js/t6.js"
run_root test -f "${REMOTE_APP_DIR}/static/js/t7.js"
run_root test -f "${REMOTE_APP_DIR}/static/branding/logo-horizontal.png"
run_root test -f "${REMOTE_APP_DIR}/static/icons/icon-192.png"
run_root test -f "${REMOTE_APP_DIR}/static/icons/icon-512.png"

echo "Redémarrage du service ${REMOTE_SERVICE}..."
run_root systemctl restart "$REMOTE_SERVICE"
sleep 2
if ! run_root systemctl is-active --quiet "$REMOTE_SERVICE"; then
  run_root systemctl status "$REMOTE_SERVICE" --no-pager -l || true
  exit 1
fi

echo "Service actif : ${REMOTE_SERVICE}"
echo "Backup : ${BACKUP_PATH}"
REMOTE_SCRIPT

if [[ "$RUN_HTTP_CHECKS" == "1" ]]; then
  require_command curl
  echo "Contrôles HTTP publics..."
  for route in / /t6 /t7 /jj-hub /static/branding/logo-horizontal.png /static/icons/icon-192.png /static/icons/icon-512.png; do
    code="$(curl -L -sS --max-time "$HTTP_TIMEOUT" -o /dev/null -w '%{http_code}' "${PUBLIC_URL}${route}")"
    echo "${code} ${route}"
    if [[ "$code" != "200" ]]; then
      echo "Contrôle HTTP inattendu pour ${route} : ${code}" >&2
      exit 1
    fi
  done
fi

echo
echo "Déploiement terminé."
