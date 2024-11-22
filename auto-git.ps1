# Script per automatizzare gli aggiornamenti Git
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

try {
    # Vai alla directory del progetto
    Set-Location $projectDir
    Write-ColorLog "Directory di lavoro: $projectDir" "Cyan"

    # Controlla se ci sono modifiche
    $status = git status --porcelain
    if ($status) {
        Write-ColorLog "Modifiche rilevate. Avvio processo di commit..." "Yellow"

        # Stage di tutte le modifiche
        git add .
        if ($LASTEXITCODE -ne 0) { throw "Errore durante git add" }
        Write-ColorLog "Stage delle modifiche completato" "Green"

        # Crea il commit con timestamp
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
        $commitMessage = "Auto-commit: Aggiornamento $timestamp`n`nModifiche automaticamente committate dallo script di auto-update"
        git commit -m $commitMessage
        if ($LASTEXITCODE -ne 0) { throw "Errore durante git commit" }
        Write-ColorLog "Commit creato con successo" "Green"

        # Push delle modifiche
        git push
        if ($LASTEXITCODE -ne 0) { throw "Errore durante git push" }
        Write-ColorLog "Push completato con successo" "Green"

        Write-ColorLog "Processo completato con successo!" "Cyan"
    }
    else {
        Write-ColorLog "Nessuna modifica rilevata" "Yellow"
    }
}
catch {
    Write-ColorLog "Errore: $_" "Red"
    exit 1
}
