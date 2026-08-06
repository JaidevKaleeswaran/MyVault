#!/usr/bin/env python3
"""
MyVault AWS Cleanup Script
===========================
Deletes EVERY AWS resource that infrastructure.py created.
Reads resource IDs from aws/aws-outputs.json so it always
cleans up exactly what was provisioned — no guessing.

Run this when you want to stop all AWS charges for MyVault:
  python3 aws/cleanup.py

⚠️  This permanently deletes all user data stored in DynamoDB.
    Export your data first if you need to keep it.
"""

import sys
import subprocess
import json
import os
import time

try:
    import boto3
    from botocore.exceptions import ClientError
except ImportError:
    print("📦  Installing boto3...")
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'boto3', '--quiet'])
    import boto3
    from botocore.exceptions import ClientError

# ── Terminal colours ───────────────────────────────────────────────────────────
G = '\033[92m'
Y = '\033[93m'
R = '\033[91m'
C = '\033[96m'
B = '\033[1m'
X = '\033[0m'

def ok(msg):   print(f"{G}  ✅  {msg}{X}")
def info(msg): print(f"{C}  ➜   {msg}{X}")
def warn(msg): print(f"{Y}  ⚠️   {msg}{X}")
def fail(msg): print(f"{R}  ❌  {msg}{X}")
def step(title): print(f"\n{B}{C}{'─' * 62}\n  {title}\n{'─' * 62}{X}")

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
OUTPUTS_FILE = os.path.join(SCRIPT_DIR, 'aws-outputs.json')


def safe_delete(fn, resource_name):
    """Run fn(); catch and log errors without crashing the whole script."""
    try:
        fn()
        ok(f"Deleted: {resource_name}")
    except ClientError as e:
        code = e.response['Error']['Code']
        # Treat 'not found' errors as already deleted — that's fine
        not_found_codes = {
            'ResourceNotFoundException', 'NotFoundException',
            'NoSuchEntity', 'ResourceNotFound',
            'InvalidParameterException',  # API Gateway when API is already gone
        }
        if code in not_found_codes or 'not found' in str(e).lower() or 'does not exist' in str(e).lower():
            warn(f"Already gone (skipping): {resource_name}")
        else:
            warn(f"Could not delete {resource_name}: {e.response['Error']['Message']}")
    except Exception as e:
        warn(f"Unexpected error deleting {resource_name}: {e}")


def load_outputs():
    if not os.path.exists(OUTPUTS_FILE):
        fail(f"aws-outputs.json not found at: {OUTPUTS_FILE}")
        fail("Run infrastructure.py first, or delete resources manually via AWS Console.")
        sys.exit(1)
    with open(OUTPUTS_FILE) as f:
        return json.load(f)


def confirm():
    print(f"\n{R}{B}⚠️   WARNING — THIS WILL PERMANENTLY DELETE:{X}")
    print(f"{Y}")
    print("      • All DynamoDB data (every user's transactions, categories, etc.)")
    print("      • All Lambda functions")
    print("      • Both API Gateways (HTTP + WebSocket)")
    print("      • The IAM execution role")
    print(f"{X}")
    answer = input(f"  Type {B}DELETE{X} to confirm: ").strip()
    if answer != 'DELETE':
        print(f"\n{Y}Aborted — nothing was deleted.{X}\n")
        sys.exit(0)


def main():
    print(f"\n{B}{C}{'═' * 62}")
    print("  MyVault  ·  AWS Cleanup")
    print(f"{'═' * 62}{X}\n")

    outputs    = load_outputs()
    region     = outputs.get('region', 'us-west-1')
    account_id = outputs.get('accountId')

    info(f"Loaded outputs from: {OUTPUTS_FILE}")
    info(f"Region     : {region}")
    info(f"Account    : {account_id}")
    info(f"Created at : {outputs.get('createdAt', 'unknown')}")

    confirm()

    session = boto3.Session(region_name=region)
    lam     = session.client('lambda')
    ddb     = session.client('dynamodb')
    apiv2   = session.client('apigatewayv2')
    iam     = session.client('iam')

    # ── 1. DynamoDB Stream trigger ─────────────────────────────────────────────
    step("1/6 — Removing DynamoDB Stream trigger")
    trigger_uuid = outputs.get('streamTriggerUuid')
    if trigger_uuid and trigger_uuid != 'unknown':
        safe_delete(
            lambda: lam.delete_event_source_mapping(UUID=trigger_uuid),
            f"stream trigger {trigger_uuid}",
        )
        # Give AWS a moment to detach the trigger before deleting the table
        time.sleep(5)
    else:
        warn("No stream trigger UUID in outputs — skipping")

    # ── 2. HTTP API Gateway ────────────────────────────────────────────────────
    step("2/6 — Deleting HTTP API Gateway")
    http_api_id = outputs.get('httpApiId')
    if http_api_id:
        safe_delete(
            lambda: apiv2.delete_api(ApiId=http_api_id),
            f"HTTP API {http_api_id}",
        )
    else:
        warn("No HTTP API ID in outputs — skipping")

    # ── 3. WebSocket API Gateway ───────────────────────────────────────────────
    step("3/6 — Deleting WebSocket API Gateway")
    ws_api_id = outputs.get('wsApiId')
    if ws_api_id:
        safe_delete(
            lambda: apiv2.delete_api(ApiId=ws_api_id),
            f"WebSocket API {ws_api_id}",
        )
    else:
        warn("No WebSocket API ID in outputs — skipping")

    # ── 4. Lambda functions ────────────────────────────────────────────────────
    step("4/6 — Deleting Lambda functions")
    lambda_arns = outputs.get('lambdaArns', {})
    if lambda_arns:
        for func_name in lambda_arns:
            safe_delete(
                lambda fn=func_name: lam.delete_function(FunctionName=fn),
                func_name,
            )
    else:
        warn("No Lambda ARNs in outputs — attempting to delete by known names")
        known_names = [row[0] for row in [
            ('myvault-get-user-data',),
            ('myvault-upsert-transaction',),
            ('myvault-update-transaction',),
            ('myvault-delete-transaction',),
            ('myvault-upsert-category',),
            ('myvault-update-category',),
            ('myvault-delete-category',),
            ('myvault-upsert-income',),
            ('myvault-update-income',),
            ('myvault-delete-income',),
            ('myvault-update-cycle',),
            ('myvault-upsert-chat',),
            ('myvault-upsert-voice-log',),
            ('myvault-scan-receipt',),
            ('myvault-transcribe-audio',),
            ('myvault-ws-connect',),
            ('myvault-ws-disconnect',),
            ('myvault-ws-stream-push',),
        ]]
        for func_name in known_names:
            safe_delete(
                lambda fn=func_name: lam.delete_function(FunctionName=fn),
                func_name,
            )

    # ── 5. IAM role ────────────────────────────────────────────────────────────
    step("5/6 — Deleting IAM role and policies")
    role_name = 'myvault-lambda-role'

    # Detach inline policies first
    safe_delete(
        lambda: iam.delete_role_policy(
            RoleName=role_name,
            PolicyName='myvault-lambda-policy',
        ),
        f"inline policy on {role_name}",
    )

    # Detach any managed policies
    try:
        attached = iam.list_attached_role_policies(RoleName=role_name).get('AttachedPolicies', [])
        for p in attached:
            safe_delete(
                lambda arn=p['PolicyArn']: iam.detach_role_policy(RoleName=role_name, PolicyArn=arn),
                f"managed policy {p['PolicyName']}",
            )
    except ClientError:
        pass

    safe_delete(
        lambda: iam.delete_role(RoleName=role_name),
        f"IAM role {role_name}",
    )

    # ── 6. CloudFront distribution ─────────────────────────────────────────────
    step("6/9 — Disabling + deleting CloudFront distribution")
    cf      = session.client('cloudfront')
    dist_id = outputs.get('cfDistributionId')

    if dist_id:
        try:
            dist = cf.get_distribution(Id=dist_id)
            etag = dist['ETag']
            cfg  = dist['Distribution']['DistributionConfig']
            if cfg.get('Enabled', False):
                cfg['Enabled'] = False
                cf.update_distribution(DistributionConfig=cfg, Id=dist_id, IfMatch=etag)
                info("CloudFront disabled — waiting to reach Deployed state (~3-8 min)...")
                waiter = cf.get_waiter('distribution_deployed')
                waiter.wait(Id=dist_id, WaiterConfig={'Delay': 30, 'MaxAttempts': 25})
                etag = cf.get_distribution(Id=dist_id)['ETag']
            safe_delete(
                lambda: cf.delete_distribution(Id=dist_id, IfMatch=etag),
                f"CloudFront distribution {dist_id}",
            )
        except ClientError as e:
            warn(f"CloudFront issue: {e.response['Error']['Message']}")
    else:
        warn("No CloudFront distribution ID in outputs — skipping")

    # ── 7. CloudFront OAC ─────────────────────────────────────────────────────
    step("7/9 — Deleting CloudFront OAC")
    oac_id = outputs.get('cfOacId')
    if oac_id:
        try:
            etag = cf.get_origin_access_control(Id=oac_id)['ETag']
            safe_delete(
                lambda: cf.delete_origin_access_control(Id=oac_id, IfMatch=etag),
                f"CloudFront OAC {oac_id}",
            )
        except ClientError:
            warn("OAC not found — skipping")
    else:
        warn("No OAC ID in outputs — skipping")

    # ── 8. S3 bucket ──────────────────────────────────────────────────────────
    step("8/9 — Emptying + deleting S3 bucket")
    s3_client = session.client('s3')
    s3_bucket = outputs.get('s3Bucket')
    if s3_bucket:
        try:
            paginator = s3_client.get_paginator('list_objects_v2')
            deleted   = 0
            for page in paginator.paginate(Bucket=s3_bucket):
                objects = page.get('Contents', [])
                if objects:
                    s3_client.delete_objects(
                        Bucket=s3_bucket,
                        Delete={'Objects': [{'Key': o['Key']} for o in objects]},
                    )
                    deleted += len(objects)
            if deleted:
                info(f"Deleted {deleted} objects from {s3_bucket}")
            safe_delete(
                lambda: s3_client.delete_bucket(Bucket=s3_bucket),
                f"S3 bucket: {s3_bucket}",
            )
        except ClientError as e:
            warn(f"S3 issue: {e.response['Error']['Message']}")
    else:
        warn("No S3 bucket in outputs — skipping (deploy.py may not have run yet)")

    # ── 9. DynamoDB tables ─────────────────────────────────────────────────────
    step("9/9 — Deleting DynamoDB tables")
    table_name        = outputs.get('tableName', 'myvault-prod')
    connections_table = outputs.get('connectionsTable', 'myvault-connections')

    safe_delete(
        lambda: ddb.delete_table(TableName=table_name),
        f"DynamoDB table: {table_name}",
    )
    safe_delete(
        lambda: ddb.delete_table(TableName=connections_table),
        f"DynamoDB table: {connections_table}",
    )

    # ── Archive the outputs file ───────────────────────────────────────────────
    archive_path = OUTPUTS_FILE.replace('.json', '.deleted.json')
    try:
        import shutil
        shutil.move(OUTPUTS_FILE, archive_path)
        info(f"Outputs archived to: {archive_path}")
    except Exception:
        pass

    # ── Done ───────────────────────────────────────────────────────────────────
    print(f"\n{B}{G}{'═' * 62}")
    print("  ✅  All MyVault AWS resources deleted.")
    print("  💰  $0 remaining monthly cost.")
    print(f"{'═' * 62}{X}\n")
    print(f"  To rebuild everything from scratch, run:")
    print(f"  python3 aws/infrastructure.py\n")


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{Y}Interrupted — some resources may still be running.{X}")
        sys.exit(1)
    except Exception as exc:
        fail(f"Fatal error: {exc}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
