#!/usr/bin/env bash
set -euo pipefail

# Déploiement de jsuisdechire vers le serveur de production.
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
ADMIN_LOGIN="${ADMIN_LOGIN:-}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"

if [[ -n "$ADMIN_LOGIN" || -n "$ADMIN_PASSWORD" ]]; then
  if [[ -z "$ADMIN_LOGIN" || -z "$ADMIN_PASSWORD" ]]; then
    echo "ADMIN_LOGIN et ADMIN_PASSWORD doivent être définis ensemble." >&2
    exit 1
  fi
  if [[ ${#ADMIN_PASSWORD} -lt 8 ]]; then
    echo "ADMIN_PASSWORD doit contenir au moins 8 caractères." >&2
    exit 1
  fi
fi

if [[ -n "$REMOTE_USER" ]]; then
  SSH_TARGET="${REMOTE_USER}@${REMOTE_HOST}"
else
  SSH_TARGET="$REMOTE_HOST"
fi
TMP_DIR="$(mktemp -d "/tmp/${APP_NAME}.deploy.XXXXXX")"
ARCHIVE_PATH="${TMP_DIR}/${APP_NAME}.tar.gz"
REMOTE_ARCHIVE="${APP_NAME}-deploy-$(date +%Y%m%d-%H%M%S)-$$.tar.gz"
ADMIN_CREDENTIALS_FILE="${TMP_DIR}/admin-credentials.json"
ADMIN_CREDENTIALS_REMOTE="/tmp/${APP_NAME}-admin-credentials-$$.json"

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
require_file templates/training.html
require_file templates/t4.html
require_file static/js/training.js
require_file static/js/t4-beer.js
require_file static/js/t4.v157.js
require_file templates/t6.html
require_file templates/t7.html
require_file templates/t8.html
require_file templates/t9.html
require_file templates/t10.html
require_file static/js/t6.js
require_file static/js/t7.js
require_file static/js/t8.js
require_file static/js/t8-aim.js
require_file static/js/t9.js
require_file static/js/t10.js
require_file static/icons/icon-192.png
require_file static/icons/icon-512.png
require_file static/css/tailwind.css
require_file systemd/jsuisdechire.service

if command -v python3 >/dev/null 2>&1; then
  echo "Vérification syntaxique de app.py..."
  python3 - "$ROOT_DIR/app.py" <<'PY'
import ast
import pathlib
import sys

ast.parse(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
PY
fi

if [[ -n "$ADMIN_LOGIN" ]]; then
  require_command python3
  echo "Préparation du compte admin pour la production..."
  ADMIN_LOGIN_VALUE="$ADMIN_LOGIN" ADMIN_PASSWORD_VALUE="$ADMIN_PASSWORD" python3 - "$ADMIN_CREDENTIALS_FILE" <<'PY'
import json
import os
import sys

from werkzeug.security import generate_password_hash

output_path = sys.argv[1]
login = os.environ["ADMIN_LOGIN_VALUE"].strip()
password = os.environ["ADMIN_PASSWORD_VALUE"]
payload = {
    "login": login,
    "password_hash": generate_password_hash(password, method="pbkdf2:sha256"),
}
with open(output_path, "w", encoding="utf-8") as handle:
    json.dump(payload, handle)
PY
  chmod 600 "$ADMIN_CREDENTIALS_FILE"
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
if [[ -n "$ADMIN_LOGIN" ]]; then
  scp -P "$REMOTE_PORT" "$ADMIN_CREDENTIALS_FILE" "${SSH_TARGET}:${ADMIN_CREDENTIALS_REMOTE}"
fi

REMOTE_APP_DIR_Q="$(shell_quote "$REMOTE_APP_DIR")"
REMOTE_SERVICE_Q="$(shell_quote "$REMOTE_SERVICE")"
REMOTE_APP_USER_Q="$(shell_quote "$REMOTE_APP_USER")"
REMOTE_APP_GROUP_Q="$(shell_quote "$REMOTE_APP_GROUP")"
REMOTE_BACKUP_ROOT_Q="$(shell_quote "$REMOTE_BACKUP_ROOT")"
REMOTE_ARCHIVE_Q="$(shell_quote "$REMOTE_ARCHIVE")"
APP_NAME_Q="$(shell_quote "$APP_NAME")"
ADMIN_CREDENTIALS_REMOTE_Q="$(shell_quote "$ADMIN_CREDENTIALS_REMOTE")"

REMOTE_ENV="REMOTE_APP_DIR=${REMOTE_APP_DIR_Q} REMOTE_SERVICE=${REMOTE_SERVICE_Q} REMOTE_APP_USER=${REMOTE_APP_USER_Q} REMOTE_APP_GROUP=${REMOTE_APP_GROUP_Q} REMOTE_BACKUP_ROOT=${REMOTE_BACKUP_ROOT_Q} REMOTE_ARCHIVE=${REMOTE_ARCHIVE_Q} APP_NAME=${APP_NAME_Q} ADMIN_CREDENTIALS_REMOTE=${ADMIN_CREDENTIALS_REMOTE_Q}"

ssh -p "$REMOTE_PORT" "$SSH_TARGET" "${REMOTE_ENV} bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail

run_root() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  else
    sudo -n "$@"
  fi
}

run_app() {
  run_root runuser -u "$REMOTE_APP_USER" -- "$@"
}

if ! run_root test -d "$REMOTE_APP_DIR"; then
  echo "Répertoire distant introuvable : ${REMOTE_APP_DIR}" >&2
  exit 1
fi

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_PATH="${REMOTE_BACKUP_ROOT}/${APP_NAME}-${TIMESTAMP}.tar.gz"
DATABASE_PATH="${REMOTE_APP_DIR}/data.sqlite"
DATABASE_BACKUP_PATH="${REMOTE_BACKUP_ROOT}/${APP_NAME}-${TIMESTAMP}-$$.sqlite"
STAGING_DIR="/tmp/${APP_NAME}.staging.$$"

cleanup_remote() {
  rm -rf "$STAGING_DIR"
  rm -f "/tmp/${REMOTE_ARCHIVE}"
  rm -f "${ADMIN_CREDENTIALS_REMOTE}"
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
if run_root test -f "$DATABASE_PATH"; then
  echo "Sauvegarde dédiée de la base de production : ${DATABASE_BACKUP_PATH}"
  run_root cp --preserve=all "$DATABASE_PATH" "$DATABASE_BACKUP_PATH"
fi

mkdir -p "$STAGING_DIR"
tar -xzf "/tmp/${REMOTE_ARCHIVE}" -C "$STAGING_DIR"
if [[ -e "${STAGING_DIR}/data.sqlite" ]]; then
  echo "Sécurité : l'archive de déploiement contient data.sqlite, arrêt sans toucher à la production." >&2
  exit 1
fi

for required_file in app.py templates/base.html templates/training.html templates/t4.html templates/t6.html templates/t7.html templates/t8.html templates/t9.html templates/t10.html static/js/training.js static/js/t4-beer.js static/js/t4.v157.js static/js/t6.js static/js/t7.js static/js/t8.js static/js/t8-aim.js static/js/t9.js static/js/t10.js static/icons/icon-192.png static/icons/icon-512.png static/css/tailwind.css systemd/jsuisdechire.service; do
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

echo "Installation de la configuration systemd de production..."
run_root install -o root -g root -m 0644 "${STAGING_DIR}/systemd/jsuisdechire.service" "/etc/systemd/system/${REMOTE_SERVICE}.service"
if ! run_root grep -Eq '^SECRET_KEY=.{32,}$' /etc/jsuisdechire.env 2>/dev/null; then
  echo "Génération d'une clé de session de production..."
  SECRET_KEY_VALUE="$(openssl rand -hex 32)"
  printf 'SECRET_KEY=%s\n' "$SECRET_KEY_VALUE" > "${STAGING_DIR}/production.env"
  run_root install -o root -g "$REMOTE_APP_GROUP" -m 0640 "${STAGING_DIR}/production.env" /etc/jsuisdechire.env
  unset SECRET_KEY_VALUE
fi

run_root systemctl daemon-reload
run_root systemctl enable "$REMOTE_SERVICE"

echo "Vérification des fichiers t6/t7/t8/t9/t10 et des logos..."
run_root test -f "${REMOTE_APP_DIR}/templates/t6.html"
run_root test -f "${REMOTE_APP_DIR}/templates/t7.html"
run_root test -f "${REMOTE_APP_DIR}/templates/t8.html"
run_root test -f "${REMOTE_APP_DIR}/templates/t9.html"
run_root test -f "${REMOTE_APP_DIR}/templates/t10.html"
run_root test -f "${REMOTE_APP_DIR}/static/js/t6.js"
run_root test -f "${REMOTE_APP_DIR}/static/js/t7.js"
run_root test -f "${REMOTE_APP_DIR}/static/js/t8.js"
run_root test -f "${REMOTE_APP_DIR}/static/js/t8-aim.js"
run_root test -f "${REMOTE_APP_DIR}/static/js/t9.js"
run_root test -f "${REMOTE_APP_DIR}/static/js/t10.js"
run_root test -f "${REMOTE_APP_DIR}/static/css/tailwind.css"
run_root test -f "${REMOTE_APP_DIR}/static/branding/logo-horizontal.png"
run_root test -f "${REMOTE_APP_DIR}/static/branding/logo-horizontal.webp"
run_root test -f "${REMOTE_APP_DIR}/static/icons/icon-192.png"
run_root test -f "${REMOTE_APP_DIR}/static/icons/icon-512.png"

PREVIOUS_MAIN_PID="$(run_root systemctl show --property=MainPID --value "$REMOTE_SERVICE" 2>/dev/null || true)"
echo "Redémarrage du service ${REMOTE_SERVICE}..."
run_root systemctl restart "$REMOTE_SERVICE"
sleep 2
if ! run_root systemctl is-active --quiet "$REMOTE_SERVICE"; then
  run_root systemctl status "$REMOTE_SERVICE" --no-pager -l || true
  exit 1
fi

CURRENT_MAIN_PID="$(run_root systemctl show --property=MainPID --value "$REMOTE_SERVICE")"
if [[ -z "$CURRENT_MAIN_PID" || "$CURRENT_MAIN_PID" == "0" || "$CURRENT_MAIN_PID" == "$PREVIOUS_MAIN_PID" ]]; then
  echo "Le processus ${REMOTE_SERVICE} n'a pas été remplacé après le redémarrage." >&2
  run_root systemctl status "$REMOTE_SERVICE" --no-pager -l || true
  exit 1
fi

echo "Service actif : ${REMOTE_SERVICE} (PID ${CURRENT_MAIN_PID})"
echo "Backup : ${BACKUP_PATH}"

# This provisioning step is optional.  Keep it after the verified service
# restart so a credential error cannot leave the newly installed application
# code unloaded in Gunicorn.
if [[ -n "${ADMIN_CREDENTIALS_REMOTE}" ]]; then
  echo "Mise à jour des identifiants admin de production..."
  run_root test -f "$ADMIN_CREDENTIALS_REMOTE"
  ADMIN_CREDENTIALS_STAGED="${STAGING_DIR}/admin-credentials.json"
  run_root install -o "$REMOTE_APP_USER" -g "$REMOTE_APP_GROUP" -m 0600 "$ADMIN_CREDENTIALS_REMOTE" "$ADMIN_CREDENTIALS_STAGED"
  (
    cd "$REMOTE_APP_DIR"
    FLASK_ENV=development run_app "$REMOTE_APP_DIR/.venv/bin/python" - "$ADMIN_CREDENTIALS_STAGED" <<'PY'
import json
import sys

import app

with open(sys.argv[1], encoding="utf-8") as handle:
    credentials = json.load(handle)

with app.app.app_context():
    app.init_db()
    app.set_admin_credentials(
        login=credentials["login"],
        password_hash=credentials["password_hash"],
    )
    print("Compte admin configuré :", credentials["login"])
PY
  )
  run_root rm -f "$ADMIN_CREDENTIALS_REMOTE"
fi
REMOTE_SCRIPT

if [[ "$RUN_HTTP_CHECKS" == "1" ]]; then
  require_command curl
  echo "Contrôles HTTP publics..."
  for route in / /training /t1 /t2 /t3 /t4 /t5 /t6 /t7 /t8 /t9 /t10 /t11 /static/js/training.js /static/js/t4-beer.js /jj-hub /static/branding/logo-horizontal.png /static/branding/logo-horizontal.webp /static/icons/icon-192.png /static/icons/icon-512.png; do
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
