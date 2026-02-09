#!/bin/bash

# Deployment script for panelEvent to GCloud VM evolution-evento
# Syncs local files to /var/www/panel on the production server
# Now supports multiple pages: panel, referidos, invitados-especiales

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
VM_NAME="evolution-evento"
VM_USER="encuentrafacil"
REMOTE_PATH="/var/www/panel"
TEMP_PATH="/tmp/panel-deploy"
ZONE="us-east4-a"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Deploying Panel Event to GCloud VM${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Confirm deployment
echo -e "${BLUE}Target:${NC} ${VM_USER}@${VM_NAME}:${REMOTE_PATH}"
echo -e "${BLUE}Zone:${NC} ${ZONE}"
echo ""
echo -e "${YELLOW}Files to deploy:${NC}"
echo "  - HTML: index.html, referidos.html, invitados-especiales.html"
echo "  - CSS: style.css, referidos.css, invitados-especiales.css"
echo "  - JS: config.env.js, config.js, categories.js, script.js, utils.js"
echo "  - JS: referidos.js, invitados-especiales.js"
echo "  - Directories: assets/, components/"
echo ""
read -p "Continue with deployment? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Deployment cancelled${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Starting deployment...${NC}"
echo ""

# Create a temporary config.env.js for production
echo -e "${BLUE}→ Creating production config.env.js...${NC}"
TEMP_CONFIG=$(mktemp)
sed "s/ENVIRONMENT: 'development'/ENVIRONMENT: 'production'/" config.env.js > "$TEMP_CONFIG"

# Prepare temp directory on remote
echo -e "${BLUE}→ Preparing temporary directory on server...${NC}"
gcloud compute ssh ${VM_USER}@${VM_NAME} --zone=${ZONE} \
    --command="rm -rf ${TEMP_PATH} && mkdir -p ${TEMP_PATH}"

# Copy main HTML files
echo -e "${BLUE}→ Copying HTML files...${NC}"
gcloud compute scp --zone=${ZONE} \
    index.html \
    referidos.html \
    invitados-especiales.html \
    ${VM_USER}@${VM_NAME}:${TEMP_PATH}/

# Copy CSS files
echo -e "${BLUE}→ Copying CSS files...${NC}"
gcloud compute scp --zone=${ZONE} \
    style.css \
    referidos.css \
    invitados-especiales.css \
    ${VM_USER}@${VM_NAME}:${TEMP_PATH}/

# Copy the production config.env.js
echo -e "${BLUE}→ Copying config.env.js (production)...${NC}"
gcloud compute scp --zone=${ZONE} \
    "$TEMP_CONFIG" \
    ${VM_USER}@${VM_NAME}:${TEMP_PATH}/config.env.js

# Clean up local temp file
rm "$TEMP_CONFIG"

# Copy other JS files
echo -e "${BLUE}→ Copying JavaScript files...${NC}"
gcloud compute scp --zone=${ZONE} \
    config.js \
    categories.js \
    script.js \
    utils.js \
    referidos.js \
    invitados-especiales.js \
    ${VM_USER}@${VM_NAME}:${TEMP_PATH}/

# Copy assets directory
echo -e "${BLUE}→ Copying assets directory...${NC}"
gcloud compute scp --recurse --zone=${ZONE} \
    assets \
    ${VM_USER}@${VM_NAME}:${TEMP_PATH}/

# Copy components directory
echo -e "${BLUE}→ Copying components directory...${NC}"
gcloud compute scp --recurse --zone=${ZONE} \
    components \
    ${VM_USER}@${VM_NAME}:${TEMP_PATH}/

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Files copied to temporary directory${NC}"
    echo ""
    
    # Move files from temp to final location with sudo
    echo -e "${BLUE}→ Moving files to ${REMOTE_PATH}...${NC}"
    gcloud compute ssh ${VM_USER}@${VM_NAME} --zone=${ZONE} \
        --command="sudo cp -rf ${TEMP_PATH}/* ${REMOTE_PATH}/ && rm -rf ${TEMP_PATH}"
    
    # Set proper permissions
    echo -e "${BLUE}→ Setting file permissions...${NC}"
    gcloud compute ssh ${VM_USER}@${VM_NAME} --zone=${ZONE} \
        --command="sudo chmod -R 755 ${REMOTE_PATH} && sudo chown -R www-data:www-data ${REMOTE_PATH}"
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Deployment completed successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${BLUE}Your panel is now live at:${NC}"
    echo "  - https://evento.encuentra-facil.com/panel/"
    echo "  - https://evento.encuentra-facil.com/panel/referidos.html"
    echo "  - https://evento.encuentra-facil.com/panel/invitados-especiales.html"
else
    echo ""
    echo -e "${RED}✗ Deployment failed${NC}"
    exit 1
fi
