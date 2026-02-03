#!/usr/bin/env python3
"""
Render API Deployment Monitor for ASR PO System
Monitors deployment status for commit 2b4b722 (NextAuth fix)

Usage:
    export RENDER_API_KEY="your_api_key_here"
    python monitor_render_deployment.py

Requirements:
    pip install requests
"""

import os
import sys
import json
import time
import requests
from datetime import datetime
from typing import Dict, Optional, List

# Configuration
SERVICE_ID = "srv-d5girrp4tr6s73ed7d1g"
TARGET_COMMIT = "2b4b722"
BASE_URL = "https://api.render.com/v1"
POLL_INTERVAL = 10  # seconds
MAX_POLLS = 180  # 30 minutes total

class RenderAPIMonitor:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
            "User-Agent": "ASR-PO-System-Monitor/1.0"
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)

    def get_service_info(self) -> Optional[Dict]:
        """Get basic service information"""
        try:
            url = f"{BASE_URL}/services/{SERVICE_ID}"
            response = self.session.get(url)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"❌ Error getting service info: {e}")
            return None

    def get_deployments(self) -> Optional[List[Dict]]:
        """Get list of recent deployments"""
        try:
            url = f"{BASE_URL}/services/{SERVICE_ID}/deploys"
            response = self.session.get(url)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"❌ Error getting deployments: {e}")
            return None

    def find_target_deployment(self, deployments: List[Dict]) -> Optional[Dict]:
        """Find deployment matching our target commit"""
        for deploy in deployments:
            commit = deploy.get("commit", {})
            sha = commit.get("sha", "")

            if sha.startswith(TARGET_COMMIT):
                return deploy

        return None

    def check_deployment_status(self) -> Dict:
        """Check current deployment status"""
        print(f"🔍 Checking deployment status for commit {TARGET_COMMIT}...")

        # Get deployments
        deployments = self.get_deployments()
        if not deployments:
            return {"success": False, "error": "Failed to fetch deployments"}

        # Find our target deployment
        target_deploy = self.find_target_deployment(deployments)
        if not target_deploy:
            return {"success": False, "error": f"Deployment for commit {TARGET_COMMIT} not found"}

        # Extract deployment info
        status = target_deploy.get("status", "unknown")
        created_at = target_deploy.get("createdAt", "")
        finished_at = target_deploy.get("finishedAt", "")
        deploy_id = target_deploy.get("id", "")
        commit = target_deploy.get("commit", {})

        print(f"📋 Deployment Details:")
        print(f"   ID: {deploy_id}")
        print(f"   Commit: {commit.get('sha', '')[:8]} - {commit.get('message', '')[:50]}...")
        print(f"   Status: {status}")
        print(f"   Created: {created_at}")
        if finished_at:
            print(f"   Finished: {finished_at}")

        return {
            "success": True,
            "status": status,
            "deploy_id": deploy_id,
            "created_at": created_at,
            "finished_at": finished_at,
            "deployment": target_deploy
        }

    def monitor_deployment(self) -> Dict:
        """Monitor deployment until completion"""
        print(f"🚀 Starting deployment monitor for commit {TARGET_COMMIT}")
        print(f"⏱️  Polling every {POLL_INTERVAL}s (max {MAX_POLLS * POLL_INTERVAL // 60} minutes)")

        for attempt in range(MAX_POLLS):
            result = self.check_deployment_status()

            if not result["success"]:
                return result

            status = result["status"]

            # Check for terminal states
            if status == "live":
                print(f"✅ DEPLOYMENT SUCCEEDED! (attempt {attempt + 1})")
                return {"success": True, "status": status, "result": "success"}

            elif status in ["build_failed", "update_failed", "canceled", "deactivated"]:
                print(f"❌ DEPLOYMENT FAILED: {status} (attempt {attempt + 1})")
                return {"success": False, "status": status, "result": "failed"}

            elif status in ["created", "build_in_progress", "update_in_progress"]:
                print(f"⏳ Deployment in progress: {status} (attempt {attempt + 1}/{MAX_POLLS})")
                if attempt < MAX_POLLS - 1:  # Don't sleep on last attempt
                    time.sleep(POLL_INTERVAL)
                continue

            else:
                print(f"❓ Unknown status: {status} (attempt {attempt + 1})")
                if attempt < MAX_POLLS - 1:
                    time.sleep(POLL_INTERVAL)
                continue

        print(f"⏱️ TIMEOUT: Deployment monitoring exceeded {MAX_POLLS * POLL_INTERVAL // 60} minutes")
        return {"success": None, "status": "timeout", "result": "timeout"}

    def verify_application_health(self) -> Dict:
        """Verify application health endpoints"""
        print(f"\n🏥 Testing application health...")

        base_app_url = "https://asr-po-system-enterprise.onrender.com"
        health_endpoints = [
            "/api/health",
            "/api/health/database",
            "/api/health/detailed",
            "/api/auth/providers"
        ]

        results = {}

        for endpoint in health_endpoints:
            url = f"{base_app_url}{endpoint}"
            try:
                print(f"   Testing {endpoint}...")
                response = requests.get(url, timeout=30)

                results[endpoint] = {
                    "status_code": response.status_code,
                    "success": response.status_code == 200,
                    "response_time_ms": round(response.elapsed.total_seconds() * 1000, 2)
                }

                if response.status_code == 200:
                    print(f"   ✅ {endpoint}: OK ({results[endpoint]['response_time_ms']}ms)")
                else:
                    print(f"   ❌ {endpoint}: {response.status_code}")

            except requests.exceptions.RequestException as e:
                results[endpoint] = {"error": str(e), "success": False}
                print(f"   ❌ {endpoint}: {e}")

        return results

def main():
    # Check for API key
    api_key = os.environ.get("RENDER_API_KEY")
    if not api_key:
        print("❌ RENDER_API_KEY environment variable not set")
        print("\n🔧 To fix this:")
        print("1. Go to Render Dashboard → Account Settings → API Keys")
        print("2. Create a new API key")
        print("3. Run: export RENDER_API_KEY='your_api_key_here'")
        print("4. Run this script again")
        sys.exit(1)

    monitor = RenderAPIMonitor(api_key)

    # Test API connection first
    print("🔌 Testing Render API connection...")
    service_info = monitor.get_service_info()
    if not service_info:
        print("❌ Failed to connect to Render API. Check your API key.")
        sys.exit(1)

    print(f"✅ Connected to Render API")
    print(f"📊 Service: {service_info.get('name', 'Unknown')}")
    print(f"🔗 URL: {service_info.get('serviceDetails', {}).get('url', 'N/A')}")

    # Check current deployment status
    status_result = monitor.check_deployment_status()

    if not status_result["success"]:
        print(f"❌ {status_result['error']}")
        sys.exit(1)

    current_status = status_result["status"]

    # Decide on next action based on current status
    if current_status == "live":
        print(f"\n✅ Deployment is already LIVE! Proceeding to health verification...")
        health_results = monitor.verify_application_health()

        # Summary
        print(f"\n📊 FINAL RESULTS:")
        print(f"🚀 Deployment Status: ✅ LIVE")
        healthy_endpoints = sum(1 for r in health_results.values() if r.get('success', False))
        total_endpoints = len(health_results)
        print(f"🏥 Health Check: {healthy_endpoints}/{total_endpoints} endpoints healthy")

        if healthy_endpoints == total_endpoints:
            print(f"🎉 ASR PO System is fully operational!")
        else:
            print(f"⚠️  Some health checks failed. Review results above.")

    elif current_status in ["created", "build_in_progress", "update_in_progress"]:
        print(f"\n⏳ Deployment is in progress. Starting continuous monitoring...")
        monitor_result = monitor.monitor_deployment()

        if monitor_result["result"] == "success":
            print(f"\n🎉 Deployment completed successfully! Testing application health...")
            health_results = monitor.verify_application_health()
            print(f"\n✅ Monitoring complete - ASR PO System is operational!")
        elif monitor_result["result"] == "failed":
            print(f"\n❌ Deployment failed. Check Render dashboard for error details.")
            sys.exit(1)
        else:
            print(f"\n⏱️ Monitoring timed out. Check Render dashboard manually.")
            sys.exit(1)

    elif current_status in ["build_failed", "update_failed", "canceled", "deactivated"]:
        print(f"\n❌ Deployment has FAILED with status: {current_status}")
        print(f"🔧 Next steps:")
        print(f"1. Check Render dashboard deploy logs for error details")
        print(f"2. Look for new static generation errors")
        print(f"3. Fix any issues and push new commit")
        sys.exit(1)

    else:
        print(f"\n❓ Unknown deployment status: {current_status}")
        print(f"🔧 Check Render dashboard manually for details")
        sys.exit(1)

if __name__ == "__main__":
    main()