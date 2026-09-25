#!/usr/bin/env sh
set -eu

[ "$(id -u)" -eq 0 ] || {
  echo "Run as root on the NEW Ubuntu VPS." >&2
  exit 2
}

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ENV="$ROOT/.env.production"

test -f "$ENV" || { echo "Missing $ENV." >&2; exit 2; }
set -a
. "$ENV"
set +a
SCHEDULE_TZ="$TZ"

write_unit() {
  path="$1"
  shift
  cat > "$path" <<EOF
$*
EOF
}

write_unit /etc/systemd/system/dtf-studio-backup.service "[Unit]
Description=DTF Studio production backup
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
WorkingDirectory=$ROOT
ExecStart=$ROOT/backup-production.sh"

write_unit /etc/systemd/system/dtf-studio-backup.timer "[Unit]
Description=Run DTF Studio production backup daily

[Timer]
OnCalendar=*-*-* 02:15:00 $SCHEDULE_TZ
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target"

write_unit /etc/systemd/system/dtf-studio-restore-drill.service "[Unit]
Description=DTF Studio non-destructive restore drill
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
WorkingDirectory=$ROOT
ExecStart=$ROOT/restore-drill.sh"

write_unit /etc/systemd/system/dtf-studio-restore-drill.timer "[Unit]
Description=Run DTF Studio restore drill weekly

[Timer]
OnCalendar=Sun *-*-* 04:15:00 $SCHEDULE_TZ
Persistent=true
RandomizedDelaySec=600

[Install]
WantedBy=timers.target"

write_unit /etc/systemd/system/dtf-studio-monitor.service "[Unit]
Description=DTF Studio production health monitor
After=docker.service network-online.target
Requires=docker.service
Wants=network-online.target

[Service]
Type=oneshot
WorkingDirectory=$ROOT
ExecStart=$ROOT/monitor-production.sh"

write_unit /etc/systemd/system/dtf-studio-monitor.timer "[Unit]
Description=Check DTF Studio production health every five minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
AccuracySec=30s

[Install]
WantedBy=timers.target"

write_unit /etc/systemd/system/dtf-studio-tls-renew.service "[Unit]
Description=DTF Studio TLS renewal
After=docker.service network-online.target
Requires=docker.service
Wants=network-online.target

[Service]
Type=oneshot
WorkingDirectory=$ROOT
ExecStart=$ROOT/renew-tls.sh"

write_unit /etc/systemd/system/dtf-studio-tls-renew.timer "[Unit]
Description=Check DTF Studio TLS renewal twice daily

[Timer]
OnCalendar=*-*-* 03,15:20:00 $SCHEDULE_TZ
Persistent=true
RandomizedDelaySec=600

[Install]
WantedBy=timers.target"

systemctl daemon-reload
systemctl enable --now   dtf-studio-backup.timer   dtf-studio-restore-drill.timer   dtf-studio-monitor.timer   dtf-studio-tls-renew.timer

systemctl list-timers   dtf-studio-backup.timer   dtf-studio-restore-drill.timer   dtf-studio-monitor.timer   dtf-studio-tls-renew.timer
