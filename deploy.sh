#!/bin/bash

################################################################################
# SmileFix Deployment Script
# 
# Purpose: Unified, standardized deployment script for SmileFix backend
# Version: 1.0.0 (Pre-Multi-Tenant)
# 
# Usage:
#   ./deploy.sh [environment]
#
# Environments:
#   - production (default)
#   - staging
#
# Prerequisites:
#   1. PostgreSQL database is running and accessible
#   2. .env file exists with proper configuration
#   3. Node.js v20+ is installed
#   4. Database credentials are correct
#
# What this script does:
#   1. Validates environment
#   2. Pulls latest code (if git repo)
#   3. Installs/updates dependencies
#   4. Runs database migrations
#   5. Runs tests
#   6. Restarts the backend service
#
################################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-production}"
BACKEND_DIR="dental-clinic-backend"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="deployment-${TIMESTAMP}.log"

################################################################################
# Helper Functions
################################################################################

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✓${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}✗${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1" | tee -a "$LOG_FILE"
}

section() {
    echo "" | tee -a "$LOG_FILE"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$LOG_FILE"
    echo -e "${BLUE}$1${NC}" | tee -a "$LOG_FILE"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$LOG_FILE"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        error "$1 is not installed. Please install it first."
        exit 1
    fi
}

################################################################################
# Pre-flight Checks
################################################################################

preflight_checks() {
    section "Pre-flight Checks"
    
    log "Checking required tools..."
    check_command node
    check_command npm
    check_command psql
    
    success "Node version: $(node --version)"
    success "NPM version: $(npm --version)"
    
    log "Checking backend directory..."
    if [ ! -d "$BACKEND_DIR" ]; then
        error "Backend directory '$BACKEND_DIR' not found!"
        exit 1
    fi
    success "Backend directory found"
    
    log "Checking .env file..."
    if [ ! -f "$BACKEND_DIR/.env" ]; then
        error ".env file not found in $BACKEND_DIR!"
        exit 1
    fi
    success ".env file exists"
    
    log "Verifying database connection..."
    cd "$BACKEND_DIR"
    if npm run db:migrate -- --help &> /dev/null; then
        success "Database connection verified"
    else
        warning "Could not verify database connection (this may be ok)"
    fi
    cd ..
}

################################################################################
# Pull Latest Code
################################################################################

pull_code() {
    section "Pulling Latest Code"
    
    if [ -d ".git" ]; then
        log "Git repository detected"
        
        # Save current branch
        CURRENT_BRANCH=$(git branch --show-current)
        log "Current branch: $CURRENT_BRANCH"
        
        # Check for uncommitted changes
        if [[ -n $(git status -s) ]]; then
            warning "Uncommitted changes detected!"
            read -p "Continue anyway? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                error "Deployment cancelled"
                exit 1
            fi
        fi
        
        log "Pulling latest changes..."
        git pull origin "$CURRENT_BRANCH"
        success "Code updated"
    else
        warning "Not a git repository, skipping code pull"
    fi
}

################################################################################
# Install Dependencies
################################################################################

install_dependencies() {
    section "Installing Dependencies"
    
    cd "$BACKEND_DIR"
    
    log "Installing npm packages..."
    npm ci --production=false
    
    success "Dependencies installed"
    cd ..
}

################################################################################
# Run Database Migrations
################################################################################

run_migrations() {
    section "Running Database Migrations"
    
    cd "$BACKEND_DIR"
    
    log "Running migrations..."
    npm run db:migrate
    
    success "Migrations completed"
    cd ..
}

################################################################################
# Run Tests
################################################################################

run_tests() {
    section "Running Tests"
    
    cd "$BACKEND_DIR"
    
    log "Running test suite..."
    if npm test; then
        success "All tests passed ✓"
    else
        error "Tests failed!"
        warning "Deployment halted due to test failures"
        exit 1
    fi
    
    cd ..
}

################################################################################
# Restart Service
################################################################################

restart_service() {
    section "Restarting Service"
    
    cd "$BACKEND_DIR"
    
    # Check if PM2 is being used
    if command -v pm2 &> /dev/null; then
        log "PM2 detected, restarting with PM2..."
        
        if pm2 list | grep -q "smilefix-backend"; then
            log "Restarting existing PM2 process..."
            pm2 restart smilefix-backend
            success "Service restarted via PM2"
        else
            log "Starting new PM2 process..."
            pm2 start src/server.js --name smilefix-backend
            pm2 save
            success "Service started via PM2"
        fi
    else
        warning "PM2 not found. Manual restart required."
        warning "Run: cd $BACKEND_DIR && npm start"
        warning "Or use a process manager like PM2, systemd, or Docker"
    fi
    
    cd ..
}

################################################################################
# Deployment Summary
################################################################################

deployment_summary() {
    section "Deployment Summary"
    
    success "Environment: $ENVIRONMENT"
    success "Timestamp: $TIMESTAMP"
    success "Log file: $LOG_FILE"
    
    echo ""
    log "Deployment completed successfully! 🎉"
    echo ""
    
    warning "Post-deployment checklist:"
    echo "  1. Verify the service is running (check logs)"
    echo "  2. Test critical endpoints (health check, login)"
    echo "  3. Monitor error logs for any issues"
    echo "  4. Check database connection"
    echo ""
}

################################################################################
# Main Deployment Flow
################################################################################

main() {
    echo ""
    log "═══════════════════════════════════════════════════════"
    log "  SmileFix Deployment Script"
    log "  Environment: $ENVIRONMENT"
    log "═══════════════════════════════════════════════════════"
    echo ""
    
    # Execute deployment steps
    preflight_checks
    pull_code
    install_dependencies
    run_migrations
    run_tests
    restart_service
    deployment_summary
}

# Run main function
main "$@"
