#!/bin/bash
set -euo pipefail

# ============================================
# Deploy SvelteKit static build to GCloud VM
# ============================================
# Target: /var/www/panel/ on evolution-evento
# Auth: nginx basic auth (preserved, not touched)
# No Node.js needed on server — pure static files
# ============================================

VM="evolution-evento"
ZONE="us-east4-a"
USER="encuentrafacil"
REMOTE_PATH="/var/www/panel"
BUILD_DIR="build"

echo "========================================="
echo "  Panel Event — Deploy to GCloud"
echo "========================================="
echo ""
echo "  VM:     $VM ($ZONE)"
echo "  Target: $REMOTE_PATH"
echo ""

# 1. Build with production env
echo "▸ Building with production config..."
cp .env.production .env.production.bak 2>/dev/null || true
NODE_ENV=production npm run build
echo "  ✓ Build complete"
echo ""

# 2. Verify build output exists
if [ ! -d "$BUILD_DIR" ] || [ ! -f "$BUILD_DIR/index.html" ]; then
    echo "✗ ERROR: Build directory missing or empty. Aborting."
    exit 1
fi

FILE_COUNT=$(find "$BUILD_DIR" -type f | wc -l | tr -d ' ')
echo "  Files to deploy: $FILE_COUNT"
echo ""

# 3. Confirm
read -p "Deploy $FILE_COUNT files to $VM:$REMOTE_PATH? [y/N] " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

# 4. Upload build to temp dir on VM (avoids permission issues)
TEMP_DIR="/tmp/panel-deploy-$(date +%s)"
echo ""
echo "▸ Uploading build files..."
gcloud compute scp --recurse "$BUILD_DIR"/* "$USER@$VM:$TEMP_DIR/" --zone="$ZONE"
echo "  ✓ Upload complete"

# 5. Move files to final location with correct permissions
echo ""
echo "▸ Deploying to $REMOTE_PATH..."
gcloud compute ssh "$USER@$VM" --zone="$ZONE" --command="
    # Backup current version (just in case)
    if [ -d $REMOTE_PATH ]; then
        sudo cp -r $REMOTE_PATH ${REMOTE_PATH}.bak-\$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
    fi

    # Clear old files (but preserve .htpasswd if somehow there)
    sudo rm -rf ${REMOTE_PATH}/*

    # Move new files
    sudo cp -r ${TEMP_DIR}/* ${REMOTE_PATH}/

    # Set permissions
    sudo chown -R www-data:www-data ${REMOTE_PATH}
    sudo chmod -R 755 ${REMOTE_PATH}

    # Cleanup temp
    rm -rf ${TEMP_DIR}

    echo 'Files deployed:'
    ls -la ${REMOTE_PATH}/ | head -20
"

# 6. Verify nginx config and reload
echo ""
echo "▸ Verifying nginx..."
gcloud compute ssh "$USER@$VM" --zone="$ZONE" --command="
    sudo nginx -t && sudo systemctl reload nginx
    echo '  ✓ Nginx reloaded'
"

echo ""
echo "========================================="
echo "  ✓ Deploy complete!"
echo "========================================="
echo ""
echo "  URL: https://evento.encuentra-facil.com/panel/"
echo "  Auth: nginx basic auth (unchanged)"
echo ""
echo "  Verify:"
echo "    curl -sI https://evento.encuentra-facil.com/panel/ | head -5"
echo ""
