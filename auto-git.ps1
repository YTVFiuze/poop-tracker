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
        Write-ColorLog "Aggiunta delle modifiche..." "Yellow"
        git add .

        # Crea il messaggio di commit con i dettagli delle modifiche
        $changes = git status --porcelain | ForEach-Object {
            $_ -replace '^\s*[\?\w]\s+',''
        }
        $commitMessage = "Auto-commit: Modifiche a`n`n$($changes -join "`n")"
        
        # Esegui il commit
        Write-ColorLog "Esecuzione commit..." "Yellow"
        git commit -m $commitMessage

        # Prova a pushare con retry
        $maxRetries = 3
        $retryCount = 0
        $pushed = $false

        while (-not $pushed -and $retryCount -lt $maxRetries) {
            try {
                Write-ColorLog "Tentativo push $($retryCount + 1)/$maxRetries..." "Yellow"
                git push
                $pushed = $true
                Write-ColorLog "Push completato con successo!" "Green"
            }
            catch {
                $retryCount++
                if ($retryCount -lt $maxRetries) {
                    Write-ColorLog "Push fallito. Attendo 5 secondi prima di riprovare..." "Red"
                    Start-Sleep -Seconds 5
                }
                else {
                    throw "Push fallito dopo $maxRetries tentativi: $_"
                }
            }
        }
    }
    else {
        Write-ColorLog "Nessuna modifica rilevata" "Green"
    }
}
catch {
    Write-ColorLog "Errore: $_" "Red"
    Write-ColorLog $_.ScriptStackTrace "Red"
    exit 1
}
