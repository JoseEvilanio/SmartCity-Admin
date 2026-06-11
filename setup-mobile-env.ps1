# ============================================================
# SmartCity – Script de Setup do Ambiente Mobile (Windows)
# Executar em PowerShell como ADMINISTRADOR
# ============================================================
# Uso: powershell -ExecutionPolicy Bypass -File .\setup-mobile-env.ps1
# ============================================================

$ErrorActionPreference = 'Stop'
$ProjectRoot = $PSScriptRoot | Split-Path -Parent
$MobileApp   = Join-Path $ProjectRoot 'mobile_app'

# ── 1. Verificar privilégios de admin ──────────────────────
$id        = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($id)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "[ERRO] Este script precisa ser executado como Administrador." -ForegroundColor Red
    Write-Host "       Clique com botao direito no PowerShell -> Executar como administrador" -ForegroundColor Yellow
    exit 1
}

# ── 2. Verificar/instalar Chocolatey ───────────────────────
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "[1/6] Instalando Chocolatey..." -ForegroundColor Cyan
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
} else {
    Write-Host "[1/6] Chocolatey ja instalado: $(choco --version)" -ForegroundColor Green
}

# ── 3. Instalar Java 17 (Temurin) ──────────────────────────
Write-Host "[2/6] Instalando Temurin JDK 17..." -ForegroundColor Cyan
choco install -y temurin17 --no-progress

# ── 4. Instalar Flutter SDK ────────────────────────────────
Write-Host "[3/6] Instalando Flutter SDK..." -ForegroundColor Cyan
choco install -y flutter --no-progress

# ── 5. Instalar Android command-line tools ─────────────────
Write-Host "[4/6] Instalando Android command-line tools..." -ForegroundColor Cyan
choco install -y android-sdk --no-progress

# ── 6. Configurar variaveis de ambiente ────────────────────
Write-Host "[5/6] Configurando variaveis de ambiente..." -ForegroundColor Cyan

# JAVA_HOME (choco temurin17 instala em C:\Program Files\Eclipse Adoptium)
$jdkPath = Get-ChildItem "C:\Program Files\Eclipse Adoptium" -Directory -ErrorAction SilentlyContinue |
           Where-Object { $_.Name -match 'jdk-17' } |
           Select-Object -First 1 -ExpandProperty FullName
if ($jdkPath) {
    [System.Environment]::SetEnvironmentVariable('JAVA_HOME', $jdkPath, 'User')
    Write-Host "  JAVA_HOME = $jdkPath" -ForegroundColor Green
} else {
    Write-Host "  [AVISO] JAVA_HOME nao foi localizado automaticamente" -ForegroundColor Yellow
}

# ANDROID_HOME (choco android-sdk instala em C:\Android\android-sdk)
$androidPaths = @('C:\Android\android-sdk','C:\Android\sdk')
$androidHome  = $androidPaths | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($androidHome) {
    [System.Environment]::SetEnvironmentVariable('ANDROID_HOME', $androidHome, 'User')
    [System.Environment]::SetEnvironmentVariable('ANDROID_SDK_ROOT', $androidHome, 'User')
    Write-Host "  ANDROID_HOME = $androidHome" -ForegroundColor Green
} else {
    Write-Host "  [AVISO] ANDROID_HOME nao foi localizado" -ForegroundColor Yellow
}

# Adicionar Flutter + platform-tools ao PATH do usuario
$flutterBin   = 'C:\tools\flutter\bin'
$platformTools = if ($androidHome) { Join-Path $androidHome 'platform-tools' } else { $null }
$currentPath  = [System.Environment]::GetEnvironmentVariable('Path', 'User')
$newEntries   = @($flutterBin, $platformTools) | Where-Object { $_ -and (Test-Path $_) -and ($currentPath -notlike "*$_*") }
if ($newEntries.Count -gt 0) {
    [System.Environment]::SetEnvironmentVariable('Path', $currentPath + ';' + ($newEntries -join ';'), 'User')
    Write-Host "  PATH atualizado com: $($newEntries -join ', ')" -ForegroundColor Green
}

# ── 7. Aceitar licencas e instalar pacotes SDK ─────────────
Write-Host "[6/6] Aceitando licencas e instalando SDK packages..." -ForegroundColor Cyan
if ($androidHome) {
    $sdkmanager = Join-Path $androidHome 'cmdline-tools\latest\bin\sdkmanager.bat'
    if (-not (Test-Path $sdkmanager)) {
        $sdkmanager = Get-ChildItem -Path $androidHome -Recurse -Filter 'sdkmanager.bat' -ErrorAction SilentlyContinue |
                      Select-Object -First 1 -ExpandProperty FullName
    }
    if ($sdkmanager) {
        Write-Host "  sdkmanager = $sdkmanager" -ForegroundColor Gray
        $env:ANDROID_HOME = $androidHome
        & $sdkmanager --licenses < (Get-Content -Raw 'N' * 10) 2>$null
        $yes = (1..20 | ForEach-Object { 'y' }) -join "`n"
        $yes | & $sdkmanager --licenses 2>$null
        & $sdkmanager 'platform-tools' 'platforms;android-34' 'build-tools;34.0.0' 2>$null
        Write-Host "  SDK packages instalados" -ForegroundColor Green
    } else {
        Write-Host "  [AVISO] sdkmanager.bat nao encontrado em $androidHome" -ForegroundColor Yellow
    }
}

# ── 8. Atualizar local.properties do projeto ───────────────
Write-Host "Atualizando mobile_app\android\local.properties..." -ForegroundColor Cyan
$localProps = Join-Path $MobileApp 'android\local.properties'
if ($jdkPath -and $androidHome) {
    $flutterSdk = 'C:\tools\flutter'
    $content = @"
# Gerado por setup-mobile-env.ps1 em $(Get-Date -Format 'yyyy-MM-dd HH:mm')
sdk.dir=$($androidHome -replace '\\','\\')
flutter.sdk=$($flutterSdk -replace '\\','\\')
flutter.buildMode=debug
flutter.versionName=1.0.0
flutter.versionCode=1
"@
    Set-Content -LiteralPath $localProps -Value $content -Encoding UTF8
    Write-Host "  local.properties atualizado" -ForegroundColor Green
}

# ── 9. flutter pub get ─────────────────────────────────────
Write-Host "Rodando 'flutter pub get' no mobile_app..." -ForegroundColor Cyan
if (Test-Path 'C:\tools\flutter\bin\flutter.bat') {
    & 'C:\tools\flutter\bin\flutter.bat' pub get
} else {
    Write-Host "  [AVISO] flutter.bat nao encontrado; rode manualmente: cd mobile_app && flutter pub get" -ForegroundColor Yellow
}

# ── 10. flutter doctor ─────────────────────────────────────
Write-Host "`n=== flutter doctor ===" -ForegroundColor Cyan
if (Test-Path 'C:\tools\flutter\bin\flutter.bat') {
    & 'C:\tools\flutter\bin\flutter.bat' doctor
}

Write-Host "`n=== Setup concluido! ===" -ForegroundColor Green
Write-Host "Feche e reabra o terminal para que o PATH atualize." -ForegroundColor Yellow
Write-Host "Para rodar os apps:" -ForegroundColor Cyan
Write-Host "  cd '$MobileApp'" -ForegroundColor White
Write-Host "  flutter run --flavor citizen --target lib\main_citizen.dart" -ForegroundColor White
Write-Host "  flutter run --flavor field   --target lib\main_field.dart"   -ForegroundColor White
