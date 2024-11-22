// Carica i record salvati dal localStorage quando la pagina si carica
document.addEventListener('DOMContentLoaded', () => {
    displayRecords();
    
    // Imposta la data di oggi come default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    
    // Imposta l'ora corrente come default
    const now = new Date().toTimeString().slice(0,5);
    document.getElementById('time').value = now;
    
    // Variabili per il rilevamento dello scuotimento
    let lastX = null;
    let lastY = null;
    let lastZ = null;
    let lastUpdate = 0;
    const shakeThreshold = 10; // Ridotto per maggiore sensibilità
    let isShaking = false;
    let shakeTimeout;
    let debugMode = true; // Per vedere i valori dell'accelerometro

    // Richiedi il permesso per l'accelerometro
    async function requestDeviceMotion() {
        const shakeStatus = document.getElementById('shake-status');
        
        try {
            if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
                // iOS 13+ richiede un permesso esplicito
                const response = await DeviceMotionEvent.requestPermission();
                if (response === 'granted') {
                    window.addEventListener('devicemotion', handleShake);
                    shakeStatus.textContent = 'Rilevamento attivo ';
                    shakeStatus.classList.add('active');
                    return true;
                } else {
                    shakeStatus.textContent = 'Permesso negato ';
                    alert('Per favore abilita l\'accelerometro per usare l\'app!');
                    return false;
                }
            } else {
                // Android e vecchi iOS
                window.addEventListener('devicemotion', handleShake);
                shakeStatus.textContent = 'Rilevamento attivo ';
                shakeStatus.classList.add('active');
                return true;
            }
        } catch (error) {
            shakeStatus.textContent = 'Errore ';
            console.error('Errore accelerometro:', error);
            return false;
        }
    }

    // Mostra un popup per richiedere i permessi
    function showPermissionPopup() {
        const popup = document.createElement('div');
        popup.className = 'permission-popup';
        popup.innerHTML = `
            <div class="popup-content">
                <h3> Benvenuto!</h3>
                <p>Per utilizzare l'app, abbiamo bisogno del permesso per l'accelerometro.</p>
                <button id="grantPermission" class="btn">Abilita Rilevamento</button>
            </div>
        `;
        document.body.appendChild(popup);

        // Aggiungi stile per il popup
        const style = document.createElement('style');
        style.textContent = `
            .permission-popup {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            }
            .popup-content {
                background: white;
                padding: 2rem;
                border-radius: 10px;
                text-align: center;
                max-width: 90%;
                width: 400px;
            }
            .popup-content h3 {
                margin-bottom: 1rem;
            }
            .popup-content p {
                margin-bottom: 1.5rem;
            }
        `;
        document.head.appendChild(style);

        // Gestisci il click sul pulsante
        document.getElementById('grantPermission').addEventListener('click', async () => {
            const granted = await requestDeviceMotion();
            if (granted) {
                popup.remove();
            }
        });
    }

    // Aggiungi pulsante debug
    const shakeInstructions = document.querySelector('.shake-instructions');
    
    const debugButton = document.createElement('button');
    debugButton.className = 'btn debug-btn';
    debugButton.style.marginTop = '1rem';
    debugButton.style.marginRight = '1rem';
    debugButton.textContent = 'Debug Mode';
    debugButton.addEventListener('click', () => {
        debugMode = !debugMode;
        debugButton.textContent = debugMode ? 'Disattiva Debug' : 'Attiva Debug';
    });
    shakeInstructions.appendChild(debugButton);

    // Richiedi immediatamente i permessi
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        // Su iOS mostra il popup
        showPermissionPopup();
    } else {
        // Su Android avvia direttamente
        requestDeviceMotion();
    }
});

// Gestisce l'invio del form
document.getElementById('poopForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;
    const notes = document.getElementById('notes').value;
    
    addRecord(date, time, notes);
    displayRecords();
    
    // Reset form
    document.getElementById('notes').value = '';
    
    // Mostra conferma
    alert('Record salvato con successo!');
});

// Aggiunge un nuovo record
function addRecord(date, time, notes) {
    const records = getRecords();
    records.push({
        date,
        time,
        notes,
        timestamp: new Date().getTime()
    });
    
    // Ordina i record per data e ora
    records.sort((a, b) => {
        const dateA = new Date(a.date + 'T' + a.time);
        const dateB = new Date(b.date + 'T' + b.time);
        return dateB - dateA;
    });
    
    localStorage.setItem('poopRecords', JSON.stringify(records));
}

// Recupera tutti i record
function getRecords() {
    const records = localStorage.getItem('poopRecords');
    return records ? JSON.parse(records) : [];
}

// Mostra i record nella pagina
function displayRecords() {
    const recordsList = document.getElementById('recordsList');
    const records = getRecords();
    
    if (records.length === 0) {
        recordsList.innerHTML = '<p>Nessun record ancora...</p>';
        return;
    }
    
    recordsList.innerHTML = records.map(record => `
        <div class="record-item">
            <p class="record-date"> ${formatDate(record.date)} - ${record.time}</p>
            ${record.notes ? `<p class="record-notes"> ${record.notes}</p>` : ''}
        </div>
    `).join('');
}

// Formatta la data in formato italiano
function formatDate(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

// Gestisce l'evento di scuotimento
function handleShake(event) {
    const shakeStatus = document.getElementById('shake-status');
    if (!event.accelerationIncludingGravity) {
        shakeStatus.textContent = 'Accelerometro non disponibile ';
        return;
    }

    const current = event.accelerationIncludingGravity;
    const currentTime = new Date().getTime();
    const timeDiff = currentTime - lastUpdate;

    if (timeDiff > 100) { // Aggiorniamo ogni 100ms
        if (debugMode) {
            shakeStatus.textContent = `X: ${Math.round(current.x)} Y: ${Math.round(current.y)} Z: ${Math.round(current.z)}`;
        }

        if (lastX === null) {
            lastX = current.x;
            lastY = current.y;
            lastZ = current.z;
            lastUpdate = currentTime;
            return;
        }

        const deltaX = Math.abs(current.x - lastX);
        const deltaY = Math.abs(current.y - lastY);
        const deltaZ = Math.abs(current.z - lastZ);

        if (!isShaking && (deltaX > shakeThreshold || deltaY > shakeThreshold || deltaZ > shakeThreshold)) {
            isShaking = true;
            shakeStatus.textContent = ' Registrazione in corso...';
            shakeStatus.classList.add('active');

            // Vibra il telefono se supportato
            if ('vibrate' in navigator) {
                navigator.vibrate(200);
            }

            // Registra automaticamente un nuovo record
            const now = new Date();
            const date = now.toISOString().split('T')[0];
            const time = now.toTimeString().slice(0,5);
            
            addRecord(date, time, 'Registrato via scuotimento ');
            displayRecords();

            // Mostra conferma
            setTimeout(() => {
                alert('Record salvato con successo! ');
                shakeStatus.textContent = 'In attesa dello scuotimento...';
            }, 1000);

            // Reset dello stato di scuotimento dopo un po'
            clearTimeout(shakeTimeout);
            shakeTimeout = setTimeout(() => {
                isShaking = false;
            }, 1000);
        }

        lastX = current.x;
        lastY = current.y;
        lastZ = current.z;
        lastUpdate = currentTime;
    }
}