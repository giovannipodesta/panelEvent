#!/bin/bash

# Deployment script for panelEvent v2 (SvelteKit) to GCloud VM
# Builds the project and syncs the /build/ output to /var/www/panel on the server

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
VM_NAME="evolution-evento"
VM_USER="encuentrafacil"
REMOTE_PATH="/var/www/panel"
TEMP_PATH="/tmp/panel-deploy"
ZONE="us-east4-a"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Deploy Panel Event v2 (SvelteKit)${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check prerequisites
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

# Confirm
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

# Step 1: Build with production env
echo -e "${GREEN}[1/4] Building project with production .env...${NC}"
if [ -f .env.production ]; then
    # Temporarily use production env for build
    cp .env .env.backup 2>/dev/null || true
    cp .env.production .env
    npm run build
    # Restore dev env
    mv .env.backup .env 2>/dev/null || true
else
    echo -e "${YELLOW}Warning: .env.production not found, building with current .env${NC}"
    npm run build
fi

echo -e "${GREEN}✓ Build complete${NC}"
echo ""

# Step 2: Prepare remote temp directory
echo -e "${GREEN}[2/4] Preparing server...${NC}"
gcloud compute ssh ${VM_USER}@${VM_NAME} --zone=${ZONE} \
    --command="rm -rf ${TEMP_PATH} && mkdir -p ${TEMP_PATH}"

# Step 3: Copy build output
echo -e "${GREEN}[3/4] Uploading build to server...${NC}"
gcloud compute scp --recurse --zone=${ZONE} \
    build/* \
    ${VM_USER}@${VM_NAME}:${TEMP_PATH}/

# Step 4: Move to final location
echo -e "${GREEN}[4/4] Deploying to ${REMOTE_PATH}...${NC}"
gcloud compute ssh ${VM_USER}@${VM_NAME} --zone=${ZONE} \
    --command="sudo cp -rf ${TEMP_PATH}/* ${REMOTE_PATH}/ && sudo chmod -R 755 ${REMOTE_PATH} && sudo chown -R www-data:www-data ${REMOTE_PATH} && rm -rf ${TEMP_PATH}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Your panel is now live at:${NC}"
echo "  - https://evento.encuentra-facil.com/panel/"
echo "  - https://evento.encuentra-facil.com/panel/admin"
echo "  - https://evento.encuentra-facil.com/panel/invitados"
echo "  - https://evento.encuentra-facil.com/panel/referidos"
echo "  - https://evento.encuentra-facil.com/panel/token"
