#!/usr/bin/env bash
# Adds "Contract Whist" to your application menu.
set -euo pipefail
DIR="$(dirname "$(readlink -f "$0")")"
APPS="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
ICONS="${XDG_DATA_HOME:-$HOME/.local/share}/icons/hicolor/scalable/apps"

mkdir -p "$APPS" "$ICONS"
chmod +x "$DIR/run.sh" "$DIR/stop.sh"
cp "$DIR/site/assets/icon.svg" "$ICONS/contract-whist.svg"

cat > "$APPS/contract-whist.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=Contract Whist
Comment=Scorekeeper for Contract Whist
Exec=$DIR/run.sh
Icon=contract-whist
Terminal=false
Categories=Game;CardGame;
StartupNotify=true
DESKTOP

chmod +x "$APPS/contract-whist.desktop"
update-desktop-database "$APPS" 2>/dev/null || true
gtk-update-icon-cache -f -t "${XDG_DATA_HOME:-$HOME/.local/share}/icons/hicolor" 2>/dev/null || true

echo "Installed. Look for 'Contract Whist' in your app menu."
echo "For a desktop icon too:  cp \"$APPS/contract-whist.desktop\" ~/Desktop && chmod +x ~/Desktop/contract-whist.desktop"
