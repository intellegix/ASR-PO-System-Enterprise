#!/usr/bin/env python3
"""
ASR Purchase Order System - AWS Deployment Script
Automates the creation of AWS infrastructure for production deployment

Requirements:
- AWS CLI configured with appropriate permissions
- Python 3.8+
- boto3: pip install boto3

Usage:
    python deploy-aws.py --phase 1  # Infrastructure setup
    python deploy-aws.py --phase 2  # Application deployment
"""

import boto3
import json
import sys
import time
import argparse
from datetime import datetime
from typing import Dict, Optional

class AWSDeployer:
    def __init__(self, region: str = 'us-east-2'):
        self.region = region
        self.project_name = 'asr-po-system'

        # Initialize AWS clients
        self.ec2 = boto3.client('ec2', region_name=region)
        self.rds = boto3.client('rds', region_name=region)
        self.elasticache = boto3.client('elasticache', region_name=region)
        self.ecr = boto3.client('ecr', region_name=region)
        self.apprunner = boto3.client('apprunner', region_name=region)
        self.secretsmanager = boto3.client('secretsmanager', region_name=region)
        self.s3 = boto3.client('s3', region_name=region)
        self.route53 = boto3.client('route53', region_name=region)

    def create_vpc(self) -> Dict:
        """Create VPC with public and private subnets"""
        print("Creating VPC for ASR PO System...")

        # Create VPC
        vpc_response = self.ec2.create_vpc(
            CidrBlock='10.0.0.0/16',
            TagSpecifications=[{
                'ResourceType': 'vpc',
                'Tags': [
                    {'Key': 'Name', 'Value': f'{self.project_name}-vpc'},
                    {'Key': 'Project', 'Value': 'ASR-PO-System'},
                    {'Key': 'Environment', 'Value': 'production'}
                ]
            }]
        )
        vpc_id = vpc_response['Vpc']['VpcId']
        print(f"Created VPC: {vpc_id}")

        # Wait for VPC to be available
        self.ec2.get_waiter('vpc_available').wait(VpcIds=[vpc_id])

        # Enable DNS hostnames
        self.ec2.modify_vpc_attribute(VpcId=vpc_id, EnableDnsHostnames={'Value': True})

        return {'vpc_id': vpc_id}

    def create_subnets(self, vpc_id: str) -> Dict:
        """Create public and private subnets in multiple AZs"""
        print("Creating subnets...")

        subnets = {}

        # Get availability zones
        azs = self.ec2.describe_availability_zones()['AvailabilityZones']

        # Create public subnets
        for i, az in enumerate(azs[:2]):  # Use first 2 AZs
            subnet_response = self.ec2.create_subnet(
                VpcId=vpc_id,
                CidrBlock=f'10.0.{i+1}.0/24',
                AvailabilityZone=az['ZoneName'],
                TagSpecifications=[{
                    'ResourceType': 'subnet',
                    'Tags': [
                        {'Key': 'Name', 'Value': f'{self.project_name}-public-{i+1}'},
                        {'Key': 'Type', 'Value': 'Public'},
                        {'Key': 'Project', 'Value': 'ASR-PO-System'}
                    ]
                }]
            )
            subnets[f'public_{i+1}'] = subnet_response['Subnet']['SubnetId']
            print(f"Created public subnet {i+1}: {subnet_response['Subnet']['SubnetId']}")

        # Create private subnets
        for i, az in enumerate(azs[:2]):
            subnet_response = self.ec2.create_subnet(
                VpcId=vpc_id,
                CidrBlock=f'10.0.{i+10}.0/24',
                AvailabilityZone=az['ZoneName'],
                TagSpecifications=[{
                    'ResourceType': 'subnet',
                    'Tags': [
                        {'Key': 'Name', 'Value': f'{self.project_name}-private-{i+1}'},
                        {'Key': 'Type', 'Value': 'Private'},
                        {'Key': 'Project', 'Value': 'ASR-PO-System'}
                    ]
                }]
            )
            subnets[f'private_{i+1}'] = subnet_response['Subnet']['SubnetId']
            print(f"Created private subnet {i+1}: {subnet_response['Subnet']['SubnetId']}")

        return subnets

    def create_security_groups(self, vpc_id: str) -> Dict:
        """Create security groups for different components"""
        print("Creating security groups...")

        # App Runner security group
        app_sg = self.ec2.create_security_group(
            GroupName=f'{self.project_name}-app',
            Description='Security group for App Runner service',
            VpcId=vpc_id,
            TagSpecifications=[{
                'ResourceType': 'security-group',
                'Tags': [
                    {'Key': 'Name', 'Value': f'{self.project_name}-app-sg'},
                    {'Key': 'Project', 'Value': 'ASR-PO-System'}
                ]
            }]
        )
        app_sg_id = app_sg['GroupId']

        # RDS security group
        rds_sg = self.ec2.create_security_group(
            GroupName=f'{self.project_name}-rds',
            Description='Security group for RDS PostgreSQL',
            VpcId=vpc_id,
            TagSpecifications=[{
                'ResourceType': 'security-group',
                'Tags': [
                    {'Key': 'Name', 'Value': f'{self.project_name}-rds-sg'},
                    {'Key': 'Project', 'Value': 'ASR-PO-System'}
                ]
            }]
        )
        rds_sg_id = rds_sg['GroupId']

        # Allow PostgreSQL from App Runner
        self.ec2.authorize_security_group_ingress(
            GroupId=rds_sg_id,
            IpPermissions=[{
                'IpProtocol': 'tcp',
                'FromPort': 5432,
                'ToPort': 5432,
                'UserIdGroupPairs': [{'GroupId': app_sg_id}]
            }]
        )

        # Redis security group
        redis_sg = self.ec2.create_security_group(
            GroupName=f'{self.project_name}-redis',
            Description='Security group for ElastiCache Redis',
            VpcId=vpc_id,
            TagSpecifications=[{
                'ResourceType': 'security-group',
                'Tags': [
                    {'Key': 'Name', 'Value': f'{self.project_name}-redis-sg'},
                    {'Key': 'Project', 'Value': 'ASR-PO-System'}
                ]
            }]
        )
        redis_sg_id = redis_sg['GroupId']

        # Allow Redis from App Runner
        self.ec2.authorize_security_group_ingress(
            GroupId=redis_sg_id,
            IpPermissions=[{
                'IpProtocol': 'tcp',
                'FromPort': 6379,
                'ToPort': 6379,
                'UserIdGroupPairs': [{'GroupId': app_sg_id}]
            }]
        )

        print(f"Created security groups:")
        print(f"   App Runner: {app_sg_id}")
        print(f"   RDS: {rds_sg_id}")
        print(f"   Redis: {redis_sg_id}")

        return {
            'app_sg_id': app_sg_id,
            'rds_sg_id': rds_sg_id,
            'redis_sg_id': redis_sg_id
        }

    def create_rds_instance(self, subnet_ids: list, security_group_id: str) -> Dict:
        """Create RDS PostgreSQL instance"""
        print("Creating RDS PostgreSQL instance...")

        # Create DB subnet group
        subnet_group_name = f'{self.project_name}-db-subnet-group'
        self.rds.create_db_subnet_group(
            DBSubnetGroupName=subnet_group_name,
            DBSubnetGroupDescription='Subnet group for ASR PO System RDS',
            SubnetIds=subnet_ids,
            Tags=[
                {'Key': 'Name', 'Value': subnet_group_name},
                {'Key': 'Project', 'Value': 'ASR-PO-System'}
            ]
        )

        # Create RDS instance
        db_instance_id = f'{self.project_name}-prod'
        self.rds.create_db_instance(
            DBInstanceIdentifier=db_instance_id,
            DBInstanceClass='db.t3.micro',
            Engine='postgres',
            EngineVersion='15.15',
            MasterUsername='postgres',
            MasterUserPassword='ASRPostgres2024!SecureDB',
            AllocatedStorage=50,
            StorageType='gp3',
            StorageEncrypted=True,
            MultiAZ=True,
            PubliclyAccessible=False,
            DBSubnetGroupName=subnet_group_name,
            VpcSecurityGroupIds=[security_group_id],
            BackupRetentionPeriod=7,
            PreferredBackupWindow='03:00-04:00',
            PreferredMaintenanceWindow='sun:04:00-sun:05:00',
            EnablePerformanceInsights=True,
            PerformanceInsightsRetentionPeriod=7,
            DeletionProtection=True,
            Tags=[
                {'Key': 'Name', 'Value': db_instance_id},
                {'Key': 'Project', 'Value': 'ASR-PO-System'},
                {'Key': 'Environment', 'Value': 'production'}
            ]
        )

        print(f"Created RDS instance: {db_instance_id}")
        print("RDS instance creation in progress (10-15 minutes)...")

        return {'db_instance_id': db_instance_id}

    def create_s3_bucket(self) -> Dict:
        """Create S3 bucket for exports"""
        print("Creating S3 bucket for exports...")

        bucket_name = f'{self.project_name}-exports-prod'

        # Create bucket
        if self.region == 'us-east-1':
            self.s3.create_bucket(Bucket=bucket_name)
        else:
            self.s3.create_bucket(
                Bucket=bucket_name,
                CreateBucketConfiguration={'LocationConstraint': self.region}
            )

        # Configure bucket policy for private access
        bucket_policy = {
            "Version": "2012-10-17",
            "Statement": [{
                "Sid": "DenyPublicAccess",
                "Effect": "Deny",
                "Principal": "*",
                "Action": "s3:GetObject",
                "Resource": f"arn:aws:s3:::{bucket_name}/*",
                "Condition": {
                    "Bool": {
                        "aws:SecureTransport": "false"
                    }
                }
            }]
        }

        self.s3.put_bucket_policy(Bucket=bucket_name, Policy=json.dumps(bucket_policy))

        # Configure lifecycle policy
        lifecycle_config = {
            'Rules': [{
                'ID': 'DeleteExportsAfter30Days',
                'Status': 'Enabled',
                'Filter': {'Prefix': 'exports/'},
                'Expiration': {'Days': 30}
            }]
        }

        self.s3.put_bucket_lifecycle_configuration(
            Bucket=bucket_name,
            LifecycleConfiguration=lifecycle_config
        )

        print(f"Created S3 bucket: {bucket_name}")

        return {'bucket_name': bucket_name}

    def phase_1_infrastructure(self):
        """Execute Phase 1: Infrastructure setup"""
        print("Starting Phase 1: AWS Infrastructure Setup")
        print(f"Region: {self.region}")
        print("-" * 50)

        try:
            # Create VPC
            vpc_info = self.create_vpc()
            vpc_id = vpc_info['vpc_id']

            # Create subnets
            subnets = self.create_subnets(vpc_id)

            # Create security groups
            security_groups = self.create_security_groups(vpc_id)

            # Create RDS instance
            rds_info = self.create_rds_instance(
                [subnets['private_1'], subnets['private_2']],
                security_groups['rds_sg_id']
            )

            # Create S3 bucket
            s3_info = self.create_s3_bucket()

            # Save configuration
            config = {
                'vpc_id': vpc_id,
                'subnets': subnets,
                'security_groups': security_groups,
                'rds': rds_info,
                's3': s3_info,
                'region': self.region,
                'created_at': datetime.now().isoformat()
            }

            with open('aws-infrastructure-config.json', 'w') as f:
                json.dump(config, f, indent=2)

            print("\nPhase 1 Infrastructure Setup Complete!")
            print("Configuration saved to: aws-infrastructure-config.json")
            print("\nNext steps:")
            print("1. Wait for RDS instance to be available (10-15 minutes)")
            print("2. Configure secrets in AWS Secrets Manager")
            print("3. Run Phase 2: python deploy-aws.py --phase 2")

        except Exception as e:
            print(f"Error in Phase 1: {e}")
            sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description='Deploy ASR PO System to AWS')
    parser.add_argument('--phase', type=int, choices=[1, 2], required=True,
                        help='Deployment phase: 1 (infrastructure) or 2 (application)')
    parser.add_argument('--region', default='us-east-2',
                        help='AWS region (default: us-east-2)')

    args = parser.parse_args()

    deployer = AWSDeployer(region=args.region)

    if args.phase == 1:
        deployer.phase_1_infrastructure()
    elif args.phase == 2:
        print("🚧 Phase 2 (Application Deployment) - Coming next!")
        print("This will include:")
        print("- ECR repository creation and Docker image push")
        print("- App Runner service configuration")
        print("- DNS setup with Route 53")
        print("- CloudWatch monitoring setup")

if __name__ == "__main__":
    main()