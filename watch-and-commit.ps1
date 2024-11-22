# Script per monitorare le modifiche e committare automaticamente
$ErrorActionPreference = "Stop"

# Funzione per ottenere un timestamp formattato
function Get-FormattedTimestamp {
    return Get-Date -Format "yyyy-MM-dd HH:mm:ss"
}

# Funzione per scrivere log colorati
function Write-ColorLog {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host "[$((Get-FormattedTimestamp))] $Message" -ForegroundColor $Color
}

# Directory del progetto
$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectDir

Write-ColorLog "Avvio monitoraggio modifiche in: $projectDir" "Cyan"
Write-ColorLog "Premi Ctrl+C per terminare" "Yellow"

# Crea un FileSystemWatcher per monitorare le modifiche
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $projectDir
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true

# Pattern da monitorare
$watcher.Filter = "*.*"
$watcher.NotifyFilter = [System.IO.NotifyFilters]::FileName -bor 
                       [System.IO.NotifyFilters]::DirectoryName -bor 
                       [System.IO.NotifyFilters]::LastWrite

# Variabili per il debounce
$debounceSeconds = 5
$lastRunTime = [DateTime]::MinValue
$timer = $null

# Funzione per gestire le modifiche
function Invoke-FileChangeHandler {
    param([string]$changeType, [string]$path)
    
    $now = Get-Date
    $script:lastRunTime = $now
    
    # Se c'è già un timer in esecuzione, cancellalo
    if ($null -ne $script:timer) {
        $script:timer.Stop()
        $script:timer.Dispose()
    }
    
    # Crea un nuovo timer
    $script:timer = New-Object System.Timers.Timer
    $script:timer.Interval = $debounceSeconds * 1000
    $script:timer.AutoReset = $false
    
    # Evento che viene triggerato quando il timer scade
    $script:timer.Add_Elapsed({
        try {
            $relativePath = $path.Replace($projectDir, '').TrimStart('\')
            Write-ColorLog "Modifiche rilevate in: $relativePath" "Yellow"
            
            # Esegui lo script di auto-commit
            $scriptPath = Join-Path $projectDir "auto-git.ps1"
            if (Test-Path $scriptPath) {
                Write-ColorLog "Esecuzione auto-git.ps1..." "Cyan"
                & $scriptPath
                if ($LASTEXITCODE -eq 0) {
                    Write-ColorLog "Auto-commit completato con successo" "Green"
                } else {
                    Write-ColorLog "Errore durante l'auto-commit" "Red"
                }
            } else {
                Write-ColorLog "Script auto-git.ps1 non trovato!" "Red"
            }
        }
        catch {
            Write-ColorLog "Errore durante l'elaborazione delle modifiche: $_" "Red"
            Write-ColorLog $_.ScriptStackTrace "Red"
        }
        finally {
            $script:timer.Stop()
            $script:timer.Dispose()
        }
    })
    
    # Avvia il timer
    $script:timer.Start()
}

# Registra gli eventi per le modifiche ai file
$handlers = @(
    @{
        Name = 'Created'
        Action = { Invoke-FileChangeHandler 'Created' $Event.SourceEventArgs.FullPath }
    }
    @{
        Name = 'Changed'
        Action = { Invoke-FileChangeHandler 'Modified' $Event.SourceEventArgs.FullPath }
    }
    @{
        Name = 'Deleted'
        Action = { Invoke-FileChangeHandler 'Deleted' $Event.SourceEventArgs.FullPath }
    }
    @{
        Name = 'Renamed'
        Action = { Invoke-FileChangeHandler 'Renamed' $Event.SourceEventArgs.FullPath }
    }
)

# Registra i gestori degli eventi
$handlers | ForEach-Object {
    $name = $_.Name
    $action = $_.Action
    Register-ObjectEvent -InputObject $watcher -EventName $name -Action $action | Out-Null
}

try {
    # Esegui auto-git.ps1 all'avvio per gestire eventuali modifiche pendenti
    Write-ColorLog "Controllo modifiche pendenti..." "Yellow"
    & (Join-Path $projectDir "auto-git.ps1")
    
    Write-ColorLog "Monitoraggio avviato. In attesa di modifiche..." "Green"
    while ($true) { Start-Sleep -Seconds 1 }
}
finally {
    # Pulizia quando lo script viene terminato
    if ($null -ne $timer) {
        $timer.Stop()
        $timer.Dispose()
    }
    $watcher.EnableRaisingEvents = $false
    $watcher.Dispose()
    Get-EventSubscriber | Unregister-Event
    Write-ColorLog "Monitoraggio terminato" "Cyan"
}
