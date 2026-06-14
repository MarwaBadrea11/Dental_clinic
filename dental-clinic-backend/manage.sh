#!/usr/bin/env bash
# =============================================================================
# manage.sh — Dental Clinic Backend automation CLI
# =============================================================================
# Orchestrates install, database checks, migrations, seeding, and dev server
# startup for the Fastify + Knex + PostgreSQL backend.
#
# Compatible with: Git Bash (Windows), macOS, and Linux.
#
# Usage:
#   ./manage.sh [command]          Run a single command
#   ./manage.sh                    Interactive menu (no arguments)
#   ./manage.sh --help             Show full help
#
# To add a new command:
#   1. Implement cmd_your_command() below
#   2. Register it in run_command() and show_help()
#   3. Optionally add a menu entry in show_menu()
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Paths — resolve project root from this script's location (portable)
# -----------------------------------------------------------------------------
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="${SCRIPT_DIR}"
readonly ENV_FILE="${PROJECT_ROOT}/.env"
readonly SCRIPTS_DIR="${PROJECT_ROOT}/scripts"

# Minimum supported Node.js major version (see package.json / Fastify 5)
readonly MIN_NODE_MAJOR=18

# -----------------------------------------------------------------------------
# ANSI color codes (disabled when stdout is not a TTY)
# -----------------------------------------------------------------------------
if [[ -t 1 ]]; then
  readonly COLOR_RED='\033[0;31m'
  readonly COLOR_GREEN='\033[0;32m'
  readonly COLOR_YELLOW='\033[0;33m'
  readonly COLOR_BLUE='\033[0;34m'
  readonly COLOR_CYAN='\033[0;36m'
  readonly COLOR_BOLD='\033[1m'
  readonly COLOR_RESET='\033[0m'
else
  readonly COLOR_RED=''
  readonly COLOR_GREEN=''
  readonly COLOR_YELLOW=''
  readonly COLOR_BLUE=''
  readonly COLOR_CYAN=''
  readonly COLOR_BOLD=''
  readonly COLOR_RESET=''
fi

# -----------------------------------------------------------------------------
# Logging helpers
# -----------------------------------------------------------------------------
log_info() {
  printf '%b[INFO]%b %s\n' "${COLOR_BLUE}" "${COLOR_RESET}" "$*"
}

log_success() {
  printf '%b[SUCCESS]%b %s\n' "${COLOR_GREEN}" "${COLOR_RESET}" "$*"
}

log_warn() {
  printf '%b[WARN]%b %s\n' "${COLOR_YELLOW}" "${COLOR_RESET}" "$*" >&2
}

log_error() {
  printf '%b[ERROR]%b %s\n' "${COLOR_RED}" "${COLOR_RESET}" "$*" >&2
}

log_step() {
  printf '\n%b── %s ──%b\n' "${COLOR_CYAN}${COLOR_BOLD}" "$*" "${COLOR_RESET}"
}

die() {
  log_error "$*"
  exit 1
}

# -----------------------------------------------------------------------------
# Ensure we always run Node/npm commands from the project root
# -----------------------------------------------------------------------------
cd "${PROJECT_ROOT}"

# -----------------------------------------------------------------------------
# Prerequisite checks
# -----------------------------------------------------------------------------

# Returns 0 when command exists on PATH.
require_command() {
  local cmd="$1"
  local install_hint="$2"

  if ! command -v "${cmd}" >/dev/null 2>&1; then
    log_error "'${cmd}' is not installed or not on PATH."
    log_error "${install_hint}"
    return 1
  fi
  return 0
}

# Validates Node.js >= MIN_NODE_MAJOR and npm availability.
check_prerequisites() {
  log_step "Checking prerequisites"

  require_command "node" \
    "Install Node.js ${MIN_NODE_MAJOR}+ from https://nodejs.org/" || return 1

  require_command "npm" \
    "npm ships with Node.js — reinstall Node.js if npm is missing." || return 1

  local node_version_raw
  node_version_raw="$(node -v 2>/dev/null || true)"
  # Strip leading "v" and any pre-release suffix (e.g. v18.20.0-nightly)
  local node_major
  node_major="$(echo "${node_version_raw}" | sed -E 's/^v([0-9]+).*/\1/')"

  if [[ -z "${node_major}" || ! "${node_major}" =~ ^[0-9]+$ ]]; then
    log_error "Could not parse Node.js version from: ${node_version_raw:-<empty>}"
    return 1
  fi

  if (( node_major < MIN_NODE_MAJOR )); then
    log_error "Node.js ${MIN_NODE_MAJOR}+ is required (found ${node_version_raw})."
    return 1
  fi

  log_success "Node.js ${node_version_raw} and npm $(npm -v) are available."
  return 0
}

# Verifies the .env file exists at the project root.
check_env_file() {
  if [[ ! -f "${ENV_FILE}" ]]; then
    log_error "Missing environment file: ${ENV_FILE}"
    log_error "Create a .env file at the project root before running this command."
    log_error "Required variables are validated at runtime via Zod (see src/config)."
    return 1
  fi

  log_success "Environment file found: ${ENV_FILE}"
  return 0
}

# Runs prerequisite + .env checks; exits on failure when strict=1 (default).
run_preflight() {
  local strict="${1:-1}"

  if ! check_prerequisites; then
    [[ "${strict}" -eq 1 ]] && exit 1
    return 1
  fi

  if ! check_env_file; then
    [[ "${strict}" -eq 1 ]] && exit 1
    return 1
  fi

  return 0
}

# Confirms a utility script exists before invoking node.
assert_script_exists() {
  local script_path="$1"
  if [[ ! -f "${script_path}" ]]; then
    die "Expected script not found: ${script_path}"
  fi
}

# Wrapper for node utility scripts with consistent logging and exit handling.
run_node_script() {
  local script_rel="$1"
  local description="$2"
  shift 2
  local script_path="${PROJECT_ROOT}/${script_rel}"

  assert_script_exists "${script_path}"
  log_info "${description}"
  node "${script_path}" "$@"
}

# -----------------------------------------------------------------------------
# Core commands — add new pipeline steps here
# -----------------------------------------------------------------------------

cmd_install() {
  log_step "Installing npm dependencies"
  run_preflight
  log_info "Running npm install in ${PROJECT_ROOT}"
  npm install
  log_success "Dependencies installed successfully."
}

cmd_check_db() {
  log_step "Database connectivity check"
  run_preflight
  run_node_script "scripts/check-db.mjs" "Verifying PostgreSQL connectivity..."
  log_success "Database connectivity check passed."
}

cmd_migrate() {
  log_step "Database migrations"
  run_preflight
  run_node_script "scripts/migrate.mjs" "Applying Knex schema migrations (migrate:latest)..."
  log_success "Migrations completed successfully."
}

cmd_seed() {
  log_step "Seed core clinic data"
  run_preflight
  run_node_script "scripts/seed.mjs" "Seeding default admin, roles, permissions, and dentists..."
  log_success "Seed completed successfully."
}

cmd_dev() {
  log_step "Starting development server"
  run_preflight
  log_info "Launching Fastify dev server (npm run dev) — press Ctrl+C to stop."
  log_warn "The server runs in the foreground; leave this terminal open."
  npm run dev
}

# Full bootstrap pipeline: install → check-db → migrate → seed → dev
cmd_setup() {
  log_step "Full setup pipeline"
  log_info "Order: install → check-db → migrate → seed → dev"

  cmd_install
  cmd_check_db
  cmd_migrate
  cmd_seed
  cmd_dev
}

# -----------------------------------------------------------------------------
# Help and interactive menu
# -----------------------------------------------------------------------------

show_banner() {
  printf '%b%s%b\n' \
    "${COLOR_BOLD}${COLOR_CYAN}" \
    "╔══════════════════════════════════════════════════════════════╗
║           Dental Clinic Backend — manage.sh                  ║
╚══════════════════════════════════════════════════════════════╝" \
    "${COLOR_RESET}"
}

show_help() {
  show_banner
  cat <<EOF

${COLOR_BOLD}SYNOPSIS${COLOR_RESET}
  ./manage.sh [command]
  ./manage.sh                 Interactive menu when no command is given

${COLOR_BOLD}COMMANDS${COLOR_RESET}
  install       Install/sync npm dependencies (npm install)
  check-db      Verify PostgreSQL connectivity (node scripts/check-db.mjs)
  migrate       Apply Knex schema migrations (node scripts/migrate.mjs)
  seed          Seed core clinic data — admin, roles, dentists (node scripts/seed.mjs)
  dev           Start the Fastify development server (npm run dev)
  setup         Full pipeline: install → check-db → migrate → seed → dev

${COLOR_BOLD}OPTIONS${COLOR_RESET}
  -h, --help    Show this help message and exit

${COLOR_BOLD}PREREQUISITES${COLOR_RESET}
  • Node.js >= ${MIN_NODE_MAJOR} and npm on PATH
  • .env file at project root (${ENV_FILE})
  • PostgreSQL reachable with credentials defined in .env

${COLOR_BOLD}EXAMPLES${COLOR_RESET}
  ./manage.sh setup
  ./manage.sh migrate
  ./manage.sh check-db
  ./manage.sh dev

${COLOR_BOLD}NOTES${COLOR_RESET}
  • Run from any directory; the script resolves paths relative to its location.
  • setup runs the dev server last and blocks until you stop it (Ctrl+C).
  • Individual commands exit with the underlying tool's status code on failure.

EOF
}

show_menu() {
  show_banner
  cat <<EOF
Select an operation:

  ${COLOR_GREEN}1${COLOR_RESET}) install    — npm install
  ${COLOR_GREEN}2${COLOR_RESET}) check-db   — verify database connectivity
  ${COLOR_GREEN}3${COLOR_RESET}) migrate    — run Knex migrations
  ${COLOR_GREEN}4${COLOR_RESET}) seed       — seed default clinic data
  ${COLOR_GREEN}5${COLOR_RESET}) dev        — start development server
  ${COLOR_GREEN}6${COLOR_RESET}) setup      — full pipeline (1→5)
  ${COLOR_GREEN}h${COLOR_RESET}) help       — show detailed help
  ${COLOR_GREEN}q${COLOR_RESET}) quit

EOF
}

prompt_menu_choice() {
  local choice=""
  read -r -p "Enter choice [1-6, h, q]: " choice
  echo "${choice}"
}

run_interactive_menu() {
  while true; do
    show_menu
    local choice
    choice="$(prompt_menu_choice)"

    case "${choice}" in
      1) cmd_install ;;
      2) cmd_check_db ;;
      3) cmd_migrate ;;
      4) cmd_seed ;;
      5) cmd_dev ;;
      6) cmd_setup ;;
      h|H|help)
        show_help
        ;;
      q|Q|quit|exit)
        log_info "Goodbye."
        exit 0
        ;;
      "")
        log_warn "No input — please choose an option."
        ;;
      *)
        log_warn "Invalid choice: '${choice}'. Try again."
        ;;
    esac

    printf '\n'
    read -r -p "Press Enter to return to the menu (or Ctrl+C to exit)..." _
    printf '\n'
  done
}

# Maps CLI argument to the corresponding command function.
run_command() {
  local command="$1"
  shift || true

  case "${command}" in
    install)   cmd_install "$@" ;;
    check-db)  cmd_check_db "$@" ;;
    migrate)   cmd_migrate "$@" ;;
    seed)      cmd_seed "$@" ;;
    dev)       cmd_dev "$@" ;;
    setup)     cmd_setup "$@" ;;
    -h|--help|help)
      show_help
      ;;
    *)
      log_error "Unknown command: '${command}'"
      echo ""
      show_help
      exit 1
      ;;
  esac
}

# -----------------------------------------------------------------------------
# Entry point
# -----------------------------------------------------------------------------

main() {
  # Graceful message when user interrupts a long-running command (e.g. dev server)
  trap 'printf "\n"; log_warn "Interrupted."; exit 130' INT TERM

  if [[ $# -eq 0 ]]; then
    run_interactive_menu
  else
    run_command "$@"
  fi
}

main "$@"
