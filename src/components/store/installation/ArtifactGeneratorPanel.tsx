import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Download, FileCode, Container, Cloud, Monitor, Copy, Check,
  Server, HardDrive, Boxes, RefreshCw
} from 'lucide-react';
import { type Installation, type PlatformType, PLATFORMS, ERP_MODULES, useInstallationManager } from '@/hooks/admin/useInstallationManager';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ArtifactGeneratorPanelProps {
  installation: Installation;
  modules: { module_key: string; module_name: string }[];
}

type ArtifactType = 'docker-compose' | 'dockerfile' | 'helm-chart' | 'k8s-manifest' | 'powershell' | 'bash' | 'proxmox' | 'cloudformation' | 'terraform' | 'arm-template';

interface ArtifactDefinition {
  key: ArtifactType;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  platforms: PlatformType[];
  fileExtension: string;
}

const ARTIFACTS: ArtifactDefinition[] = [
  { key: 'docker-compose', name: 'Docker Compose', description: 'Multi-container con servicios orquestados', icon: <Container className="h-4 w-4" />, category: 'containers', platforms: ['docker'], fileExtension: 'yml' },
  { key: 'dockerfile', name: 'Dockerfile', description: 'Imagen custom con módulos seleccionados', icon: <Container className="h-4 w-4" />, category: 'containers', platforms: ['docker'], fileExtension: 'dockerfile' },
  { key: 'helm-chart', name: 'Helm Chart', description: 'Values.yaml para despliegue en K8s', icon: <Boxes className="h-4 w-4" />, category: 'containers', platforms: ['kubernetes'], fileExtension: 'yaml' },
  { key: 'k8s-manifest', name: 'K8s Manifests', description: 'Deployments, Services, ConfigMaps', icon: <Boxes className="h-4 w-4" />, category: 'containers', platforms: ['kubernetes'], fileExtension: 'yaml' },
  { key: 'powershell', name: 'PowerShell Script', description: 'Instalador Windows con servicio', icon: <Monitor className="h-4 w-4" />, category: 'native', platforms: ['windows'], fileExtension: 'ps1' },
  { key: 'bash', name: 'Bash Script', description: 'Instalador Linux/macOS con systemd', icon: <Monitor className="h-4 w-4" />, category: 'native', platforms: ['linux', 'macos', 'bare_metal'], fileExtension: 'sh' },
  { key: 'proxmox', name: 'Proxmox Script', description: 'Creación y config de VM en Proxmox VE', icon: <HardDrive className="h-4 w-4" />, category: 'virtualization', platforms: ['proxmox'], fileExtension: 'sh' },
  { key: 'cloudformation', name: 'CloudFormation', description: 'AWS stack con EC2 + RDS', icon: <Cloud className="h-4 w-4" />, category: 'cloud', platforms: ['aws'], fileExtension: 'yaml' },
  { key: 'terraform', name: 'Terraform', description: 'Infra as Code multi-cloud', icon: <Cloud className="h-4 w-4" />, category: 'cloud', platforms: ['aws', 'azure', 'gcp'], fileExtension: 'tf' },
  { key: 'arm-template', name: 'ARM Template', description: 'Azure Resource Manager template', icon: <Cloud className="h-4 w-4" />, category: 'cloud', platforms: ['azure'], fileExtension: 'json' },
];

export function ArtifactGeneratorPanel({ installation, modules }: ArtifactGeneratorPanelProps) {
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactType | null>(null);
  const [generatedArtifact, setGeneratedArtifact] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [targetPlatform, setTargetPlatform] = useState<PlatformType>(installation.platform as PlatformType);

  const { generateScript } = useInstallationManager();

  const relevantArtifacts = ARTIFACTS.filter(a => a.platforms.includes(targetPlatform));

  const handleGenerate = useCallback(async (artifactType: ArtifactType) => {
    setIsGenerating(true);
    setSelectedArtifact(artifactType);

    try {
      const artifact = generateArtifactContent(artifactType, installation, modules);
      setGeneratedArtifact(artifact);
    } catch (err) {
      console.error('Error generating artifact:', err);
      toast.error('Error al generar artefacto');
    } finally {
      setIsGenerating(false);
    }
  }, [installation, modules]);

  const handleCopy = useCallback(() => {
    if (generatedArtifact) {
      navigator.clipboard.writeText(generatedArtifact);
      setCopied(true);
      toast.success('Copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generatedArtifact]);

  const handleDownload = useCallback(() => {
    if (!generatedArtifact || !selectedArtifact) return;
    const artifact = ARTIFACTS.find(a => a.key === selectedArtifact);
    const blob = new Blob([generatedArtifact], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `obelixia-${selectedArtifact}.${artifact?.fileExtension || 'txt'}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Archivo descargado');
  }, [generatedArtifact, selectedArtifact]);

  const categories = [
    { key: 'containers', label: 'Contenedores', icon: <Container className="h-3 w-3" /> },
    { key: 'native', label: 'Nativo', icon: <Monitor className="h-3 w-3" /> },
    { key: 'virtualization', label: 'Virtualización', icon: <HardDrive className="h-3 w-3" /> },
    { key: 'cloud', label: 'Cloud', icon: <Cloud className="h-3 w-3" /> },
  ];

  return (
    <Card className="bg-slate-900/80 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
              <FileCode className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-white text-lg">Generador de Artefactos</CardTitle>
              <CardDescription>Scripts y configs para {installation.installation_name}</CardDescription>
            </div>
          </div>
          <Select value={targetPlatform} onValueChange={v => { setTargetPlatform(v as PlatformType); setGeneratedArtifact(null); }}>
            <SelectTrigger className="w-[160px] bg-slate-800 border-slate-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLATFORMS.map(p => (
                <SelectItem key={p.key} value={p.key}>{p.icon} {p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {!generatedArtifact ? (
          <div className="space-y-4">
            {categories.map(cat => {
              const artifacts = relevantArtifacts.filter(a => a.category === cat.key);
              if (!artifacts.length) return null;
              return (
                <div key={cat.key}>
                  <h3 className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1">
                    {cat.icon} {cat.label}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {artifacts.map(artifact => (
                      <button
                        key={artifact.key}
                        onClick={() => handleGenerate(artifact.key)}
                        disabled={isGenerating}
                        className="p-3 rounded-lg border border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600 transition-all text-left"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {artifact.icon}
                          <span className="text-sm font-medium text-white">{artifact.name}</span>
                          <Badge variant="outline" className="text-[10px]">.{artifact.fileExtension}</Badge>
                        </div>
                        <p className="text-xs text-slate-400">{artifact.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {relevantArtifacts.length === 0 && (
              <div className="text-center py-8">
                <Server className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                <p className="text-sm text-slate-500">Selecciona una plataforma con artefactos disponibles</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-violet-500/20 text-violet-400">
                  {ARTIFACTS.find(a => a.key === selectedArtifact)?.name}
                </Badge>
                <span className="text-xs text-slate-400">
                  {modules.length} módulos incluidos
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="gap-1" onClick={handleCopy}>
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={handleDownload}>
                  <Download className="h-3 w-3" /> Descargar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setGeneratedArtifact(null); setSelectedArtifact(null); }}>
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <ScrollArea className="h-[400px]">
              <pre className="bg-slate-950 rounded-lg p-4 text-sm text-green-400 font-mono whitespace-pre overflow-x-auto">
                {generatedArtifact}
              </pre>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// === ARTIFACT GENERATION FUNCTIONS ===

function generateArtifactContent(
  artifactType: ArtifactType,
  installation: Installation,
  modules: { module_key: string; module_name: string }[]
): string {
  const key = installation.installation_key;
  const moduleKeys = modules.map(m => m.module_key);
  const ts = new Date().toISOString();

  switch (artifactType) {
    case 'docker-compose':
      return generateDockerCompose(key, modules, ts);
    case 'dockerfile':
      return generateDockerfile(key, moduleKeys, ts);
    case 'helm-chart':
      return generateHelmValues(key, modules, ts);
    case 'k8s-manifest':
      return generateK8sManifests(key, modules, ts);
    case 'powershell':
      return generatePowerShell(key, moduleKeys, ts);
    case 'bash':
      return generateBash(key, moduleKeys, ts);
    case 'proxmox':
      return generateProxmox(key, moduleKeys, ts);
    case 'cloudformation':
      return generateCloudFormation(key, moduleKeys, ts);
    case 'terraform':
      return generateTerraform(key, moduleKeys, ts);
    case 'arm-template':
      return generateARMTemplate(key, moduleKeys, ts);
    default:
      return '# Artifact type not supported';
  }
}

function generateDockerCompose(key: string, modules: { module_key: string; module_name: string }[], ts: string): string {
  const services = modules.filter(m => m.module_key !== 'core').map(m => `
  obelixia-${m.module_key}:
    image: obelixia/erp-${m.module_key}:\${ERP_VERSION:-latest}
    environment:
      - INSTALLATION_KEY=${key}
      - MODULE=${m.module_key}
      - DATABASE_URL=postgresql://obelixia:\${DB_PASSWORD:-changeme}@postgres:5432/obelixia_erp
      - REDIS_URL=redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - obelixia-net
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'`).join('\n');

  return `# ObelixIA ERP - Docker Compose
# Generated: ${ts}
# Installation: ${key}
# Modules: ${modules.map(m => m.module_key).join(', ')}

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
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U obelixia"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - obelixia-net

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    restart: unless-stopped
    networks:
      - obelixia-net

  obelixia-core:
    image: obelixia/erp-core:\${ERP_VERSION:-latest}
    environment:
      - INSTALLATION_KEY=${key}
      - DATABASE_URL=postgresql://obelixia:\${DB_PASSWORD:-changeme}@postgres:5432/obelixia_erp
      - REDIS_URL=redis://redis:6379
    ports:
      - "\${PORT:-8080}:8080"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - obelixia-net
${services}

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - obelixia-core
    restart: unless-stopped
    networks:
      - obelixia-net

volumes:
  pgdata:

networks:
  obelixia-net:
    driver: bridge`;
}

function generateDockerfile(key: string, modules: string[], ts: string): string {
  return `# ObelixIA ERP - Custom Dockerfile
# Generated: ${ts}
# Modules: ${modules.join(', ')}

FROM node:20-alpine AS base
LABEL maintainer="ObelixIA <devops@obelixia.com>"
LABEL version="1.0.0"

# Install dependencies
RUN apk add --no-cache curl openssl

WORKDIR /app

# Copy core
COPY core/ ./core/

# Copy selected modules
${modules.filter(m => m !== 'core').map(m => `COPY modules/${m}/ ./modules/${m}/`).join('\n')}

# Install dependencies
RUN cd core && npm ci --production
${modules.filter(m => m !== 'core').map(m => `RUN cd modules/${m} && npm ci --production`).join('\n')}

# Environment
ENV INSTALLATION_KEY=${key}
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:8080/health || exit 1

CMD ["node", "core/server.js"]`;
}

function generateHelmValues(key: string, modules: { module_key: string }[], ts: string): string {
  const moduleConfigs = modules.filter(m => m.module_key !== 'core').map(m => `
  ${m.module_key}:
    enabled: true
    replicas: 1
    image:
      repository: obelixia/erp-${m.module_key}
      tag: latest
    resources:
      requests:
        memory: "256Mi"
        cpu: "250m"
      limits:
        memory: "512Mi"
        cpu: "500m"`).join('\n');

  return `# ObelixIA ERP - Helm Chart Values
# Generated: ${ts}

global:
  installationKey: "${key}"
  environment: production
  imageRegistry: docker.io

core:
  replicas: 2
  image:
    repository: obelixia/erp-core
    tag: latest
  service:
    type: LoadBalancer
    port: 80
  resources:
    requests:
      memory: "512Mi"
      cpu: "500m"
    limits:
      memory: "1Gi"
      cpu: "1"
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 10
    targetCPUUtilization: 70

modules:${moduleConfigs}

postgresql:
  enabled: true
  auth:
    database: obelixia_erp
    username: obelixia
  primary:
    persistence:
      size: 20Gi

redis:
  enabled: true
  architecture: standalone

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: erp.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: erp-tls
      hosts:
        - erp.example.com

monitoring:
  enabled: true
  prometheus:
    scrape: true
  grafana:
    dashboards: true`;
}

function generateK8sManifests(key: string, modules: { module_key: string; module_name: string }[], ts: string): string {
  const deployments = modules.filter(m => m.module_key !== 'core').map(m => `
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: obelixia-${m.module_key}
  namespace: obelixia
spec:
  replicas: 1
  selector:
    matchLabels:
      app: obelixia-${m.module_key}
  template:
    metadata:
      labels:
        app: obelixia-${m.module_key}
    spec:
      containers:
      - name: ${m.module_key}
        image: obelixia/erp-${m.module_key}:latest
        envFrom:
        - secretRef:
            name: obelixia-config
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 15
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080`).join('');

  return `# ObelixIA ERP - Kubernetes Manifests
# Generated: ${ts}

apiVersion: v1
kind: Namespace
metadata:
  name: obelixia
---
apiVersion: v1
kind: Secret
metadata:
  name: obelixia-config
  namespace: obelixia
type: Opaque
stringData:
  INSTALLATION_KEY: "${key}"
  DATABASE_URL: "postgresql://obelixia:changeme@postgres:5432/obelixia_erp"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: obelixia-core
  namespace: obelixia
spec:
  replicas: 2
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
        envFrom:
        - secretRef:
            name: obelixia-config
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: obelixia-core
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

function generatePowerShell(key: string, modules: string[], ts: string): string {
  return `# ObelixIA ERP - Windows Enterprise Installer
# Generated: ${ts}
# PowerShell 7+ required | Run as Administrator

#Requires -RunAsAdministrator
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$Config = @{
    InstallKey  = "${key}"
    InstallDir  = "$env:ProgramFiles\\ObelixIA\\ERP"
    DataDir     = "$env:ProgramData\\ObelixIA"
    Modules     = @(${modules.map(m => `"${m}"`).join(', ')})
    BaseURL     = "https://releases.obelixia.com/erp"
    Version     = "latest"
}

Write-Host @"
╔══════════════════════════════════════════════╗
║   ObelixIA ERP - Enterprise Windows Install  ║
║   Modules: $($Config.Modules.Count)                              ║
╚══════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

# [1] Prerequisites
Write-Host "[1/6] Checking prerequisites..." -ForegroundColor Yellow
$dotnet = Get-Command dotnet -ErrorAction SilentlyContinue
if (-not $dotnet) {
    Write-Host "  Installing .NET 8 Runtime..." -ForegroundColor Gray
    winget install Microsoft.DotNet.Runtime.8 --accept-package-agreements --silent
}

# [2] Create directories
Write-Host "[2/6] Creating directories..." -ForegroundColor Yellow
@($Config.InstallDir, $Config.DataDir, "$($Config.DataDir)\\logs", "$($Config.DataDir)\\backups") | ForEach-Object {
    New-Item -ItemType Directory -Force -Path $_ | Out-Null
}

# [3] Download & Install
Write-Host "[3/6] Downloading ObelixIA Core..." -ForegroundColor Yellow
$coreZip = "$env:TEMP\\obelixia-core.zip"
Invoke-WebRequest -Uri "$($Config.BaseURL)/core/$($Config.Version)/windows-x64.zip" -OutFile $coreZip
Expand-Archive -Path $coreZip -DestinationPath $Config.InstallDir -Force

# [4] Install modules
Write-Host "[4/6] Installing modules..." -ForegroundColor Yellow
foreach ($mod in $Config.Modules) {
    if ($mod -eq "core") { continue }
    Write-Host "  → $mod" -ForegroundColor Gray
    $modZip = "$env:TEMP\\obelixia-$mod.zip"
    Invoke-WebRequest -Uri "$($Config.BaseURL)/modules/$mod/$($Config.Version)/windows-x64.zip" -OutFile $modZip
    Expand-Archive -Path $modZip -DestinationPath "$($Config.InstallDir)\\modules\\$mod" -Force
}

# [5] Configure
Write-Host "[5/6] Configuring..." -ForegroundColor Yellow
@"
[installation]
key = "$($Config.InstallKey)"
modules = [$(($Config.Modules | ForEach-Object { '"' + $_ + '"' }) -join ', ')]
auto_update = true
update_channel = "stable"

[database]
provider = "postgresql"
connection_string = "Host=localhost;Database=obelixia_erp;Username=obelixia"

[logging]
level = "info"
path = "$($Config.DataDir)\\logs"
"@ | Set-Content "$($Config.InstallDir)\\config.toml" -Encoding UTF8

# [6] Register service
Write-Host "[6/6] Registering Windows Service..." -ForegroundColor Yellow
New-Service -Name "ObelixIAERP" -BinaryPathName "$($Config.InstallDir)\\obelixia-erp.exe serve" \\
    -DisplayName "ObelixIA ERP" -StartupType Automatic -Description "ObelixIA Enterprise ERP"
Start-Service -Name "ObelixIAERP"

Write-Host "✅ Installation complete!" -ForegroundColor Green
Write-Host "   Dashboard: http://localhost:8080" -ForegroundColor Cyan
Write-Host "   Logs: $($Config.DataDir)\\logs" -ForegroundColor Gray`;
}

function generateBash(key: string, modules: string[], ts: string): string {
  return `#!/usr/bin/env bash
# ObelixIA ERP - Linux/macOS Enterprise Installer
# Generated: ${ts}

set -euo pipefail
trap 'echo "❌ Error on line $LINENO"; exit 1' ERR

INSTALL_KEY="${key}"
INSTALL_DIR="/opt/obelixia/erp"
DATA_DIR="/var/lib/obelixia"
LOG_DIR="/var/log/obelixia"
MODULES=(${modules.map(m => `"${m}"`).join(' ')})
BASE_URL="https://releases.obelixia.com/erp"
VERSION="latest"

echo "╔══════════════════════════════════════════════╗"
echo "║   ObelixIA ERP - Enterprise Linux Install    ║"
echo "║   Modules: \${#MODULES[@]}                                ║"
echo "╚══════════════════════════════════════════════╝"

# [1] Check root
if [ "$(id -u)" -ne 0 ]; then
  echo "❌ Run with sudo"; exit 1
fi

# [2] Prerequisites
echo "[1/7] Installing prerequisites..."
if command -v apt-get &>/dev/null; then
  apt-get update -qq && apt-get install -yqq postgresql-16 redis-server curl jq
elif command -v yum &>/dev/null; then
  yum install -y postgresql16-server redis curl jq
elif command -v brew &>/dev/null; then
  brew install postgresql@16 redis curl jq
fi

# [3] Create user & directories
echo "[2/7] Setting up directories..."
id -u obelixia &>/dev/null || useradd -r -s /bin/false obelixia
mkdir -p "$INSTALL_DIR"/{core,modules} "$DATA_DIR" "$LOG_DIR"

# [4] Download core
echo "[3/7] Downloading ObelixIA Core..."
ARCH=$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/')
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
curl -fsSL "$BASE_URL/core/$VERSION/$OS-$ARCH.tar.gz" | tar xz -C "$INSTALL_DIR/core/"

# [5] Install modules
echo "[4/7] Installing modules..."
for mod in "\${MODULES[@]}"; do
  [ "$mod" = "core" ] && continue
  echo "  → $mod"
  mkdir -p "$INSTALL_DIR/modules/$mod"
  curl -fsSL "$BASE_URL/modules/$mod/$VERSION/$OS-$ARCH.tar.gz" | tar xz -C "$INSTALL_DIR/modules/$mod/"
done

# [6] Configure
echo "[5/7] Configuring..."
MODS_TOML=$(printf '"%s", ' "\${MODULES[@]}" | sed 's/, $//')
cat > "$INSTALL_DIR/config.toml" << EOF
[installation]
key = "$INSTALL_KEY"
modules = [$MODS_TOML]
auto_update = true
update_channel = "stable"

[database]
host = "localhost"
port = 5432
name = "obelixia_erp"
user = "obelixia"

[logging]
level = "info"
path = "$LOG_DIR"

[security]
tls_enabled = false
EOF

# [7] Systemd service
echo "[6/7] Creating systemd service..."
cat > /etc/systemd/system/obelixia-erp.service << EOF
[Unit]
Description=ObelixIA Enterprise ERP
After=postgresql.service redis.service
Requires=postgresql.service

[Service]
Type=simple
User=obelixia
ExecStart=$INSTALL_DIR/core/obelixia-erp serve --config $INSTALL_DIR/config.toml
Restart=always
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

chown -R obelixia:obelixia "$INSTALL_DIR" "$DATA_DIR" "$LOG_DIR"
systemctl daemon-reload
systemctl enable --now obelixia-erp

echo "[7/7] Verifying..."
sleep 3
if systemctl is-active --quiet obelixia-erp; then
  echo "✅ Installation complete!"
  echo "   Dashboard: http://localhost:8080"
else
  echo "⚠️ Service started but may need configuration"
  journalctl -u obelixia-erp --no-pager -n 20
fi`;
}

function generateProxmox(key: string, modules: string[], ts: string): string {
  return `#!/usr/bin/env bash
# ObelixIA ERP - Proxmox VE Deployment
# Generated: ${ts}

set -euo pipefail

VM_ID=\${1:-200}
VM_NAME="obelixia-erp"
INSTALL_KEY="${key}"
MODULES="${modules.join(' ')}"
STORAGE=\${STORAGE:-local-lvm}
MEMORY=\${MEMORY:-4096}
CORES=\${CORES:-2}
DISK_SIZE=\${DISK_SIZE:-32G}
BRIDGE=\${BRIDGE:-vmbr0}

echo "╔══════════════════════════════════════════════╗"
echo "║   ObelixIA ERP - Proxmox VM Deployment       ║"
echo "║   VM ID: $VM_ID | RAM: \${MEMORY}MB             ║"
echo "╚══════════════════════════════════════════════╝"

# [1] Download cloud image
echo "[1/6] Downloading Ubuntu 24.04 cloud image..."
IMG_URL="https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img"
IMG_PATH="/var/lib/vz/template/iso/ubuntu-noble.img"
[ -f "$IMG_PATH" ] || wget -q "$IMG_URL" -O "$IMG_PATH"

# [2] Create VM
echo "[2/6] Creating VM $VM_ID..."
qm create $VM_ID \\
  --name $VM_NAME \\
  --memory $MEMORY \\
  --cores $CORES \\
  --net0 virtio,bridge=$BRIDGE \\
  --ostype l26 \\
  --agent enabled=1

# [3] Disk setup
echo "[3/6] Configuring storage..."
qm importdisk $VM_ID "$IMG_PATH" $STORAGE
qm set $VM_ID --scsihw virtio-scsi-pci --scsi0 $STORAGE:vm-$VM_ID-disk-0
qm resize $VM_ID scsi0 $DISK_SIZE
qm set $VM_ID --boot order=scsi0

# [4] Cloud-init
echo "[4/6] Configuring cloud-init..."
qm set $VM_ID --ide2 $STORAGE:cloudinit
qm set $VM_ID --serial0 socket --vga serial0
qm set $VM_ID --ciuser obelixia
qm set $VM_ID --cipassword \${CI_PASSWORD:-ObelixIA2025!}
qm set $VM_ID --ipconfig0 ip=dhcp
qm set $VM_ID --sshkeys ~/.ssh/authorized_keys 2>/dev/null || true

# [5] Start VM
echo "[5/6] Starting VM..."
qm start $VM_ID
echo "  Waiting for boot (60s)..."
sleep 60

# [6] Install ERP via SSH
echo "[6/6] Installing ObelixIA ERP..."
VM_IP=$(qm guest cmd $VM_ID network-get-interfaces | jq -r '.[1]["ip-addresses"][0]["ip-address"]' 2>/dev/null || echo "dhcp")

if [ "$VM_IP" != "dhcp" ]; then
  ssh -o StrictHostKeyChecking=no obelixia@$VM_IP "
    curl -fsSL https://releases.obelixia.com/erp/install.sh | \\
    sudo INSTALL_KEY=$INSTALL_KEY MODULES='$MODULES' bash
  "
  echo "✅ VM created and ERP installed!"
  echo "   VM ID: $VM_ID"
  echo "   IP: $VM_IP"
  echo "   Dashboard: http://$VM_IP:8080"
else
  echo "⚠️ VM created. Get IP from Proxmox console and run:"
  echo "   curl -fsSL https://releases.obelixia.com/erp/install.sh | \\\\"
  echo "   sudo INSTALL_KEY=$INSTALL_KEY MODULES='$MODULES' bash"
fi`;
}

function generateCloudFormation(key: string, modules: string[], ts: string): string {
  return `# ObelixIA ERP - AWS CloudFormation
# Generated: ${ts}

AWSTemplateFormatVersion: '2010-09-09'
Description: ObelixIA Enterprise ERP - Full Stack Deployment

Parameters:
  InstallationKey:
    Type: String
    Default: "${key}"
    NoEcho: true
  InstanceType:
    Type: String
    Default: t3.medium
    AllowedValues: [t3.small, t3.medium, t3.large, t3.xlarge, m5.large, m5.xlarge]
  DBInstanceType:
    Type: String
    Default: db.t3.medium
  VPCId:
    Type: AWS::EC2::VPC::Id
  SubnetIds:
    Type: List<AWS::EC2::Subnet::Id>

Resources:
  ERPSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: ObelixIA ERP Security Group
      VpcId: !Ref VPCId
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 8080
          ToPort: 8080
          CidrIp: 10.0.0.0/8

  ERPDatabase:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceClass: !Ref DBInstanceType
      Engine: postgres
      EngineVersion: '16'
      DBName: obelixia_erp
      MasterUsername: obelixia
      MasterUserPassword: !Sub '\${InstallationKey}-db'
      AllocatedStorage: 50
      StorageType: gp3
      MultiAZ: true
      BackupRetentionPeriod: 7

  ERPInstance:
    Type: AWS::EC2::Instance
    Properties:
      InstanceType: !Ref InstanceType
      ImageId: ami-0c55b159cbfafe1f0
      SecurityGroupIds:
        - !Ref ERPSecurityGroup
      UserData:
        Fn::Base64: !Sub |
          #!/bin/bash
          curl -fsSL https://releases.obelixia.com/erp/install.sh | \\
          INSTALL_KEY=\${InstallationKey} \\
          MODULES="${modules.join(' ')}" \\
          DB_HOST=\${ERPDatabase.Endpoint.Address} \\
          bash

Outputs:
  DashboardURL:
    Value: !Sub 'http://\${ERPInstance.PublicIp}:8080'
  DatabaseEndpoint:
    Value: !GetAtt ERPDatabase.Endpoint.Address`;
}

function generateTerraform(key: string, modules: string[], ts: string): string {
  return `# ObelixIA ERP - Terraform Configuration
# Generated: ${ts}
# Compatible with AWS, Azure, GCP

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "installation_key" {
  type      = string
  default   = "${key}"
  sensitive = true
}

variable "modules" {
  type    = list(string)
  default = [${modules.map(m => `"${m}"`).join(', ')}]
}

variable "instance_type" {
  type    = string
  default = "t3.medium"
}

variable "region" {
  type    = string
  default = "eu-west-1"
}

provider "aws" {
  region = var.region
}

# VPC
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "obelixia-erp-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["\${var.region}a", "\${var.region}b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true
}

# RDS PostgreSQL
resource "aws_db_instance" "erp" {
  identifier     = "obelixia-erp-db"
  engine         = "postgres"
  engine_version = "16"
  instance_class = "db.t3.medium"

  db_name  = "obelixia_erp"
  username = "obelixia"
  password = "\${var.installation_key}-db"

  allocated_storage     = 50
  max_allocated_storage = 200
  storage_type          = "gp3"
  multi_az              = true

  vpc_security_group_ids = [aws_security_group.db.id]
  db_subnet_group_name   = aws_db_subnet_group.erp.name

  backup_retention_period = 7
  skip_final_snapshot     = false
  final_snapshot_identifier = "obelixia-erp-final"
}

# EC2 Instance
resource "aws_instance" "erp" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  vpc_security_group_ids = [aws_security_group.erp.id]
  subnet_id              = module.vpc.public_subnets[0]

  user_data = <<-EOF
    #!/bin/bash
    curl -fsSL https://releases.obelixia.com/erp/install.sh | \\
    INSTALL_KEY=\${var.installation_key} \\
    MODULES="\${join(" ", var.modules)}" \\
    DB_HOST=\${aws_db_instance.erp.address} \\
    bash
  EOF

  tags = {
    Name = "obelixia-erp"
  }
}

data "aws_ami" "ubuntu" {
  most_recent = true
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-noble-24.04-amd64-server-*"]
  }
  owners = ["099720109477"]
}

resource "aws_security_group" "erp" {
  name_prefix = "obelixia-erp-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "db" {
  name_prefix = "obelixia-db-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.erp.id]
  }
}

resource "aws_db_subnet_group" "erp" {
  name       = "obelixia-erp"
  subnet_ids = module.vpc.private_subnets
}

output "dashboard_url" {
  value = "http://\${aws_instance.erp.public_ip}:8080"
}

output "database_endpoint" {
  value = aws_db_instance.erp.address
}`;
}

function generateARMTemplate(key: string, modules: string[], ts: string): string {
  return `{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "metadata": {
    "description": "ObelixIA Enterprise ERP - Azure Deployment",
    "generated": "${ts}"
  },
  "parameters": {
    "installationKey": {
      "type": "securestring",
      "defaultValue": "${key}"
    },
    "vmSize": {
      "type": "string",
      "defaultValue": "Standard_B2ms",
      "allowedValues": ["Standard_B2s", "Standard_B2ms", "Standard_D2s_v3", "Standard_D4s_v3"]
    },
    "adminUsername": {
      "type": "string",
      "defaultValue": "obelixia"
    },
    "adminPassword": {
      "type": "securestring"
    }
  },
  "variables": {
    "vmName": "obelixia-erp-vm",
    "modules": "${modules.join(' ')}"
  },
  "resources": [
    {
      "type": "Microsoft.Compute/virtualMachines",
      "apiVersion": "2023-09-01",
      "name": "[variables('vmName')]",
      "location": "[resourceGroup().location]",
      "properties": {
        "hardwareProfile": {
          "vmSize": "[parameters('vmSize')]"
        },
        "osProfile": {
          "computerName": "[variables('vmName')]",
          "adminUsername": "[parameters('adminUsername')]",
          "adminPassword": "[parameters('adminPassword')]",
          "customData": "[base64(concat('#!/bin/bash\\ncurl -fsSL https://releases.obelixia.com/erp/install.sh | INSTALL_KEY=', parameters('installationKey'), ' MODULES=\\"', variables('modules'), '\\" bash'))]"
        },
        "storageProfile": {
          "imageReference": {
            "publisher": "Canonical",
            "offer": "0001-com-ubuntu-server-noble",
            "sku": "24_04-lts",
            "version": "latest"
          },
          "osDisk": {
            "createOption": "FromImage",
            "diskSizeGB": 64,
            "managedDisk": {
              "storageAccountType": "Premium_LRS"
            }
          }
        }
      }
    }
  ],
  "outputs": {
    "vmId": {
      "type": "string",
      "value": "[resourceId('Microsoft.Compute/virtualMachines', variables('vmName'))]"
    }
  }
}`;
}
