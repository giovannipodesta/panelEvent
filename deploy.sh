#!/bin/bash

# Deployment script for panelEvent to GCloud VM evolution-evento
# Syncs local files to /var/www/panel on the production server

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
VM_NAME="evolution-evento"
VM_USER="encuentrafacil"
REMOTE_PATH="/var/www/panel"
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
read -p "Continue with deployment? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Deployment cancelled${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Starting deployment...${NC}"
echo ""

# Copy files
echo -e "${BLUE}→ Copying HTML, CSS, and JS files...${NC}"
gcloud compute scp --zone=${ZONE} \
    index.html \
    style.css \
    config.env.js \
    config.js \
    categories.js \
    script.js \
    ${VM_USER}@${VM_NAME}:${REMOTE_PATH}/

echo -e "${BLUE}→ Copying assets directory...${NC}"
gcloud compute scp --recurse --zone=${ZONE} \
    assets \
    ${VM_USER}@${VM_NAME}:${REMOTE_PATH}/

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Files copied successfully${NC}"
    echo ""
    
    # Set proper permissions
    echo -e "${BLUE}→ Setting file permissions...${NC}"
    gcloud compute ssh ${VM_USER}@${VM_NAME} --zone=${ZONE} \
        --command="chmod -R 755 ${REMOTE_PATH}"
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Deployment completed successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${BLUE}Your panel is now live at the production URL${NC}"
else
    echo ""
    echo -e "${RED}✗ Deployment failed${NC}"
    exit 1
fi
