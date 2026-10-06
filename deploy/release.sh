#!/bin/bash
# Installs an unpacked release and switches to it. Run as root on the instance
# by the deploy workflow (through SSM Run Command):
#
#   release.sh <release dir>
#
# The release dir holds the built backend and frontend, the yarn files and
# this deploy/ folder. If the new backend doesn't answer, the previous release
# is restored and the script fails.
set -euo pipefail

release_dir=$(cd "$1" && pwd)
deploy_dir="$release_dir/deploy"
current=/opt/pandanstreet/current
releases=/opt/pandanstreet/releases

# SSM Run Command starts with a bare environment; Corepack caches Yarn in $HOME.
export HOME=/root
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin"

# DOMAIN, AWS_REGION, S3_BUCKET, PHOTOS_BASE_URL, CONFIG_PATH (written by the
# instance's user data from the CloudFormation stack).
# shellcheck source=/dev/null
source /etc/pandanstreet/stack.env

"$deploy_dir/bootstrap.sh" "$release_dir"

param() {
  aws ssm get-parameter --region "$AWS_REGION" --with-decryption \
    --name "$CONFIG_PATH/$1" --query Parameter.Value --output text
}

echo '--- Writing config'
umask 077
{
  echo 'NODE_ENV=production'
  echo 'PORT=3001'
  echo "FRONTEND_ORIGIN=https://$DOMAIN"
  echo "AWS_REGION=$AWS_REGION"
  echo "S3_BUCKET=$S3_BUCKET"
  echo "PHOTOS_BASE_URL=$PHOTOS_BASE_URL"
  echo "SUPABASE_URL=$(param SUPABASE_URL)"
  echo "SUPABASE_SERVICE_ROLE_KEY=$(param SUPABASE_SERVICE_ROLE_KEY)"
  echo "SESSION_SECRET=$(param SESSION_SECRET)"
} > /etc/pandanstreet/backend.env.new
mv /etc/pandanstreet/backend.env.new /etc/pandanstreet/backend.env
param ORIGIN_CERT > /etc/pandanstreet/tls/origin.pem
param ORIGIN_KEY > /etc/pandanstreet/tls/origin.key
umask 022

echo '--- Installing backend dependencies'
(cd "$release_dir" && COREPACK_ENABLE_DOWNLOAD_PROMPT=0 yarn workspaces focus backend --production)

echo '--- Switching release'
previous=$(readlink -f "$current" || true)
ln -sfn "$release_dir" "$current.new"
mv -T "$current.new" "$current"

sed "s/__DOMAIN__/$DOMAIN/g" "$deploy_dir/nginx.conf" > /etc/nginx/sites-available/pandanstreet
ln -sfn /etc/nginx/sites-available/pandanstreet /etc/nginx/sites-enabled/pandanstreet
nginx -t
systemctl reload-or-restart nginx

systemctl restart pandanstreet-backend

healthy() {
  for _ in $(seq 1 30); do
    if curl -fsS -o /dev/null http://127.0.0.1:3001/; then
      return 0
    fi
    sleep 1
  done
  return 1
}

if ! healthy; then
  echo '!!! The new backend is not answering; recent logs:'
  journalctl -u pandanstreet-backend -n 50 --no-pager || true
  if [ -n "$previous" ] && [ -d "$previous" ] && [ "$previous" != "$release_dir" ]; then
    echo "!!! Rolling back to $previous"
    ln -sfn "$previous" "$current.new"
    mv -T "$current.new" "$current"
    systemctl restart pandanstreet-backend
  fi
  exit 1
fi

echo '--- Pruning old releases (keeping the last 3)'
# shellcheck disable=SC2012
ls -1dt "$releases"/*/ | tail -n +4 | while read -r old; do
  if [ "$(readlink -f "$old")" != "$(readlink -f "$current")" ]; then
    rm -rf "$old"
  fi
done

echo "--- Released $(basename "$release_dir")"
