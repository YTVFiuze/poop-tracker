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

# File types to monitor
$fileTypes = @("*.html", "*.css", "*.js", "*.md")

# Pattern da escludere
$excludePatterns = @("*.git*", "*node_modules*", "*temp*", "*.vscode*")

# Funzione per verificare se un file deve essere escluso
function Test-ShouldExcludeFile {
    param([string]$path)
    foreach ($pattern in $excludePatterns) {
        if ($path -like $pattern) {
            return $true
        }
    }
    return $false
}

# Funzione per gestire le modifiche
$lastChange = [DateTime]::MinValue
$debounceSeconds = 2

function Invoke-FileChange {
    param(
        [string]$changeType,
        [string]$path
    )
    
    $now = Get-Date
    
    # Verifica se il file deve essere escluso
    if (Test-ShouldExcludeFile $path) {
        Write-ColorLog "File ignorato: $path" "Gray"
        return
    }
    
    # Verifica se il file è uno dei tipi che vogliamo monitorare
    $isValidFile = $false
    foreach ($type in $fileTypes) {
        if ($path -like $type) {
            $isValidFile = $true
            break
        }
    }
    
    if (-not $isValidFile) {
        Write-ColorLog "File non monitorato: $path" "Gray"
        return
    }
    
    # Debounce: esegui solo se è passato abbastanza tempo dall'ultima modifica
    if (($now - $lastChange).TotalSeconds -ge $debounceSeconds) {
        $script:lastChange = $now
        
        Write-ColorLog "$changeType rilevato: $path" "Yellow"
        
        try {
            # Esegui auto-git.ps1
            $autoGitPath = Join-Path $projectDir "auto-git.ps1"
            if (Test-Path $autoGitPath) {
                Write-ColorLog "Esecuzione auto-git.ps1..." "Cyan"
                & $autoGitPath
                if ($LASTEXITCODE -eq 0) {
                    Write-ColorLog "Auto-git.ps1 completato con successo" "Green"
                } else {
                    Write-ColorLog "Auto-git.ps1 fallito con codice $LASTEXITCODE" "Red"
                }
            } else {
                Write-ColorLog "auto-git.ps1 non trovato in: $autoGitPath" "Red"
            }
        }
        catch {
            Write-ColorLog "Errore durante l'esecuzione di auto-git.ps1: $_" "Red"
            Write-ColorLog $_.ScriptStackTrace "Red"
        }
    }
}

# Crea un FileSystemWatcher per ogni tipo di file
$watchers = @()

foreach ($fileType in $fileTypes) {
    $watcher = New-Object System.IO.FileSystemWatcher
    $watcher.Path = $projectDir
    $watcher.Filter = $fileType.TrimStart("*")
    $watcher.IncludeSubdirectories = $true
    $watcher.EnableRaisingEvents = $true
    
    # Configura i filtri di notifica
    $watcher.NotifyFilter = [System.IO.NotifyFilters]::FileName -bor 
                           [System.IO.NotifyFilters]::DirectoryName -bor 
                           [System.IO.NotifyFilters]::LastWrite
    
    # Registra gli eventi
    $onChange = Register-ObjectEvent $watcher "Changed" -Action {
        Invoke-FileChange "Modifica" $Event.SourceEventArgs.FullPath
    }
    $onCreated = Register-ObjectEvent $watcher "Created" -Action {
        Invoke-FileChange "Creazione" $Event.SourceEventArgs.FullPath
    }
    $onDeleted = Register-ObjectEvent $watcher "Deleted" -Action {
        Invoke-FileChange "Eliminazione" $Event.SourceEventArgs.FullPath
    }
    $onRenamed = Register-ObjectEvent $watcher "Renamed" -Action {
        Invoke-FileChange "Rinomina" $Event.SourceEventArgs.FullPath
    }
    
    $watchers += @{
        Watcher = $watcher
        Events = @($onChange, $onCreated, $onDeleted, $onRenamed)
    }
    
    Write-ColorLog "Monitoraggio avviato per $fileType" "Green"
}

try {
    Write-ColorLog "Monitoraggio attivo. Premi Ctrl+C per terminare." "Cyan"
    while ($true) { Start-Sleep -Seconds 1 }
}
finally {
    # Pulisci i watchers quando lo script viene terminato
    foreach ($w in $watchers) {
        $w.Events | ForEach-Object { Unregister-Event $_.Name }
        $w.Watcher.Dispose()
    }
    Write-ColorLog "Monitoraggio terminato." "Yellow"
}
