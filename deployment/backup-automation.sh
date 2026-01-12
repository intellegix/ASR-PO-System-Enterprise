#!/bin/bash

# ASR Purchase Order System - Automated Backup System
# Phase 4D - Deployment Setup
# Production backup automation with monitoring and retention

set -euo pipefail

# =====================================================
# CONFIGURATION
# =====================================================

# Load environment variables
source /etc/environment
export BACKUP_SCRIPT_VERSION="1.0.0"
export BACKUP_START_TIME=$(date '+%Y-%m-%d %H:%M:%S')

# Database configuration
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_NAME="${DATABASE_NAME:-asr_po_production}"
DB_USER="${DATABASE_USER:-postgres}"
export PGPASSWORD="${DATABASE_PASSWORD}"

# Backup configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/asr-po-system}"
BACKUP_PREFIX="asr-po-backup"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
BACKUP_COMPRESSION="${BACKUP_COMPRESSION:-gzip}"

# S3 configuration (optional)
S3_ENABLED="${BACKUP_S3_ENABLED:-false}"
S3_BUCKET="${BACKUP_S3_BUCKET:-}"
S3_REGION="${BACKUP_S3_REGION:-us-west-2}"

# Monitoring configuration
WEBHOOK_URL="${MONITORING_WEBHOOK_URL:-}"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
EMAIL_NOTIFICATIONS="${BACKUP_EMAIL_NOTIFICATIONS:-false}"
EMAIL_TO="${BACKUP_EMAIL_TO:-admin@yourdomain.com}"

# Performance settings
BACKUP_PARALLEL_JOBS="${BACKUP_PARALLEL_JOBS:-2}"
BACKUP_BUFFER_SIZE="${BACKUP_BUFFER_SIZE:-1024}"

# =====================================================
# UTILITY FUNCTIONS
# =====================================================

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$BACKUP_DIR/backup.log"
}

error_exit() {
    log "ERROR: $1"
    send_notification "❌ ASR PO Backup Failed" "$1" "error"
    exit 1
}

send_notification() {
    local title="$1"
    local message="$2"
    local level="${3:-info}"

    log "NOTIFICATION: $title - $message"

    # Slack notification
    if [[ -n "$SLACK_WEBHOOK" ]]; then
        local color="good"
        local emoji="✅"

        case $level in
            "error") color="danger"; emoji="❌" ;;
            "warning") color="warning"; emoji="⚠️" ;;
        esac

        curl -s -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"$emoji ASR PO System Backup\",
                    \"text\": \"$title\\n$message\",
                    \"footer\": \"Production Backup System\",
                    \"ts\": $(date +%s)
                }]
            }" || true
    fi

    # Email notification (if configured)
    if [[ "$EMAIL_NOTIFICATIONS" == "true" ]]; then
        echo "Subject: $title" | \
        mail -s "$title" "$EMAIL_TO" <<< "$message" || true
    fi

    # Generic webhook
    if [[ -n "$WEBHOOK_URL" ]]; then
        curl -s -X POST "$WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{
                \"service\": \"asr-po-backup\",
                \"title\": \"$title\",
                \"message\": \"$message\",
                \"level\": \"$level\",
                \"timestamp\": \"$(date -Iseconds)\"
            }" || true
    fi
}

check_prerequisites() {
    log "Checking prerequisites..."

    # Check if PostgreSQL client tools are available
    if ! command -v pg_dump &> /dev/null; then
        error_exit "pg_dump not found. Please install PostgreSQL client tools."
    fi

    # Check database connectivity
    if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -q; then
        error_exit "Cannot connect to database at $DB_HOST:$DB_PORT"
    fi

    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    chmod 750 "$BACKUP_DIR"

    # Check disk space (require at least 1GB free)
    local available_space
    available_space=$(df "$BACKUP_DIR" | awk 'NR==2 {print $4}')
    if [[ $available_space -lt 1048576 ]]; then
        error_exit "Insufficient disk space. At least 1GB required."
    fi

    log "Prerequisites check completed successfully"
}

# =====================================================
# BACKUP FUNCTIONS
# =====================================================

backup_database() {
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_file="$BACKUP_DIR/${BACKUP_PREFIX}_${timestamp}.sql"
    local compressed_file="${backup_file}.gz"

    log "Starting database backup..."
    log "Source: $DB_HOST:$DB_PORT/$DB_NAME"
    log "Target: $backup_file"

    # Create backup with optimized settings
    pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --verbose \
        --no-password \
        --format=custom \
        --compress=0 \
        --jobs="$BACKUP_PARALLEL_JOBS" \
        --exclude-table-data="audit_log" \
        --exclude-table-data="temp_files" \
        --exclude-table-data="session_store" \
        --file="$backup_file" || error_exit "Database backup failed"

    # Compress the backup
    if [[ "$BACKUP_COMPRESSION" == "gzip" ]]; then
        log "Compressing backup file..."
        gzip "$backup_file" || error_exit "Backup compression failed"
        backup_file="$compressed_file"
    fi

    # Get backup file size
    local backup_size
    backup_size=$(du -h "$backup_file" | cut -f1)

    log "Database backup completed successfully"
    log "Backup file: $backup_file"
    log "Backup size: $backup_size"

    # Store backup file path for cleanup and upload
    echo "$backup_file" > "$BACKUP_DIR/.last_backup"
}

backup_application_files() {
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local app_backup_file="$BACKUP_DIR/${BACKUP_PREFIX}_app_${timestamp}.tar.gz"

    log "Starting application files backup..."

    # Backup critical application files (excluding node_modules, .next, logs)
    tar -czf "$app_backup_file" \
        --exclude="node_modules" \
        --exclude=".next" \
        --exclude="*.log" \
        --exclude=".env*" \
        --exclude="coverage" \
        --exclude=".git" \
        -C /app \
        . || error_exit "Application files backup failed"

    local app_backup_size
    app_backup_size=$(du -h "$app_backup_file" | cut -f1)

    log "Application files backup completed"
    log "Backup file: $app_backup_file"
    log "Backup size: $app_backup_size"

    echo "$app_backup_file" >> "$BACKUP_DIR/.last_backup"
}

# =====================================================
# S3 UPLOAD
# =====================================================

upload_to_s3() {
    if [[ "$S3_ENABLED" != "true" || -z "$S3_BUCKET" ]]; then
        log "S3 upload disabled or not configured"
        return 0
    fi

    log "Starting S3 upload..."

    if ! command -v aws &> /dev/null; then
        log "WARNING: AWS CLI not found, skipping S3 upload"
        return 0
    fi

    while read -r backup_file; do
        local s3_key="asr-po-backups/$(date '+%Y/%m/%d')/$(basename "$backup_file")"

        log "Uploading $backup_file to s3://$S3_BUCKET/$s3_key"

        aws s3 cp "$backup_file" "s3://$S3_BUCKET/$s3_key" \
            --region "$S3_REGION" \
            --storage-class STANDARD_IA || {
                log "WARNING: S3 upload failed for $backup_file"
                send_notification "⚠️ S3 Upload Failed" "Failed to upload $backup_file to S3" "warning"
            }
    done < "$BACKUP_DIR/.last_backup"

    log "S3 upload completed"
}

# =====================================================
# CLEANUP FUNCTIONS
# =====================================================

cleanup_old_backups() {
    log "Starting cleanup of backups older than $RETENTION_DAYS days..."

    local deleted_count=0

    # Clean local backups
    while IFS= read -r -d '' file; do
        log "Deleting old backup: $file"
        rm "$file"
        ((deleted_count++))
    done < <(find "$BACKUP_DIR" -name "${BACKUP_PREFIX}_*" -type f -mtime +$RETENTION_DAYS -print0)

    log "Cleanup completed: $deleted_count old backups removed"

    # Clean S3 backups if enabled
    if [[ "$S3_ENABLED" == "true" && -n "$S3_BUCKET" ]] && command -v aws &> /dev/null; then
        log "Cleaning old S3 backups..."

        local cutoff_date
        cutoff_date=$(date -d "$RETENTION_DAYS days ago" '+%Y-%m-%d')

        aws s3api list-objects-v2 \
            --bucket "$S3_BUCKET" \
            --prefix "asr-po-backups/" \
            --query "Contents[?LastModified<='$cutoff_date'].{Key: Key}" \
            --output text | \
        while read -r s3_key; do
            if [[ -n "$s3_key" && "$s3_key" != "None" ]]; then
                log "Deleting old S3 backup: $s3_key"
                aws s3 rm "s3://$S3_BUCKET/$s3_key" || true
            fi
        done
    fi
}

# =====================================================
# BACKUP VERIFICATION
# =====================================================

verify_backup() {
    log "Starting backup verification..."

    while read -r backup_file; do
        if [[ "$backup_file" == *.sql.gz ]]; then
            # Verify gzipped SQL backup
            if gzip -t "$backup_file"; then
                log "✓ Backup file integrity verified: $backup_file"
            else
                error_exit "Backup file corrupted: $backup_file"
            fi
        elif [[ "$backup_file" == *.sql ]]; then
            # Verify uncompressed SQL backup
            if pg_restore --list "$backup_file" &> /dev/null; then
                log "✓ Database backup structure verified: $backup_file"
            else
                error_exit "Database backup corrupted: $backup_file"
            fi
        elif [[ "$backup_file" == *.tar.gz ]]; then
            # Verify tar.gz file
            if tar -tzf "$backup_file" &> /dev/null; then
                log "✓ Application backup verified: $backup_file"
            else
                error_exit "Application backup corrupted: $backup_file"
            fi
        fi
    done < "$BACKUP_DIR/.last_backup"

    log "Backup verification completed successfully"
}

# =====================================================
# MONITORING AND METRICS
# =====================================================

generate_backup_report() {
    local backup_end_time=$(date '+%Y-%m-%d %H:%M:%S')
    local backup_duration
    backup_duration=$(( $(date -d "$backup_end_time" +%s) - $(date -d "$BACKUP_START_TIME" +%s) ))

    local backup_files_count
    backup_files_count=$(wc -l < "$BACKUP_DIR/.last_backup")

    local total_backup_size
    total_backup_size=$(while read -r file; do du -b "$file"; done < "$BACKUP_DIR/.last_backup" | awk '{sum+=$1} END {print sum}')
    total_backup_size_human=$(numfmt --to=iec-i --suffix=B "$total_backup_size")

    # Create backup report
    cat > "$BACKUP_DIR/backup-report-$(date '+%Y%m%d_%H%M%S').json" <<EOF
{
    "backup_id": "$(uuidgen)",
    "version": "$BACKUP_SCRIPT_VERSION",
    "start_time": "$BACKUP_START_TIME",
    "end_time": "$backup_end_time",
    "duration_seconds": $backup_duration,
    "status": "success",
    "database": {
        "host": "$DB_HOST",
        "port": $DB_PORT,
        "name": "$DB_NAME"
    },
    "files": {
        "count": $backup_files_count,
        "total_size_bytes": $total_backup_size,
        "total_size_human": "$total_backup_size_human"
    },
    "retention": {
        "days": $RETENTION_DAYS
    },
    "s3": {
        "enabled": $S3_ENABLED,
        "bucket": "$S3_BUCKET"
    }
}
EOF

    log "Backup report generated"
    log "Duration: ${backup_duration}s"
    log "Files backed up: $backup_files_count"
    log "Total size: $total_backup_size_human"
}

# =====================================================
# MAIN EXECUTION
# =====================================================

main() {
    log "=================================================="
    log "ASR Purchase Order System - Automated Backup"
    log "Phase 4D - Production Deployment"
    log "Script Version: $BACKUP_SCRIPT_VERSION"
    log "Start Time: $BACKUP_START_TIME"
    log "=================================================="

    # Send start notification
    send_notification "🔄 Backup Started" "ASR PO System backup process initiated" "info"

    # Execute backup process
    check_prerequisites
    backup_database
    backup_application_files
    verify_backup
    upload_to_s3
    cleanup_old_backups
    generate_backup_report

    # Send success notification
    local backup_files_info
    backup_files_info=$(wc -l < "$BACKUP_DIR/.last_backup")

    send_notification "✅ Backup Completed" "ASR PO System backup completed successfully. $backup_files_info files backed up." "success"

    log "=================================================="
    log "Backup process completed successfully"
    log "End Time: $(date '+%Y-%m-%d %H:%M:%S')"
    log "=================================================="

    # Cleanup temporary files
    rm -f "$BACKUP_DIR/.last_backup"
}

# Error handling
trap 'error_exit "Backup process interrupted"' INT TERM

# Execute main function
main "$@"