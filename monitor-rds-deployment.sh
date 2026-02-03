#!/bin/bash
# Monitor RDS deployment progress until available

echo "🔄 Monitoring RDS PostgreSQL deployment..."
echo "Instance: asr-po-system-prod"
echo "Expected duration: 10-15 minutes"
echo "======================================="

# Check status every 30 seconds
while true; do
    STATUS=$(aws rds describe-db-instances --db-instance-identifier asr-po-system-prod --query 'DBInstances[0].DBInstanceStatus' --output text)
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

    echo "[$TIMESTAMP] Status: $STATUS"

    if [ "$STATUS" = "available" ]; then
        echo ""
        echo "✅ RDS PostgreSQL instance is now AVAILABLE!"
        echo ""
        aws rds describe-db-instances --db-instance-identifier asr-po-system-prod --query 'DBInstances[0].[DBInstanceStatus,Endpoint.Address,Engine,EngineVersion,MultiAZ,StorageEncrypted]' --output table
        echo ""
        echo "🎉 Database ready for application deployment!"
        break
    elif [ "$STATUS" = "failed" ]; then
        echo ""
        echo "❌ RDS deployment FAILED!"
        aws rds describe-db-instances --db-instance-identifier asr-po-system-prod --query 'DBInstances[0].[DBInstanceStatus,StatusInfos]' --output table
        break
    fi

    sleep 30
done