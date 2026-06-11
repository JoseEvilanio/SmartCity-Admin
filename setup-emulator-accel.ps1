# ============================================================
# SmartCity – Ativar aceleracao de emulador Android
# Executar em PowerShell como ADMINISTRADOR
# Requer REBOOT apos execucao
# ============================================================

$ErrorActionPreference = 'Stop'

$id = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($id)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "[ERRO] Execute como Administrador." -ForegroundColor Red
    exit 1
}

Write-Host "[1/3] Habilitando Windows Hypervisor Platform (WHPX)..." -ForegroundColor Cyan
DISM /Online /Enable-Feature /All /FeatureName:HypervisorPlatform /NoRestart
DISM /Online /Enable-Feature /All /FeatureName:VirtualMachinePlatform /NoRestart

Write-Host "[2/3] Instalando Android Emulator Hypervisor Driver (AEHD)..." -ForegroundColor Cyan
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-17.0.17.10-hotspot'
$env:Path = "$env:JAVA_HOME\bin;C:\Android\android-sdk\cmdline-tools\latest\bin;" + $env:Path

$yes = (1..30 | ForEach-Object { 'y' }) -join "`n"
$yes | & "C:\Android\android-sdk\cmdline-tools\latest\bin\sdkmanager.bat" --install "extras;google;Android_Emulator_Hypervisor_Driver" 2>$null

# Tenta rodar o instalador do driver
$aehdInstaller = Get-ChildItem -Path "C:\Android\android-sdk\extras\google\Android_Emulator_Hypervisor_Driver" -Filter "silent_install.bat" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if ($aehdInstaller) {
    Write-Host "  Executando $($aehdInstaller.FullName)..." -ForegroundColor Gray
    & $aehdInstaller.FullName
} else {
    Write-Host "  [AVISO] silent_install.bat nao encontrado. AEHD pode ser baixado manualmente de:" -ForegroundColor Yellow
    Write-Host "  https://github.com/google/android-emulator-hypervisor-driver/releases" -ForegroundColor Yellow
}

Write-Host "[3/3] Verificando estado final..." -ForegroundColor Cyan
DISM /Online /Get-FeatureInfo /FeatureName:HypervisorPlatform | Select-Object -ExpandProperty Properties | Select-Object FeatureName, State

Write-Host ""
Write-Host "=== REINICIE O COMPUTADOR AGORA ===" -ForegroundColor Green
Write-Host "Apos reiniciar, abra PowerShell normal e execute:" -ForegroundColor Cyan
Write-Host "  cd C:\Users\TI\Downloads\smartcity-admin\mobile_app" -ForegroundColor White
Write-Host "  flutter emulators --launch smartcity_test" -ForegroundColor White
