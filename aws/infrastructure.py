#!/usr/bin/env python3
"""
MyVault AWS Infrastructure Setup
=================================
Run this script once to provision everything needed in AWS.
Re-run at any time to update or repair resources.

What gets created (us-west-1):
  • IAM execution role          myvault-lambda-role
  • DynamoDB table              myvault-prod          (single-table design, Streams enabled)
  • DynamoDB table              myvault-connections   (WebSocket tracking, GSI on userId)
  • 18 × Lambda functions       Node.js 20.x, PAY_PER_REQUEST
  • HTTP API Gateway            myvault-http-api      (Firebase JWT authorizer, 15 routes)
  • WebSocket API Gateway       myvault-ws-api        ($connect + $disconnect)
  • DynamoDB Stream trigger     myvault-prod → myvault-ws-stream-push

Outputs saved to: aws/aws-outputs.json
Add the printed env vars to your .env after running.

Prerequisites:
  • Python 3.9+ (boto3 auto-installed if missing)
  • AWS credentials via environment variables OR `aws configure`:
      AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (and optionally AWS_SESSION_TOKEN)
  • .env file at project root with VITE_FIREBASE_PROJECT_ID and GEMINI_API_KEY
"""

import sys
import subprocess
import json
import os
import zipfile
import io
import time
import datetime

# ── Auto-install boto3 if missing ──────────────────────────────────────────────
try:
    import boto3
    from botocore.exceptions import ClientError
except ImportError:
    print("📦  boto3 not found — installing now...")
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'boto3', '--quiet'])
    import boto3
    from botocore.exceptions import ClientError

# ── Terminal colours ───────────────────────────────────────────────────────────
G = '\033[92m'   # green
Y = '\033[93m'   # yellow
R = '\033[91m'   # red
C = '\033[96m'   # cyan
B = '\033[1m'    # bold
X = '\033[0m'    # reset

def ok(msg):   print(f"{G}  ✅  {msg}{X}")
def info(msg): print(f"{C}  ➜   {msg}{X}")
def warn(msg): print(f"{Y}  ⚠️   {msg}{X}")
def fail(msg): print(f"{R}  ❌  {msg}{X}")
def step(n, total, title):
    print(f"\n{B}{C}{'─' * 62}")
    print(f"  Step {n}/{total} — {title}")
    print(f"{'─' * 62}{X}")

# ── Constants ──────────────────────────────────────────────────────────────────
REGION            = 'us-west-1'
TABLE_NAME        = 'myvault-prod'
CONNECTIONS_TABLE = 'myvault-connections'
ROLE_NAME         = 'myvault-lambda-role'
HTTP_API_NAME     = 'myvault-http-api'
WS_API_NAME       = 'myvault-ws-api'
RUNTIME           = 'nodejs20.x'
LAMBDA_TIMEOUT    = 30    # seconds
LAMBDA_MEMORY     = 256   # MB

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
LAMBDAS_DIR  = os.path.join(SCRIPT_DIR, 'lambdas')
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..'))
OUTPUTS_FILE = os.path.join(SCRIPT_DIR, 'aws-outputs.json')
ENV_FILE     = os.path.join(PROJECT_ROOT, '.env')

# ── Lambda function registry ───────────────────────────────────────────────────
# (lambda-name, js-file-basename, handler-string)
LAMBDA_FUNCTIONS = [
    ('myvault-get-user-data',      'getUserData',       'getUserData.handler'),
    ('myvault-upsert-transaction', 'upsertTransaction', 'upsertTransaction.handler'),
    ('myvault-update-transaction', 'updateTransaction', 'updateTransaction.handler'),
    ('myvault-delete-transaction', 'deleteTransaction', 'deleteTransaction.handler'),
    ('myvault-upsert-category',    'upsertCategory',    'upsertCategory.handler'),
    ('myvault-update-category',    'updateCategory',    'updateCategory.handler'),
    ('myvault-delete-category',    'deleteCategory',    'deleteCategory.handler'),
    ('myvault-upsert-income',      'upsertIncome',      'upsertIncome.handler'),
    ('myvault-update-income',      'updateIncome',      'updateIncome.handler'),
    ('myvault-delete-income',      'deleteIncome',      'deleteIncome.handler'),
    ('myvault-update-cycle',       'updateCycle',       'updateCycle.handler'),
    ('myvault-upsert-chat',        'upsertChatMessage', 'upsertChatMessage.handler'),
    ('myvault-upsert-voice-log',   'upsertVoiceLog',    'upsertVoiceLog.handler'),
    ('myvault-scan-receipt',       'scanReceipt',       'scanReceipt.handler'),
    ('myvault-transcribe-audio',   'transcribeAudio',   'transcribeAudio.handler'),
    ('myvault-ws-connect',         'wsConnect',         'wsConnect.handler'),
    ('myvault-ws-disconnect',      'wsDisconnect',      'wsDisconnect.handler'),
    ('myvault-ws-stream-push',     'wsStreamPush',      'wsStreamPush.handler'),
]

# ── HTTP API routes ────────────────────────────────────────────────────────────
# (HTTP-method, path, lambda-name)
HTTP_ROUTES = [
    ('GET',    '/user/data',         'myvault-get-user-data'),
    ('POST',   '/transactions',      'myvault-upsert-transaction'),
    ('PUT',    '/transactions/{id}', 'myvault-update-transaction'),
    ('DELETE', '/transactions/{id}', 'myvault-delete-transaction'),
    ('POST',   '/categories',        'myvault-upsert-category'),
    ('PUT',    '/categories/{id}',   'myvault-update-category'),
    ('DELETE', '/categories/{id}',   'myvault-delete-category'),
    ('POST',   '/income',            'myvault-upsert-income'),
    ('PUT',    '/income/{id}',       'myvault-update-income'),
    ('DELETE', '/income/{id}',       'myvault-delete-income'),
    ('PUT',    '/profile/cycle',     'myvault-update-cycle'),
    ('POST',   '/chat',              'myvault-upsert-chat'),
    ('POST',   '/voice-logs',        'myvault-upsert-voice-log'),
    ('POST',   '/receipts/scan',     'myvault-scan-receipt'),
    ('POST',   '/voice/transcribe',  'myvault-transcribe-audio'),
]

# ── Utilities ──────────────────────────────────────────────────────────────────

def read_env_file(path):
    """Parse a .env file → dict of key: value."""
    env = {}
    if not os.path.exists(path):
        return env
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, _, val = line.partition('=')
                env[key.strip()] = val.strip().strip('"').strip("'")
    return env


def zip_lambda(js_basename):
    """Read a Lambda JS file and return it as an in-memory zip archive."""
    path = os.path.join(LAMBDAS_DIR, f'{js_basename}.js')
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"Lambda source not found: {path}\n"
            f"Make sure all files exist in aws/lambdas/ before running."
        )
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.write(path, f'{js_basename}.js')
    return buf.getvalue()


def wait_table_active(ddb_client, table_name, timeout=180):
    info(f"Waiting for table '{table_name}' → ACTIVE...")
    deadline = time.time() + timeout
    while time.time() < deadline:
        status = ddb_client.describe_table(TableName=table_name)['Table']['TableStatus']
        if status == 'ACTIVE':
            return ddb_client.describe_table(TableName=table_name)['Table']
        time.sleep(4)
    raise TimeoutError(f"Table '{table_name}' did not reach ACTIVE in {timeout}s")


def wait_lambda_active(lam, func_name, timeout=90):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            cfg = lam.get_function_configuration(FunctionName=func_name)
            state  = cfg.get('State', '')
            update = cfg.get('LastUpdateStatus', 'Successful')
            if state == 'Active' and update in ('Successful', 'InProgress'):
                if update == 'Successful':
                    return
        except ClientError:
            pass
        time.sleep(3)
    raise TimeoutError(f"Lambda '{func_name}' did not become Active in {timeout}s")


def add_lambda_permission(lam, func_name, statement_id, source_arn):
    """Grant an AWS service permission to invoke a Lambda (idempotent)."""
    try:
        lam.add_permission(
            FunctionName=func_name,
            StatementId=statement_id,
            Action='lambda:InvokeFunction',
            Principal='apigateway.amazonaws.com',
            SourceArn=source_arn,
        )
    except ClientError as e:
        if e.response['Error']['Code'] != 'ResourceConflictException':
            raise  # Re-raise unexpected errors

# ══════════════════════════════════════════════════════════════════════════════
# STEP FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════

def step1_load_config():
    step(1, 8, 'Load configuration')
    env = read_env_file(ENV_FILE)

    firebase_project_id = env.get('VITE_FIREBASE_PROJECT_ID', '').strip()
    if not firebase_project_id:
        firebase_project_id = input(
            f"  {Y}VITE_FIREBASE_PROJECT_ID not in .env — enter Firebase project ID: {X}"
        ).strip()
    if not firebase_project_id:
        raise ValueError("Firebase project ID is required.")

    gemini_api_key = env.get('GEMINI_API_KEY', '').strip()
    if not gemini_api_key:
        gemini_api_key = input(
            f"  {Y}GEMINI_API_KEY not in .env — enter Gemini API key: {X}"
        ).strip()
    if not gemini_api_key:
        raise ValueError("Gemini API key is required.")

    ok(f"Firebase project ID : {firebase_project_id}")
    ok(f"Gemini API key      : {gemini_api_key[:10]}...")
    return firebase_project_id, gemini_api_key


def step2_iam_role(iam, account_id):
    step(2, 8, 'IAM execution role')

    trust = {
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Principal": {"Service": "lambda.amazonaws.com"},
            "Action": "sts:AssumeRole",
        }]
    }

    try:
        role_arn = iam.create_role(
            RoleName=ROLE_NAME,
            AssumeRolePolicyDocument=json.dumps(trust),
            Description='MyVault Lambda execution role',
        )['Role']['Arn']
        ok(f"Role created: {role_arn}")
    except ClientError as e:
        if e.response['Error']['Code'] == 'EntityAlreadyExists':
            role_arn = iam.get_role(RoleName=ROLE_NAME)['Role']['Arn']
            warn(f"Role already exists — reusing: {role_arn}")
        else:
            raise

    policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "DynamoDB",
                "Effect": "Allow",
                "Action": [
                    "dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem",
                    "dynamodb:DeleteItem", "dynamodb:Query", "dynamodb:Scan",
                    "dynamodb:DescribeStream", "dynamodb:GetRecords",
                    "dynamodb:GetShardIterator", "dynamodb:ListStreams",
                ],
                "Resource": [
                    f"arn:aws:dynamodb:{REGION}:{account_id}:table/{TABLE_NAME}",
                    f"arn:aws:dynamodb:{REGION}:{account_id}:table/{TABLE_NAME}/*",
                    f"arn:aws:dynamodb:{REGION}:{account_id}:table/{CONNECTIONS_TABLE}",
                    f"arn:aws:dynamodb:{REGION}:{account_id}:table/{CONNECTIONS_TABLE}/*",
                ],
            },
            {
                "Sid": "WebSocketManagement",
                "Effect": "Allow",
                "Action": ["execute-api:ManageConnections"],
                "Resource": f"arn:aws:execute-api:{REGION}:{account_id}:*/@connections/*",
            },
            {
                "Sid": "Logs",
                "Effect": "Allow",
                "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
                "Resource": "arn:aws:logs:*:*:*",
            },
        ]
    }

    iam.put_role_policy(
        RoleName=ROLE_NAME,
        PolicyName='myvault-lambda-policy',
        PolicyDocument=json.dumps(policy),
    )
    ok("Inline policy attached")

    # IAM changes take a few seconds to propagate globally
    info("Pausing 15s for IAM propagation...")
    time.sleep(15)
    return role_arn


def step3_dynamodb(ddb_client):
    step(3, 8, 'DynamoDB tables')

    # ── Main data table ────────────────────────────────────────────────────────
    try:
        ddb_client.create_table(
            TableName=TABLE_NAME,
            KeySchema=[
                {'AttributeName': 'PK', 'KeyType': 'HASH'},
                {'AttributeName': 'SK', 'KeyType': 'RANGE'},
            ],
            AttributeDefinitions=[
                {'AttributeName': 'PK', 'AttributeType': 'S'},
                {'AttributeName': 'SK', 'AttributeType': 'S'},
            ],
            BillingMode='PAY_PER_REQUEST',
            StreamSpecification={
                'StreamEnabled': True,
                'StreamViewType': 'NEW_AND_OLD_IMAGES',
            },
        )
        ok(f"Created table: {TABLE_NAME}")
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceInUseException':
            warn(f"Table '{TABLE_NAME}' already exists — skipping creation")
        else:
            raise

    table_info = wait_table_active(ddb_client, TABLE_NAME)
    ok(f"'{TABLE_NAME}' is ACTIVE")

    # Enable TTL (voice logs auto-expire after 3 days via the 'ttl' attribute)
    try:
        ddb_client.update_time_to_live(
            TableName=TABLE_NAME,
            TimeToLiveSpecification={'Enabled': True, 'AttributeName': 'ttl'},
        )
        ok("TTL enabled on myvault-prod (attribute: 'ttl', voice logs expire in 3 days)")
    except ClientError as e:
        warn(f"TTL: {e.response['Error']['Message']}")

    stream_arn = table_info.get('LatestStreamArn') or \
                 ddb_client.describe_table(TableName=TABLE_NAME)['Table'].get('LatestStreamArn')
    ok(f"Stream ARN: {stream_arn}")

    # ── WebSocket connections tracking table ───────────────────────────────────
    try:
        ddb_client.create_table(
            TableName=CONNECTIONS_TABLE,
            KeySchema=[
                {'AttributeName': 'connectionId', 'KeyType': 'HASH'},
            ],
            AttributeDefinitions=[
                {'AttributeName': 'connectionId', 'AttributeType': 'S'},
                {'AttributeName': 'userId',       'AttributeType': 'S'},
            ],
            GlobalSecondaryIndexes=[{
                'IndexName': 'userId-index',
                'KeySchema': [{'AttributeName': 'userId', 'KeyType': 'HASH'}],
                'Projection': {'ProjectionType': 'ALL'},
            }],
            BillingMode='PAY_PER_REQUEST',
        )
        ok(f"Created table: {CONNECTIONS_TABLE}")
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceInUseException':
            warn(f"Table '{CONNECTIONS_TABLE}' already exists — skipping creation")
        else:
            raise

    wait_table_active(ddb_client, CONNECTIONS_TABLE)
    ok(f"'{CONNECTIONS_TABLE}' is ACTIVE")

    # TTL on connections table (24h auto-expiry for stale browser connections)
    try:
        ddb_client.update_time_to_live(
            TableName=CONNECTIONS_TABLE,
            TimeToLiveSpecification={'Enabled': True, 'AttributeName': 'ttl'},
        )
        ok("TTL enabled on myvault-connections (24h expiry for stale connections)")
    except ClientError as e:
        warn(f"TTL: {e.response['Error']['Message']}")

    return stream_arn


def step4_lambdas(lam, role_arn, gemini_api_key):
    step(4, 8, f'Lambda functions ({len(LAMBDA_FUNCTIONS)} total)')

    # Base environment variables shared by all Lambdas
    # WS_ENDPOINT added to wsStreamPush separately in step 7
    base_env = {
        'TABLE_NAME':        TABLE_NAME,
        'CONNECTIONS_TABLE': CONNECTIONS_TABLE,
        'GEMINI_API_KEY':    gemini_api_key,
    }

    lambda_arns = {}
    total = len(LAMBDA_FUNCTIONS)

    for idx, (func_name, js_file, handler) in enumerate(LAMBDA_FUNCTIONS, 1):
        info(f"[{idx}/{total}] {func_name}")
        zip_bytes = zip_lambda(js_file)

        try:
            resp = lam.create_function(
                FunctionName=func_name,
                Runtime=RUNTIME,
                Role=role_arn,
                Handler=handler,
                Code={'ZipFile': zip_bytes},
                Environment={'Variables': base_env},
                Timeout=LAMBDA_TIMEOUT,
                MemorySize=LAMBDA_MEMORY,
                Description=f'MyVault — {js_file}',
            )
            lambda_arns[func_name] = resp['FunctionArn']
            ok(f"  Created {func_name}")

        except ClientError as e:
            if e.response['Error']['Code'] == 'ResourceConflictException':
                warn(f"  {func_name} exists — updating code + config")
                lam.update_function_code(FunctionName=func_name, ZipFile=zip_bytes)
                wait_lambda_active(lam, func_name)
                lam.update_function_configuration(
                    FunctionName=func_name,
                    Environment={'Variables': base_env},
                    Timeout=LAMBDA_TIMEOUT,
                    MemorySize=LAMBDA_MEMORY,
                )
                wait_lambda_active(lam, func_name)
                arn = lam.get_function_configuration(FunctionName=func_name)['FunctionArn']
                lambda_arns[func_name] = arn
                ok(f"  Updated {func_name}")
            else:
                raise

    return lambda_arns


def step5_http_api(apiv2, lam, lambda_arns, account_id, firebase_project_id):
    step(5, 8, 'HTTP API Gateway')

    # ── Create API with CORS ───────────────────────────────────────────────────
    http_api = apiv2.create_api(
        Name=HTTP_API_NAME,
        ProtocolType='HTTP',
        CorsConfiguration={
            'AllowOrigins': ['*'],
            'AllowMethods': ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            'AllowHeaders': ['Authorization', 'Content-Type'],
            'MaxAge': 300,
        },
    )
    http_api_id = http_api['ApiId']
    ok(f"HTTP API created: {http_api_id}")

    # ── Firebase JWT Authorizer ────────────────────────────────────────────────
    # API Gateway validates the Firebase token signature automatically using
    # Google's JWKS endpoint. No Lambda authorizer needed.
    authorizer = apiv2.create_authorizer(
        ApiId=http_api_id,
        AuthorizerType='JWT',
        Name='firebase-jwt-authorizer',
        IdentitySource=['$request.header.Authorization'],
        JwtConfiguration={
            'Audience': [firebase_project_id],
            'Issuer':   f'https://securetoken.google.com/{firebase_project_id}',
        },
    )
    authorizer_id = authorizer['AuthorizerId']
    ok(f"JWT authorizer created: {authorizer_id}")
    ok(f"  Issuer  : https://securetoken.google.com/{firebase_project_id}")
    ok(f"  Audience: {firebase_project_id}")

    # ── Routes + integrations ──────────────────────────────────────────────────
    total = len(HTTP_ROUTES)
    for idx, (method, path, func_name) in enumerate(HTTP_ROUTES, 1):
        func_arn = lambda_arns[func_name]

        integration = apiv2.create_integration(
            ApiId=http_api_id,
            IntegrationType='AWS_PROXY',
            IntegrationUri=func_arn,
            IntegrationMethod='POST',
            PayloadFormatVersion='2.0',
        )

        apiv2.create_route(
            ApiId=http_api_id,
            RouteKey=f'{method} {path}',
            AuthorizationType='JWT',
            AuthorizerId=authorizer_id,
            Target=f'integrations/{integration["IntegrationId"]}',
        )

        # Allow HTTP API Gateway to invoke this Lambda
        add_lambda_permission(
            lam, func_name,
            statement_id=f'http-apigw-{func_name}',
            source_arn=f'arn:aws:execute-api:{REGION}:{account_id}:{http_api_id}/*/*',
        )

        info(f"  [{idx}/{total}] {method:6s} {path}  →  {func_name}")

    # ── Deploy to $default stage (auto-deploy on every route change) ───────────
    apiv2.create_stage(
        ApiId=http_api_id,
        StageName='$default',
        AutoDeploy=True,
    )

    http_endpoint = f'https://{http_api_id}.execute-api.{REGION}.amazonaws.com'
    ok(f"HTTP API endpoint: {http_endpoint}")
    return http_api_id, http_endpoint, authorizer_id


def step6_websocket_api(apiv2, lam, lambda_arns, account_id):
    step(6, 8, 'WebSocket API Gateway')

    ws_api = apiv2.create_api(
        Name=WS_API_NAME,
        ProtocolType='WEBSOCKET',
        RouteSelectionExpression='$request.body.action',
    )
    ws_api_id = ws_api['ApiId']
    ok(f"WebSocket API created: {ws_api_id}")

    for route_key, func_name in [
        ('$connect',    'myvault-ws-connect'),
        ('$disconnect', 'myvault-ws-disconnect'),
    ]:
        func_arn = lambda_arns[func_name]

        # WebSocket integrations use the full Lambda ARN URI
        integration = apiv2.create_integration(
            ApiId=ws_api_id,
            IntegrationType='AWS_PROXY',
            IntegrationUri=(
                f'arn:aws:apigateway:{REGION}:lambda:path/2015-03-31'
                f'/functions/{func_arn}/invocations'
            ),
            IntegrationMethod='POST',
        )

        apiv2.create_route(
            ApiId=ws_api_id,
            RouteKey=route_key,
            AuthorizationType='NONE',  # wsConnect validates the token internally
            Target=f'integrations/{integration["IntegrationId"]}',
        )

        add_lambda_permission(
            lam, func_name,
            statement_id=f'ws-apigw-{func_name}',
            source_arn=f'arn:aws:execute-api:{REGION}:{account_id}:{ws_api_id}/*/*',
        )

        info(f"  WebSocket route: {route_key} → {func_name}")

    # Deploy to 'prod' stage
    deployment = apiv2.create_deployment(ApiId=ws_api_id)
    apiv2.create_stage(
        ApiId=ws_api_id,
        StageName='prod',
        DeploymentId=deployment['DeploymentId'],
    )

    ws_endpoint            = f'wss://{ws_api_id}.execute-api.{REGION}.amazonaws.com/prod'
    ws_management_endpoint = f'https://{ws_api_id}.execute-api.{REGION}.amazonaws.com/prod'
    ok(f"WebSocket endpoint: {ws_endpoint}")
    return ws_api_id, ws_endpoint, ws_management_endpoint


def step7_update_stream_push(lam, ws_management_endpoint, gemini_api_key):
    step(7, 8, 'Update wsStreamPush with WebSocket management endpoint')

    wait_lambda_active(lam, 'myvault-ws-stream-push')
    lam.update_function_configuration(
        FunctionName='myvault-ws-stream-push',
        Environment={
            'Variables': {
                'TABLE_NAME':        TABLE_NAME,
                'CONNECTIONS_TABLE': CONNECTIONS_TABLE,
                'GEMINI_API_KEY':    gemini_api_key,
                'WS_ENDPOINT':       ws_management_endpoint,
            }
        },
    )
    wait_lambda_active(lam, 'myvault-ws-stream-push')
    ok(f"WS_ENDPOINT set to: {ws_management_endpoint}")


def step8_stream_trigger(lam, stream_arn):
    step(8, 8, 'DynamoDB Stream trigger → wsStreamPush')

    try:
        resp = lam.create_event_source_mapping(
            EventSourceArn=stream_arn,
            FunctionName='myvault-ws-stream-push',
            StartingPosition='LATEST',
            BatchSize=25,
            BisectBatchOnFunctionError=True,
        )
        trigger_uuid = resp['UUID']
        ok(f"Stream trigger created: {trigger_uuid}")
        return trigger_uuid
    except ClientError as e:
        msg = e.response['Error']['Message']
        if 'already exists' in msg.lower() or 'ResourceConflictException' == e.response['Error']['Code']:
            warn("Stream trigger already exists — fetching existing UUID")
            mappings = lam.list_event_source_mappings(
                EventSourceArn=stream_arn,
                FunctionName='myvault-ws-stream-push',
            ).get('EventSourceMappings', [])
            trigger_uuid = mappings[0]['UUID'] if mappings else 'unknown'
            ok(f"Existing trigger UUID: {trigger_uuid}")
            return trigger_uuid
        raise

# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    print(f"\n{B}{C}{'═' * 62}")
    print("  MyVault  ·  AWS Infrastructure Setup")
    print(f"  Region  : {REGION}")
    print(f"  Tables  : {TABLE_NAME}, {CONNECTIONS_TABLE}")
    print(f"  Lambdas : {len(LAMBDA_FUNCTIONS)}")
    print(f"{'═' * 62}{X}\n")

    # ── Config ─────────────────────────────────────────────────────────────────
    firebase_project_id, gemini_api_key = step1_load_config()

    # ── AWS clients ────────────────────────────────────────────────────────────
    session = boto3.Session(region_name=REGION)
    iam      = session.client('iam')
    ddb      = session.client('dynamodb')
    lam      = session.client('lambda')
    apiv2    = session.client('apigatewayv2')
    sts      = session.client('sts')

    # Verify credentials
    try:
        identity   = sts.get_caller_identity()
        account_id = identity['Account']
        ok(f"AWS account: {account_id}  (user: {identity.get('Arn', 'unknown')})")
    except ClientError as e:
        fail(f"AWS credentials invalid or missing: {e}")
        fail("Set AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY or run `aws configure`")
        sys.exit(1)

    # ── Execute steps ──────────────────────────────────────────────────────────
    role_arn   = step2_iam_role(iam, account_id)
    stream_arn = step3_dynamodb(ddb)
    lambda_arns = step4_lambdas(lam, role_arn, gemini_api_key)

    http_api_id, http_endpoint, authorizer_id = step5_http_api(
        apiv2, lam, lambda_arns, account_id, firebase_project_id
    )

    ws_api_id, ws_endpoint, ws_management_endpoint = step6_websocket_api(
        apiv2, lam, lambda_arns, account_id
    )

    step7_update_stream_push(lam, ws_management_endpoint, gemini_api_key)
    trigger_uuid = step8_stream_trigger(lam, stream_arn)

    # ── Save outputs ───────────────────────────────────────────────────────────
    outputs = {
        'region':              REGION,
        'accountId':           account_id,
        'firebaseProjectId':   firebase_project_id,
        'tableName':           TABLE_NAME,
        'connectionsTable':    CONNECTIONS_TABLE,
        'roleArn':             role_arn,
        'httpApiId':           http_api_id,
        'httpEndpoint':        http_endpoint,
        'wsApiId':             ws_api_id,
        'wsEndpoint':          ws_endpoint,
        'wsManagementEndpoint': ws_management_endpoint,
        'authorizerId':        authorizer_id,
        'streamArn':           stream_arn,
        'streamTriggerUuid':   trigger_uuid,
        'lambdaArns':          lambda_arns,
        'createdAt':           datetime.datetime.utcnow().isoformat() + 'Z',
    }

    with open(OUTPUTS_FILE, 'w') as f:
        json.dump(outputs, f, indent=2)

    # ── Final summary ──────────────────────────────────────────────────────────
    print(f"\n{B}{G}{'═' * 62}")
    print("  🎉  All resources created successfully!")
    print(f"{'═' * 62}{X}")
    print(f"\n  HTTP API endpoint  : {http_endpoint}")
    print(f"  WebSocket endpoint : {ws_endpoint}")
    print(f"  Outputs file       : {OUTPUTS_FILE}")
    print(f"\n{Y}  Add these to your .env file:{X}")
    print(f"\n  VITE_AWS_HTTP_ENDPOINT={http_endpoint}")
    print(f"  VITE_AWS_WS_ENDPOINT={ws_endpoint}\n")
    print(f"{C}  To delete everything and stop all AWS charges, run:{X}")
    print(f"  python3 aws/cleanup.py\n")


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{Y}Interrupted by user — no cleanup performed.{X}")
        sys.exit(1)
    except Exception as exc:
        fail(f"Fatal error: {exc}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
