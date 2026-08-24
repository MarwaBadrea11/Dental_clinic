################################################################################
# SmileFix Deployment Script (PowerShell)
# 
# Purpose: Unified, standardized deployment script for SmileFix backend
# Version: 1.0.0 (Pre-Multi-Tenant)
# 
# Usage:
#   .\deploy.ps1 [-Environment production|staging]
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

param(
    [string]$Environment = "production"
)

$ErrorActionPreference = "Stop"

# Configuration
$BackendDir = "dental-clinic-backend"
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$LogFile = "deployment-$Timestamp.log"

################################################################################
# Helper Functions
################################################################################

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $Message"
    Write-Host $logMessage
    Add-Content -Path $LogFile -Value $logMessage
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ " -ForegroundColor Green -NoNewline
    Write-Host $Message
    Add-Content -Path $LogFile -Value "✓ $Message"
}

function Write-Error-Message {
    param([string]$Message)
    Write-Host "✗ " -ForegroundColor Red -NoNewline
    Write-Host $Message
    Add-Content -Path $LogFile -Value "✗ $Message"
}

function Write-Warning-Message {
    param([string]$Message)
    Write-Host "⚠ " -ForegroundColor Yellow -NoNewline
    Write-Host $Message
    Add-Content -Path $LogFile -Value "⚠ $Message"
}

function Write-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
    Write-Host $Title -ForegroundColor Blue
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
    Add-Content -Path $LogFile -Value "`n$Title`n"
}

function Test-Command {
    param([string]$CommandName)
    return $null -ne (Get-Command $CommandName -ErrorAction SilentlyContinue)
}

################################################################################
# Pre-flight Checks
################################################################################

function Test-Prerequisites {
    Write-Section "Pre-flight Checks"
    
    Write-Log "Checking required tools..."
    
    if (-not (Test-Command "node")) {
        Write-Error-Message "Node.js is not installed!"
        exit 1
    }
    Write-Success "Node version: $(node --version)"
    
    if (-not (Test-Command "npm")) {
        Write-Error-Message "NPM is not installed!"
        exit 1
    }
    Write-Success "NPM version: $(npm --version)"
    
    if (-not (Test-Command "psql")) {
        Write-Warning-Message "psql not found (PostgreSQL client tools)"
        Write-Warning-Message "This is not critical if database is accessible"
    } else {
        Write-Success "PostgreSQL client tools found"
    }
    
    Write-Log "Checking backend directory..."
    if (-not (Test-Path $BackendDir)) {
        Write-Error-Message "Backend directory '$BackendDir' not found!"
        exit 1
    }
    Write-Success "Backend directory found"
    
    Write-Log "Checking .env file..."
    if (-not (Test-Path "$BackendDir\.env")) {
        Write-Error-Message ".env file not found in $BackendDir!"
        exit 1
    }
    Write-Success ".env file exists"
}

################################################################################
# Pull Latest Code
################################################################################

function Update-Code {
    Write-Section "Pulling Latest Code"
    
    if (Test-Path ".git") {
        Write-Log "Git repository detected"
        
        $currentBranch = git branch --show-current
        Write-Log "Current branch: $currentBranch"
        
        $status = git status --short
        if ($status) {
            Write-Warning-Message "Uncommitted changes detected!"
            $continue = Read-Host "Continue anyway? (y/N)"
            if ($continue -ne "y" -and $continue -ne "Y") {
                Write-Error-Message "Deployment cancelled"
                exit 1
            }
        }
        
        Write-Log "Pulling latest changes..."
        git pull origin $currentBranch
        Write-Success "Code updated"
    } else {
        Write-Warning-Message "Not a git repository, skipping code pull"
    }
}

################################################################################
# Install Dependencies
################################################################################

function Install-Dependencies {
    Write-Section "Installing Dependencies"
    
    Push-Location $BackendDir
    
    try {
        Write-Log "Installing npm packages..."
        npm ci
        Write-Success "Dependencies installed"
    }
    finally {
        Pop-Location
    }
}

################################################################################
# Run Database Migrations
################################################################################

function Invoke-Migrations {
    Write-Section "Running Database Migrations"
    
    Push-Location $BackendDir
    
    try {
        Write-Log "Running migrations..."
        npm run db:migrate
        Write-Success "Migrations completed"
    }
    catch {
        Write-Error-Message "Migration failed: $_"
        throw
    }
    finally {
        Pop-Location
    }
}

################################################################################
# Run Tests
################################################################################

function Invoke-Tests {
    Write-Section "Running Tests"
    
    Push-Location $BackendDir
    
    try {
        Write-Log "Running test suite..."
        npm test
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "All tests passed ✓"
        } else {
            Write-Error-Message "Tests failed!"
            Write-Warning-Message "Deployment halted due to test failures"
            exit 1
        }
    }
    finally {
        Pop-Location
    }
}

################################################################################
# Restart Service
################################################################################

function Restart-BackendService {
    Write-Section "Restarting Service"
    
    Push-Location $BackendDir
    
    try {
        if (Test-Command "pm2") {
            Write-Log "PM2 detected, managing service with PM2..."
            
            $pm2List = pm2 list
            if ($pm2List -match "smilefix-backend") {
                Write-Log "Restarting existing PM2 process..."
                pm2 restart smilefix-backend
                Write-Success "Service restarted via PM2"
            } else {
                Write-Log "Starting new PM2 process..."
                pm2 start src/server.js --name smilefix-backend
                pm2 save
                Write-Success "Service started via PM2"
            }
        } else {
            Write-Warning-Message "PM2 not found. Manual restart required."
            Write-Warning-Message "Run: cd $BackendDir ; npm start"
            Write-Warning-Message "Or install PM2: npm install -g pm2"
        }
    }
    finally {
        Pop-Location
    }
}

################################################################################
# Deployment Summary
################################################################################

function Show-Summary {
    Write-Section "Deployment Summary"
    
    Write-Success "Environment: $Environment"
    Write-Success "Timestamp: $Timestamp"
    Write-Success "Log file: $LogFile"
    
    Write-Host ""
    Write-Log "Deployment completed successfully! 🎉"
    Write-Host ""
    
    Write-Warning-Message "Post-deployment checklist:"
    Write-Host "  1. Verify the service is running (check logs)"
    Write-Host "  2. Test critical endpoints (health check, login)"
    Write-Host "  3. Monitor error logs for any issues"
    Write-Host "  4. Check database connection"
    Write-Host ""
}

################################################################################
# Main Deployment Flow
################################################################################

function Start-Deployment {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════"
    Write-Host "  SmileFix Deployment Script (PowerShell)"
    Write-Host "  Environment: $Environment"
    Write-Host "═══════════════════════════════════════════════════════"
    Write-Host ""
    
    try {
        Test-Prerequisites
        Update-Code
        Install-Dependencies
        Invoke-Migrations
        Invoke-Tests
        Restart-BackendService
        Show-Summary
    }
    catch {
        Write-Error-Message "Deployment failed: $_"
        Write-Host ""
        Write-Host "Check the log file for details: $LogFile"
        exit 1
    }
}

# Run deployment
Start-Deployment
