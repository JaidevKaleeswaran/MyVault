#!/usr/bin/env python3
"""
MyVault Frontend Deploy Script
================================
Builds the Vite app, pushes it to S3, and serves it globally via CloudFront.

What gets created:
  • S3 bucket         myvault-frontend-<account_id>   (private, no public access)
  • CloudFront OAC    Origin Access Control (secure S3 access — no public bucket)
  • CloudFront CDN    Global HTTPS distribution with SPA routing support
  • Bucket policy     Grants CloudFront (and only CloudFront) read access

Run anytime to redeploy (it syncs changed files and invalidates CloudFront cache):
  python3 aws/deploy.py

Prerequisites:
  • Node.js + npm installed (for `npm run build`)
  • AWS credentials in environment OR `aws configure`
  • aws/aws-outputs.json must exist (run infrastructure.py first)
"""

import sys
import subprocess
import json
import os
import time
import mimetypes

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
def step(n, total, title):
    print(f"\n{B}{C}{'─' * 62}\n  Step {n}/{total} — {title}\n{'─' * 62}{X}")

# ── Paths ──────────────────────────────────────────────────────────────────────
SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..'))
DIST_DIR     = os.path.join(PROJECT_ROOT, 'dist')
OUTPUTS_FILE = os.path.join(SCRIPT_DIR, 'aws-outputs.json')

# Managed CloudFront cache policy IDs (AWS provided — no need to create custom)
CACHE_POLICY_OPTIMIZED  = '658327ea-f89d-4fab-a63d-7e88639e58f6'  # CachingOptimized
CACHE_POLICY_DISABLED   = '4135ea2d-6df8-44a3-9df3-4b5a84be39ad'  # CachingDisabled

# Content-type overrides for files Python's mimetypes might get wrong
MIME_OVERRIDES = {
    '.js':   'application/javascript',
    '.mjs':  'application/javascript',
    '.jsx':  'application/javascript',
    '.ts':   'application/typescript',
    '.tsx':  'application/typescript',
    '.css':  'text/css',
    '.html': 'text/html',
    '.json': 'application/json',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.woff': 'font/woff',
    '.woff2':'font/woff2',
    '.ttf':  'font/ttf',
    '.webp': 'image/webp',
    '.mp3':  'audio/mpeg',
    '.mp4':  'video/mp4',
    '.txt':  'text/plain',
    '.xml':  'application/xml',
    '.map':  'application/json',
}

# ── Utilities ──────────────────────────────────────────────────────────────────

def load_outputs():
    if not os.path.exists(OUTPUTS_FILE):
        fail(f"aws-outputs.json not found at: {OUTPUTS_FILE}")
        fail("Run `python3 aws/infrastructure.py` first.")
        sys.exit(1)
    with open(OUTPUTS_FILE) as f:
        return json.load(f)

def save_outputs(outputs):
    with open(OUTPUTS_FILE, 'w') as f:
        json.dump(outputs, f, indent=2)

def get_content_type(file_path):
    ext = os.path.splitext(file_path)[1].lower()
    if ext in MIME_OVERRIDES:
        return MIME_OVERRIDES[ext]
    mime, _ = mimetypes.guess_type(file_path)
    return mime or 'application/octet-stream'

def get_cache_control(s3_key):
    """
    index.html — no-cache so browsers always get the freshest version.
    assets/    — immutable because Vite content-hashes all filenames.
    everything else — 1 day.
    """
    if s3_key == 'index.html' or s3_key.endswith('/index.html'):
        return 'no-cache, no-store, must-revalidate'
    if s3_key.startswith('assets/'):
        return 'public, max-age=31536000, immutable'
    return 'public, max-age=86400'

def collect_dist_files():
    """Walk dist/ and return list of (local_path, s3_key) tuples."""
    files = []
    for root, _, filenames in os.walk(DIST_DIR):
        for filename in filenames:
            local_path = os.path.join(root, filename)
            s3_key = os.path.relpath(local_path, DIST_DIR).replace(os.sep, '/')
            files.append((local_path, s3_key))
    return files

def wait_cf_deployed(cf, dist_id, timeout=900):
    """Poll until CloudFront distribution status is Deployed."""
    info("Waiting for CloudFront to deploy (this takes 3–8 minutes)...")
    deadline = time.time() + timeout
    dots = 0
    while time.time() < deadline:
        status = cf.get_distribution(Id=dist_id)['Distribution']['Status']
        if status == 'Deployed':
            print()
            return
        dots += 1
        print(f"\r{C}  ⏳  Status: {status} {'.' * (dots % 6)}{X}", end='', flush=True)
        time.sleep(15)
    raise TimeoutError(f"CloudFront distribution did not reach Deployed in {timeout}s")

# ══════════════════════════════════════════════════════════════════════════════
# STEPS
# ══════════════════════════════════════════════════════════════════════════════

def step1_build():
    step(1, 5, 'Build Vite production bundle')
    info(f"Running: npm run build  (in {PROJECT_ROOT})")
    result = subprocess.run(
        ['npm', 'run', 'build'],
        cwd=PROJECT_ROOT,
        capture_output=False,   # Let output stream live so user can see Vite progress
        text=True,
    )
    if result.returncode != 0:
        fail("npm run build failed — fix the errors above and re-run deploy.py")
        sys.exit(1)
    if not os.path.isdir(DIST_DIR):
        fail(f"dist/ directory not found after build: {DIST_DIR}")
        sys.exit(1)
    files = collect_dist_files()
    ok(f"Build complete — {len(files)} files in dist/")
    return files


def step2_s3_bucket(s3, account_id, region):
    step(2, 5, 'S3 bucket')
    bucket_name = f'myvault-frontend-{account_id}'
    info(f"Bucket: {bucket_name}  ({region})")

    # Create bucket
    try:
        if region == 'us-east-1':
            s3.create_bucket(Bucket=bucket_name)
        else:
            s3.create_bucket(
                Bucket=bucket_name,
                CreateBucketConfiguration={'LocationConstraint': region},
            )
        ok(f"Bucket created: {bucket_name}")
    except ClientError as e:
        code = e.response['Error']['Code']
        if code in ('BucketAlreadyOwnedByYou', 'BucketAlreadyExists'):
            warn(f"Bucket already exists — reusing: {bucket_name}")
        else:
            raise

    # Block ALL public access — CloudFront OAC handles access instead
    s3.put_public_access_block(
        Bucket=bucket_name,
        PublicAccessBlockConfiguration={
            'BlockPublicAcls':       True,
            'IgnorePublicAcls':      True,
            'BlockPublicPolicy':     True,
            'RestrictPublicBuckets': True,
        },
    )
    ok("Public access blocked (CloudFront OAC handles auth)")
    return bucket_name


def step3_cloudfront(cf, bucket_name, account_id, region):
    step(3, 5, 'CloudFront distribution + OAC')

    # ── Origin Access Control (modern replacement for OAI) ─────────────────────
    try:
        oac = cf.create_origin_access_control(
            OriginAccessControlConfig={
                'Name':                          'myvault-oac',
                'Description':                   'OAC for MyVault S3 frontend bucket',
                'SigningProtocol':               'sigv4',
                'SigningBehavior':               'always',
                'OriginAccessControlOriginType': 's3',
            }
        )
        oac_id = oac['OriginAccessControl']['Id']
        ok(f"OAC created: {oac_id}")
    except ClientError as e:
        if 'OriginAccessControlAlreadyExists' in str(e):
            # Find the existing one
            existing = cf.list_origin_access_controls()
            items = existing['OriginAccessControlList'].get('Items', [])
            oac_id = next((i['Id'] for i in items if i['Name'] == 'myvault-oac'), None)
            if not oac_id:
                raise RuntimeError("myvault-oac OAC exists but could not find its ID")
            warn(f"OAC already exists — reusing: {oac_id}")
        else:
            raise

    # ── CloudFront distribution ────────────────────────────────────────────────
    s3_origin_domain = f'{bucket_name}.s3.{region}.amazonaws.com'

    dist_config = {
        'CallerReference': f'myvault-{int(time.time())}',
        'Comment':         'MyVault — frontend SPA',
        'DefaultRootObject': 'index.html',
        'HttpVersion':     'http2and3',
        'PriceClass':      'PriceClass_100',   # US + Canada + Europe (cheapest)
        'Enabled':         True,
        'Origins': {
            'Quantity': 1,
            'Items': [{
                'Id':         'S3Origin',
                'DomainName': s3_origin_domain,
                'S3OriginConfig': {'OriginAccessIdentity': ''},  # Empty string = use OAC
                'OriginAccessControlId': oac_id,
            }],
        },
        'DefaultCacheBehavior': {
            'TargetOriginId':       'S3Origin',
            'ViewerProtocolPolicy': 'redirect-to-https',
            'CachePolicyId':        CACHE_POLICY_OPTIMIZED,
            'AllowedMethods': {
                'Quantity': 2,
                'Items':    ['GET', 'HEAD'],
                'CachedMethods': {'Quantity': 2, 'Items': ['GET', 'HEAD']},
            },
            'Compress': True,
        },
        # SPA routing: 403 and 404 from S3 → serve index.html with 200
        # This lets React Router handle the routes client-side
        'CustomErrorResponses': {
            'Quantity': 2,
            'Items': [
                {
                    'ErrorCode':        403,
                    'ResponsePagePath': '/index.html',
                    'ResponseCode':     '200',
                    'ErrorCachingMinTTL': 0,
                },
                {
                    'ErrorCode':        404,
                    'ResponsePagePath': '/index.html',
                    'ResponseCode':     '200',
                    'ErrorCachingMinTTL': 0,
                },
            ],
        },
    }

    dist = cf.create_distribution(DistributionConfig=dist_config)
    dist_id     = dist['Distribution']['Id']
    dist_domain = dist['Distribution']['DomainName']
    dist_arn    = dist['Distribution']['ARN']
    ok(f"CloudFront distribution created: {dist_id}")
    ok(f"Domain: https://{dist_domain}")

    return oac_id, dist_id, dist_domain, dist_arn


def step4_upload_files(s3, bucket_name, cf, dist_id, account_id, dist_arn, files):
    step(4, 5, f'Upload {len(files)} files to S3')

    # Update bucket policy to allow CloudFront (and only CloudFront) to read
    bucket_policy = json.dumps({
        "Version": "2012-10-17",
        "Statement": [{
            "Sid":       "AllowCloudFrontOAC",
            "Effect":    "Allow",
            "Principal": {"Service": "cloudfront.amazonaws.com"},
            "Action":    "s3:GetObject",
            "Resource":  f"arn:aws:s3:::{bucket_name}/*",
            "Condition": {
                "StringEquals": {
                    "AWS:SourceArn": dist_arn,
                }
            },
        }]
    })
    s3.put_bucket_policy(Bucket=bucket_name, Policy=bucket_policy)
    ok("Bucket policy updated — only CloudFront OAC can access S3")

    # Upload all files
    total = len(files)
    for idx, (local_path, s3_key) in enumerate(files, 1):
        content_type  = get_content_type(local_path)
        cache_control = get_cache_control(s3_key)
        with open(local_path, 'rb') as f:
            s3.put_object(
                Bucket=bucket_name,
                Key=s3_key,
                Body=f,
                ContentType=content_type,
                CacheControl=cache_control,
            )
        print(f"\r{C}  ➜   [{idx}/{total}] {s3_key}{X}", end='', flush=True)

    print()  # newline after progress
    ok(f"All {total} files uploaded to s3://{bucket_name}/")

    # Invalidate CloudFront cache so users get the new version immediately
    info("Creating CloudFront cache invalidation...")
    cf.create_invalidation(
        DistributionId=dist_id,
        InvalidationBatch={
            'Paths': {'Quantity': 1, 'Items': ['/*']},
            'CallerReference': str(int(time.time())),
        },
    )
    ok("Cache invalidation created — new files live within ~60s")


def step5_wait_and_finish(cf, dist_id, dist_domain, outputs, bucket_name, oac_id):
    step(5, 5, 'Waiting for CloudFront global deployment')
    wait_cf_deployed(cf, dist_id)
    ok("CloudFront is Deployed and globally available!")

    # Persist to outputs
    outputs['s3Bucket']       = bucket_name
    outputs['cfOacId']        = oac_id
    outputs['cfDistributionId'] = dist_id
    outputs['cfDomain']       = dist_domain
    outputs['cfUrl']          = f'https://{dist_domain}'
    save_outputs(outputs)

    print(f"\n{B}{G}{'═' * 62}")
    print("  🌍  MyVault is live on CloudFront!")
    print(f"{'═' * 62}{X}")
    print(f"\n  URL         : https://{dist_domain}")
    print(f"  S3 bucket   : {bucket_name}")
    print(f"  Distribution: {dist_id}")
    print(f"\n{C}  To redeploy after code changes:{X}")
    print(f"  python3 aws/deploy.py")
    print(f"\n{C}  To delete all AWS resources (including this CDN):{X}")
    print(f"  python3 aws/cleanup.py\n")


# ══════════════════════════════════════════════════════════════════════════════
# REDEPLOY (update existing distribution)
# ══════════════════════════════════════════════════════════════════════════════

def redeploy(s3, cf, outputs, files):
    """Sync changed files and invalidate cache — skips resource creation."""
    bucket_name = outputs['s3Bucket']
    dist_id     = outputs['cfDistributionId']
    dist_domain = outputs['cfDomain']
    dist_arn    = outputs.get('cfDistributionArn', '')

    # Re-derive dist ARN if missing from older outputs
    if not dist_arn:
        dist_arn = cf.get_distribution(Id=dist_id)['Distribution']['ARN']

    print(f"\n{B}{C}{'═' * 62}")
    print("  MyVault  ·  Redeploy to existing CloudFront")
    print(f"{'═' * 62}{X}")
    info(f"Bucket     : {bucket_name}")
    info(f"CloudFront : https://{dist_domain}")

    step(1, 2, f'Upload {len(files)} files to S3')
    total = len(files)
    for idx, (local_path, s3_key) in enumerate(files, 1):
        content_type  = get_content_type(local_path)
        cache_control = get_cache_control(s3_key)
        with open(local_path, 'rb') as f:
            s3.put_object(
                Bucket=bucket_name,
                Key=s3_key,
                Body=f,
                ContentType=content_type,
                CacheControl=cache_control,
            )
        print(f"\r{C}  ➜   [{idx}/{total}] {s3_key}{X}", end='', flush=True)
    print()
    ok(f"Uploaded {total} files to s3://{bucket_name}/")

    step(2, 2, 'Invalidate CloudFront cache')
    cf.create_invalidation(
        DistributionId=dist_id,
        InvalidationBatch={
            'Paths': {'Quantity': 1, 'Items': ['/*']},
            'CallerReference': str(int(time.time())),
        },
    )
    ok(f"Cache invalidated — new version live within ~60s")
    ok(f"URL: https://{dist_domain}")

# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    print(f"\n{B}{C}{'═' * 62}")
    print("  MyVault  ·  Deploy to S3 + CloudFront")
    print(f"{'═' * 62}{X}\n")

    outputs    = load_outputs()
    region     = outputs.get('region', 'us-west-1')
    account_id = outputs.get('accountId')

    session = boto3.Session(region_name=region)
    s3      = session.client('s3')
    cf      = session.client('cloudfront')   # CloudFront is a global service
    sts     = session.client('sts')

    # Verify credentials
    try:
        identity   = sts.get_caller_identity()
        account_id = account_id or identity['Account']
        ok(f"AWS account: {account_id}")
    except ClientError as e:
        fail(f"AWS credentials invalid: {e}")
        fail("Set AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY or run `aws configure`")
        sys.exit(1)

    # ── Step 1: Build ──────────────────────────────────────────────────────────
    files = step1_build()

    # ── Already deployed? Redeploy only ───────────────────────────────────────
    if outputs.get('cfDistributionId'):
        warn("Existing CloudFront distribution found — redeploying (skipping resource creation)")
        redeploy(s3, cf, outputs, files)
        return

    # ── First-time deploy ──────────────────────────────────────────────────────
    bucket_name = step2_s3_bucket(s3, account_id, region)
    oac_id, dist_id, dist_domain, dist_arn = step3_cloudfront(cf, bucket_name, account_id, region)
    outputs['cfDistributionArn'] = dist_arn  # Store for later bucket policy updates

    step4_upload_files(s3, bucket_name, cf, dist_id, account_id, dist_arn, files)
    step5_wait_and_finish(cf, dist_id, dist_domain, outputs, bucket_name, oac_id)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{Y}Interrupted — CloudFront may still be deploying in the background.{X}")
        sys.exit(1)
    except Exception as exc:
        fail(f"Fatal error: {exc}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
