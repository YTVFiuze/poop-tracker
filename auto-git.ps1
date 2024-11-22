# Script per automatizzare i commit Git
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

try {
    # Controlla se siamo in un repository Git
    if (-not (Test-Path ".git")) {
        throw "Non sei in un repository Git"
    }

    # Controlla se Git è installato
    if (-not (Get-Command "git" -ErrorAction SilentlyContinue)) {
        throw "Git non è installato nel sistema"
    }

    # Controlla se il remote è configurato
    $remote = git remote -v
    if (-not $remote) {
        throw "Nessun remote configurato"
    }

    Write-ColorLog "Repository Git trovato e configurato correttamente" "Green"

    # Controlla se ci sono modifiche
    $status = git status --porcelain
    if ($status) {
        Write-ColorLog "Modifiche rilevate" "Yellow"
        
        # Configura le credenziali per GitHub
        git config --global credential.helper store
        
        # Configura l'utente se non è già configurato
        $userName = git config --global user.name
        $userEmail = git config --global user.email
        
        if (-not $userName) {
            Write-ColorLog "Configurazione nome utente Git..." "Yellow"
            git config --global user.name "YTVFiuze"
        }
        
        if (-not $userEmail) {
            Write-ColorLog "Configurazione email Git..." "Yellow"
            git config --global user.email "ytv.fiuze@gmail.com"
        }
        
        # Aggiungi tutte le modifiche
        git add .
        Write-ColorLog "File aggiunti all'area di staging" "Green"
        
        # Crea il commit con timestamp
        $timestamp = Get-FormattedTimestamp
        git commit -m "Auto commit: $timestamp"
        Write-ColorLog "Commit creato" "Green"
        
        # Push delle modifiche con output dettagliato
        Write-ColorLog "Tentativo di push..." "Yellow"
        $pushOutput = git push origin main 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-ColorLog "Push completato con successo" "Green"
        } else {
            Write-ColorLog "Errore durante il push: $pushOutput" "Red"
            throw "Push fallito"
        }
    }
    else {
        Write-ColorLog "Nessuna modifica rilevata" "Cyan"
    }
}
catch {
    Write-ColorLog "Errore: $_" "Red"
    Write-ColorLog "Stack trace: $($_.ScriptStackTrace)" "Red"
    exit 1
}
