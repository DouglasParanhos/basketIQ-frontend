# Checks what the Android emulator tests need (spec 022) and says how to install what is missing.
# Read-only: it changes nothing. Run with: powershell -ExecutionPolicy Bypass -File scripts/android/setup.ps1

$Avd = 'basketiq-pixel7'
$SystemImage = 'system-images;android-36;google_apis;x86_64'
$Packages = @('platform-tools', 'emulator', 'platforms;android-36', $SystemImage)
$Sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } elseif ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } else { "$env:LOCALAPPDATA\Android\Sdk" }
$SdkManager = "$Sdk\cmdline-tools\latest\bin\sdkmanager.bat"
$missing = 0

function Check([string]$Name, [bool]$Ok, [string]$Fix) {
    if ($Ok) { Write-Host "[ok]   $Name" }
    else { Write-Host "[falta] $Name" -ForegroundColor Yellow; Write-Host "       $Fix"; $script:missing++ }
}

# Virtualization: the emulator needs WHPX (Windows Hypervisor Platform) or Hyper-V; it coexists with WSL 2 and Docker.
$hypervisor = (Get-CimInstance Win32_ComputerSystem).HypervisorPresent
Check 'Hipervisor ativo' $hypervisor 'Ative "Windows Hypervisor Platform" (optionalfeatures.exe) e reinicie.'

# Capacitor 8 needs JDK 21.
$javaVersion = $null
try { $javaVersion = (& java -version 2>&1 | Out-String) -replace '(?s).*version "(\d+).*', '$1' } catch {}
Check "JDK 21 ou mais recente (encontrado: $javaVersion)" ($javaVersion -as [int] -ge 21) 'winget install EclipseAdoptium.Temurin.21.JDK  (e defina JAVA_HOME)'

$nodeMajor = $null
try { $nodeMajor = (& node -v) -replace '^v(\d+).*', '$1' } catch {}
Check "Node 24 ou mais recente (encontrado: $nodeMajor)" ($nodeMajor -as [int] -ge 24) 'winget install OpenJS.NodeJS  (ou um Node 24 portátil antes no PATH)'
Check 'pnpm' ([bool](Get-Command pnpm -ErrorAction SilentlyContinue)) 'corepack enable'

Check "Android command-line tools em $Sdk" (Test-Path $SdkManager) "Descarregue commandlinetools-win-*_latest.zip de https://developer.android.com/studio#command-line-tools-only e extraia para $Sdk\cmdline-tools\latest"
foreach ($p in $Packages) {
    $dir = Join-Path $Sdk ($p -replace ';', '\')
    Check "SDK: $p" (Test-Path $dir) "& `"$SdkManager`" --install `"$p`"  (aceite as licenças com --licenses)"
}
Check 'ANDROID_HOME definido' ([bool]$env:ANDROID_HOME) "[Environment]::SetEnvironmentVariable('ANDROID_HOME', '$Sdk', 'User')  e acrescente platform-tools e emulator ao PATH"

$emulator = "$Sdk\emulator\emulator.exe"
$avds = if (Test-Path $emulator) { & $emulator -list-avds 2>$null } else { @() }
Check "AVD $Avd" ($avds -contains $Avd) "echo no | & `"$Sdk\cmdline-tools\latest\bin\avdmanager.bat`" create avd -n $Avd -k `"$SystemImage`" -d pixel_7"

$freeGb = [math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1MB, 1)
Check "Memória livre para o emulador, cerca de 4 GB (livre: $freeGb GB)" ($freeGb -ge 4) 'Feche aplicações ou reduza a memória do WSL em %USERPROFILE%\.wslconfig.'

if ($missing) { Write-Host "`nFaltam $missing itens." -ForegroundColor Yellow; exit 1 }
Write-Host "`nTudo pronto: pnpm android:emulator, pnpm dev e pnpm android:run."
