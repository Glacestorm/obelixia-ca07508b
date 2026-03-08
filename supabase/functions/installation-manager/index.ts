import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  action: string;
  params?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    const { action, params } = await req.json() as RequestBody;
    console.log(`[installation-manager] Action: ${action}`);

    switch (action) {
      case 'register_instance': {
        const { installation_name, platform, deployment_type, modules, license_id, organization_id, environment, architecture, update_channel } = params as any;

        // Create installation
        const { data: inst, error: instErr } = await supabase
          .from('client_installations')
          .insert({
            installation_name,
            platform: platform || 'linux',
            deployment_type: deployment_type || 'on_premise',
            license_id: license_id || null,
            organization_id: organization_id || null,
            environment: environment || 'production',
            architecture: architecture || 'x86_64',
            update_channel: update_channel || 'stable',
            core_version: '1.0.0',
            status: 'installing',
          })
          .select()
          .single();

        if (instErr) throw instErr;

        // Add selected modules
        if (modules?.length > 0) {
          const moduleRows = modules.map((m: any) => ({
            installation_id: inst.id,
            module_key: m.key,
            module_name: m.name,
            module_version: m.version || '1.0.0',
            status: 'installing',
            dependencies: m.dependencies || [],
          }));

          const { error: modErr } = await supabase
            .from('installation_modules')
            .insert(moduleRows);

          if (modErr) throw modErr;
        }

        // Generate installation script
        const script = generateInstallScript(platform, deployment_type, modules || [], inst.installation_key);

        return json({ success: true, data: { installation: inst, script } });
      }

      case 'add_module': {
        const { installation_id, module_key, module_name, module_version, dependencies } = params as any;

        const { data, error } = await supabase
          .from('installation_modules')
          .insert({
            installation_id,
            module_key,
            module_name,
            module_version: module_version || '1.0.0',
            status: 'installing',
            dependencies: dependencies || [],
          })
          .select()
          .single();

        if (error) throw error;

        // Log update
        await supabase.from('installation_updates').insert({
          installation_id,
          module_key,
          update_type: 'module',
          from_version: '0.0.0',
          to_version: module_version || '1.0.0',
          status: 'completed',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        });

        return json({ success: true, data });
      }

      case 'remove_module': {
        const { installation_id, module_key } = params as any;

        const { error } = await supabase
          .from('installation_modules')
          .update({ status: 'uninstalling' })
          .eq('installation_id', installation_id)
          .eq('module_key', module_key);

        if (error) throw error;

        // Soft remove — mark as disabled
        await supabase
          .from('installation_modules')
          .update({ status: 'disabled' })
          .eq('installation_id', installation_id)
          .eq('module_key', module_key);

        return json({ success: true });
      }

      case 'check_updates': {
        const { installation_id } = params as any;

        const { data: modules } = await supabase
          .from('installation_modules')
          .select('*')
          .eq('installation_id', installation_id)
          .in('status', ['active', 'installing']);

        // Check module_versions for newer versions
        const updates: any[] = [];
        for (const mod of (modules || [])) {
          const { data: versions } = await supabase
            .from('module_versions')
            .select('*')
            .eq('module_key', mod.module_key)
            .gt('version', mod.module_version)
            .order('version', { ascending: false })
            .limit(1);

          if (versions?.length) {
            updates.push({
              module_key: mod.module_key,
              module_name: mod.module_name,
              current_version: mod.module_version,
              available_version: versions[0].version,
              changelog: versions[0].changelog,
            });
          }
        }

        // Update check timestamp
        await supabase
          .from('client_installations')
          .update({ last_update_check_at: new Date().toISOString() })
          .eq('id', installation_id);

        return json({ success: true, data: { updates, checked_at: new Date().toISOString() } });
      }

      case 'apply_update': {
        const { installation_id, module_key, to_version } = params as any;

        // Get current version
        const { data: mod } = await supabase
          .from('installation_modules')
          .select('module_version')
          .eq('installation_id', installation_id)
          .eq('module_key', module_key)
          .single();

        const fromVersion = mod?.module_version || '1.0.0';

        // Create update record
        const { data: update, error } = await supabase
          .from('installation_updates')
          .insert({
            installation_id,
            module_key,
            update_type: 'module',
            from_version: fromVersion,
            to_version,
            status: 'applying',
            started_at: new Date().toISOString(),
            rollback_version: fromVersion,
          })
          .select()
          .single();

        if (error) throw error;

        // Update module version
        await supabase
          .from('installation_modules')
          .update({
            module_version: to_version,
            status: 'active',
            last_updated_at: new Date().toISOString(),
          })
          .eq('installation_id', installation_id)
          .eq('module_key', module_key);

        // Mark update completed
        await supabase
          .from('installation_updates')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', update.id);

        return json({ success: true, data: update });
      }

      case 'get_installation_status': {
        const { installation_id } = params as any;

        const { data: installation } = await supabase
          .from('client_installations')
          .select('*')
          .eq('id', installation_id)
          .single();

        const { data: modules } = await supabase
          .from('installation_modules')
          .select('*')
          .eq('installation_id', installation_id);

        const { data: updates } = await supabase
          .from('installation_updates')
          .select('*')
          .eq('installation_id', installation_id)
          .order('created_at', { ascending: false })
          .limit(20);

        return json({ success: true, data: { installation, modules, updates } });
      }

      case 'generate_script': {
        const { platform, deployment_type, modules, installation_key } = params as any;
        const script = generateInstallScript(platform, deployment_type, modules || [], installation_key);
        return json({ success: true, data: { script } });
      }

      case 'heartbeat': {
        const { installation_id, health_data } = params as any;

        await supabase
          .from('client_installations')
          .update({ last_heartbeat_at: new Date().toISOString() })
          .eq('id', installation_id);

        // Update module health
        if (health_data?.modules) {
          for (const mod of health_data.modules) {
            await supabase
              .from('installation_modules')
              .update({
                health_status: mod.health_status,
                last_health_check_at: new Date().toISOString(),
              })
              .eq('installation_id', installation_id)
              .eq('module_key', mod.module_key);
          }
        }

        return json({ success: true });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('[installation-manager] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function json(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function generateInstallScript(
  platform: string,
  deploymentType: string,
  modules: any[],
  installationKey: string
): string {
  const moduleList = modules.map((m: any) => m.key || m).join(' ');

  switch (platform) {
    case 'docker':
      return generateDockerCompose(modules, installationKey);
    case 'windows':
      return generateWindowsScript(modules, installationKey);
    case 'macos':
    case 'linux':
      return generateUnixScript(platform, modules, installationKey);
    case 'proxmox':
      return generateProxmoxScript(modules, installationKey);
    case 'kubernetes':
      return generateK8sManifest(modules, installationKey);
    case 'aws':
    case 'azure':
    case 'gcp':
      return generateCloudScript(platform, modules, installationKey);
    default:
      return generateUnixScript('linux', modules, installationKey);
  }
}

function generateDockerCompose(modules: any[], key: string): string {
  const services = modules.map((m: any) => {
    const k = m.key || m;
    return `  obelixia-${k}:
    image: obelixia/erp-${k}:latest
    environment:
      - INSTALLATION_KEY=${key}
      - MODULE=${k}
      - DATABASE_URL=\${DATABASE_URL}
    depends_on:
      - postgres
    restart: unless-stopped
    networks:
      - obelixia-net`;
  }).join('\n\n');

  return `# ObelixIA ERP - Docker Compose
# Generated: ${new Date().toISOString()}
# Installation Key: ${key}

version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: obelixia_erp
      POSTGRES_USER: obelixia
      POSTGRES_PASSWORD: \${DB_PASSWORD:-changeme}
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped
    networks:
      - obelixia-net

  obelixia-core:
    image: obelixia/erp-core:latest
    environment:
      - INSTALLATION_KEY=${key}
      - DATABASE_URL=postgresql://obelixia:\${DB_PASSWORD:-changeme}@postgres:5432/obelixia_erp
    ports:
      - "8080:8080"
    depends_on:
      - postgres
    restart: unless-stopped
    networks:
      - obelixia-net

${services}

volumes:
  pgdata:

networks:
  obelixia-net:
    driver: bridge`;
}

function generateWindowsScript(modules: any[], key: string): string {
  const moduleList = modules.map((m: any) => m.key || m).join(',');
  return `# ObelixIA ERP - Windows Installer
# Generated: ${new Date().toISOString()}
# PowerShell 7+ required

$ErrorActionPreference = "Stop"
$InstallKey = "${key}"
$InstallDir = "$env:ProgramFiles\\ObelixIA\\ERP"
$Modules = "${moduleList}"

Write-Host "╔══════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   ObelixIA ERP - Enterprise Install  ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════╝" -ForegroundColor Cyan

# Check admin privileges
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Error "Please run as Administrator"
    exit 1
}

# Create installation directory
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

# Download and install core
Write-Host "[1/4] Downloading ObelixIA Core..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "https://releases.obelixia.com/erp/core/latest/windows-x64.zip" -OutFile "$env:TEMP\\obelixia-core.zip"
Expand-Archive -Path "$env:TEMP\\obelixia-core.zip" -DestinationPath $InstallDir -Force

# Install modules
Write-Host "[2/4] Installing modules: $Modules" -ForegroundColor Yellow
foreach ($mod in $Modules.Split(',')) {
    Write-Host "  → Installing $mod..." -ForegroundColor Gray
    Invoke-WebRequest -Uri "https://releases.obelixia.com/erp/modules/$mod/latest/windows-x64.zip" -OutFile "$env:TEMP\\obelixia-$mod.zip"
    Expand-Archive -Path "$env:TEMP\\obelixia-$mod.zip" -DestinationPath "$InstallDir\\modules\\$mod" -Force
}

# Configure
Write-Host "[3/4] Configuring..." -ForegroundColor Yellow
@"
installation_key = "$InstallKey"
modules = "$Modules"
auto_update = true
update_channel = "stable"
"@ | Set-Content "$InstallDir\\config.toml"

# Register Windows Service
Write-Host "[4/4] Registering service..." -ForegroundColor Yellow
New-Service -Name "ObelixIAERP" -BinaryPathName "$InstallDir\\obelixia-erp.exe" -DisplayName "ObelixIA ERP" -StartupType Automatic

Write-Host "✅ Installation complete!" -ForegroundColor Green
Write-Host "   Dashboard: http://localhost:8080" -ForegroundColor Cyan`;
}

function generateUnixScript(os: string, modules: any[], key: string): string {
  const moduleList = modules.map((m: any) => m.key || m).join(' ');
  const pkgManager = os === 'macos' ? 'brew' : 'apt-get';

  return `#!/bin/bash
# ObelixIA ERP - ${os === 'macos' ? 'macOS' : 'Linux'} Installer
# Generated: ${new Date().toISOString()}

set -euo pipefail

INSTALL_KEY="${key}"
INSTALL_DIR="/opt/obelixia/erp"
MODULES="${moduleList}"

echo "╔══════════════════════════════════════╗"
echo "║   ObelixIA ERP - Enterprise Install  ║"
echo "╚══════════════════════════════════════╝"

# Check root
if [ "$(id -u)" -ne 0 ]; then
  echo "❌ Please run with sudo"
  exit 1
fi

# Prerequisites
echo "[1/5] Installing prerequisites..."
${os === 'macos' ? 'brew install postgresql@16 curl jq' : 'apt-get update && apt-get install -y postgresql-16 curl jq'}

# Create directories
echo "[2/5] Creating installation directory..."
mkdir -p $INSTALL_DIR/{core,modules,data,logs,config}

# Download core
echo "[3/5] Downloading ObelixIA Core..."
curl -fsSL "https://releases.obelixia.com/erp/core/latest/${os}-amd64.tar.gz" | tar xz -C $INSTALL_DIR/core/

# Install modules
echo "[4/5] Installing modules..."
for mod in $MODULES; do
  echo "  → Installing $mod..."
  curl -fsSL "https://releases.obelixia.com/erp/modules/$mod/latest/${os}-amd64.tar.gz" | tar xz -C $INSTALL_DIR/modules/
done

# Configure
echo "[5/5] Configuring..."
cat > $INSTALL_DIR/config/obelixia.toml << EOF
[installation]
key = "$INSTALL_KEY"
modules = [$(echo $MODULES | sed 's/ /", "/g' | sed 's/^/"/' | sed 's/$/"/' )]
auto_update = true
update_channel = "stable"

[database]
host = "localhost"
port = 5432
name = "obelixia_erp"
EOF

# Create systemd service
cat > /etc/systemd/system/obelixia-erp.service << EOF
[Unit]
Description=ObelixIA ERP
After=postgresql.service

[Service]
Type=simple
ExecStart=$INSTALL_DIR/core/obelixia-erp serve
Restart=always
User=obelixia

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable obelixia-erp
systemctl start obelixia-erp

echo "✅ Installation complete!"
echo "   Dashboard: http://localhost:8080"`;
}

function generateProxmoxScript(modules: any[], key: string): string {
  const moduleList = modules.map((m: any) => m.key || m).join(' ');
  return `#!/bin/bash
# ObelixIA ERP - Proxmox VM Template
# Generated: ${new Date().toISOString()}

set -euo pipefail

VM_ID=\${1:-200}
VM_NAME="obelixia-erp"
INSTALL_KEY="${key}"
MODULES="${moduleList}"
STORAGE="local-lvm"
MEMORY=4096
CORES=2
DISK_SIZE="32G"

echo "╔══════════════════════════════════════════╗"
echo "║   ObelixIA ERP - Proxmox VM Deployment   ║"
echo "╚══════════════════════════════════════════╝"

# Download cloud image
echo "[1/5] Downloading Ubuntu 24.04 cloud image..."
wget -q "https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img" -O /tmp/ubuntu-noble.img

# Create VM
echo "[2/5] Creating VM $VM_ID..."
qm create $VM_ID --name $VM_NAME --memory $MEMORY --cores $CORES --net0 virtio,bridge=vmbr0 --ostype l26

# Import disk
echo "[3/5] Importing disk..."
qm importdisk $VM_ID /tmp/ubuntu-noble.img $STORAGE
qm set $VM_ID --scsihw virtio-scsi-pci --scsi0 $STORAGE:vm-$VM_ID-disk-0
qm resize $VM_ID scsi0 $DISK_SIZE
qm set $VM_ID --boot c --bootdisk scsi0

# Cloud-init config
echo "[4/5] Configuring cloud-init..."
qm set $VM_ID --ide2 $STORAGE:cloudinit
qm set $VM_ID --serial0 socket --vga serial0
qm set $VM_ID --ciuser obelixia --cipassword changeme
qm set $VM_ID --ipconfig0 ip=dhcp

# Start and install
echo "[5/5] Starting VM and installing ERP..."
qm start $VM_ID
sleep 30

# SSH into VM and install
qm guest exec $VM_ID -- bash -c "
  curl -fsSL https://releases.obelixia.com/erp/install.sh | \\
  INSTALL_KEY=$INSTALL_KEY MODULES='$MODULES' bash
"

echo "✅ Proxmox VM created and ERP installed!"
echo "   VM ID: $VM_ID"
echo "   Access: Check VM IP in Proxmox console"`;
}

function generateK8sManifest(modules: any[], key: string): string {
  const deployments = modules.map((m: any) => {
    const k = m.key || m;
    return `---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: obelixia-${k}
  namespace: obelixia
  labels:
    app: obelixia-erp
    module: ${k}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: obelixia-${k}
  template:
    metadata:
      labels:
        app: obelixia-${k}
    spec:
      containers:
      - name: ${k}
        image: obelixia/erp-${k}:latest
        env:
        - name: INSTALLATION_KEY
          valueFrom:
            secretKeyRef:
              name: obelixia-secrets
              key: installation-key
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"`;
  }).join('\n');

  return `# ObelixIA ERP - Kubernetes Manifests
# Generated: ${new Date().toISOString()}

apiVersion: v1
kind: Namespace
metadata:
  name: obelixia
---
apiVersion: v1
kind: Secret
metadata:
  name: obelixia-secrets
  namespace: obelixia
type: Opaque
stringData:
  installation-key: "${key}"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: obelixia-core
  namespace: obelixia
spec:
  replicas: 1
  selector:
    matchLabels:
      app: obelixia-core
  template:
    metadata:
      labels:
        app: obelixia-core
    spec:
      containers:
      - name: core
        image: obelixia/erp-core:latest
        env:
        - name: INSTALLATION_KEY
          valueFrom:
            secretKeyRef:
              name: obelixia-secrets
              key: installation-key
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: obelixia-core-svc
  namespace: obelixia
spec:
  selector:
    app: obelixia-core
  ports:
  - port: 80
    targetPort: 8080
  type: LoadBalancer
${deployments}`;
}

function generateCloudScript(provider: string, modules: any[], key: string): string {
  const moduleList = modules.map((m: any) => m.key || m).join(' ');

  if (provider === 'aws') {
    return `# ObelixIA ERP - AWS CloudFormation
# Generated: ${new Date().toISOString()}

AWSTemplateFormatVersion: '2010-09-09'
Description: ObelixIA ERP Deployment

Parameters:
  InstallationKey:
    Type: String
    Default: "${key}"
  InstanceType:
    Type: String
    Default: t3.medium

Resources:
  ERPInstance:
    Type: AWS::EC2::Instance
    Properties:
      InstanceType: !Ref InstanceType
      ImageId: ami-0c55b159cbfafe1f0
      UserData:
        Fn::Base64: !Sub |
          #!/bin/bash
          curl -fsSL https://releases.obelixia.com/erp/install.sh | \\
          INSTALL_KEY=\${InstallationKey} MODULES="${moduleList}" bash

Outputs:
  PublicIP:
    Value: !GetAtt ERPInstance.PublicIp`;
  }

  return `#!/bin/bash
# ObelixIA ERP - ${provider.toUpperCase()} Deployment
# Generated: ${new Date().toISOString()}
# Use your cloud provider's CLI to deploy
INSTALL_KEY="${key}"
MODULES="${moduleList}"
curl -fsSL https://releases.obelixia.com/erp/install.sh | \\
  INSTALL_KEY=$INSTALL_KEY MODULES="$MODULES" bash`;
}
