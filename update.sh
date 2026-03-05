#!/bin/bash
# Auto-update script for website-ohanax
# Runs via cron every 5 minutes

cd /Users/mac/Documents/website-ohanax || exit 1

# Pull latest changes
OLD_HEAD=$(git rev-parse HEAD)
git pull --ff-only 2>/dev/null
NEW_HEAD=$(git rev-parse HEAD)

# If nothing changed, exit
if [ "$OLD_HEAD" = "$NEW_HEAD" ]; then
    exit 0
fi

echo "$(date): Updated from ${OLD_HEAD:0:7} to ${NEW_HEAD:0:7}"

# Check if dependencies changed
if git diff "$OLD_HEAD" "$NEW_HEAD" --name-only | grep -q "package-lock.json\|package.json"; then
    echo "$(date): Dependencies changed, running npm install..."
    npm install --production 2>&1
    cd dashboard && npm install --production 2>&1
    cd ..
fi

# Restart the service
echo "$(date): Restarting website..."
launchctl stop com.ohanax.website
sleep 2
launchctl start com.ohanax.website
echo "$(date): Restart complete"
