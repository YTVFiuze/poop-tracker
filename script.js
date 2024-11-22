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
    let lastX = 0;
    let lastY = 0;
    let lastZ = 0;
    let lastUpdate = 0;
    const shakeThreshold = 15; // Sensibilità dello scuotimento
    let isShaking = false;
    let shakeTimeout;
    
    // Richiedi il permesso per l'accelerometro
    function requestDeviceMotion() {
        if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
            // iOS 13+ richiede un permesso esplicito
            DeviceMotionEvent.requestPermission()
                .then(response => {
                    if (response === 'granted') {
                        window.addEventListener('devicemotion', handleShake);
                    } else {
                        alert('Abbiamo bisogno del permesso per l\'accelerometro per rilevare lo scuotimento!');
                    }
                })
                .catch(error => {
                    alert('Errore nel richiedere il permesso per l\'accelerometro: ' + error);
                });
        } else {
            // Android e vecchi iOS
            try {
                window.addEventListener('devicemotion', handleShake);
            } catch (e) {
                alert('Il tuo dispositivo potrebbe non supportare l\'accelerometro');
            }
        }
    }

    // Aggiungi pulsante per richiedere il permesso su iOS
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        const button = document.createElement('button');
        button.className = 'btn';
        button.style.marginTop = '1rem';
        button.textContent = 'Abilita Rilevamento Scuotimento';
        button.addEventListener('click', requestDeviceMotion);
        document.querySelector('.shake-instructions').appendChild(button);
    } else {
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
            <p class="record-date">📅 ${formatDate(record.date)} - ⏰ ${record.time}</p>
            ${record.notes ? `<p class="record-notes">📝 ${record.notes}</p>` : ''}
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
    const current = event.accelerationIncludingGravity;
    const currentTime = new Date().getTime();
    const timeDiff = currentTime - lastUpdate;

    if (timeDiff > 100) {
        const deltaX = Math.abs(current.x - lastX);
        const deltaY = Math.abs(current.y - lastY);
        const deltaZ = Math.abs(current.z - lastZ);

        if (!isShaking && (deltaX > shakeThreshold || deltaY > shakeThreshold || deltaZ > shakeThreshold)) {
            isShaking = true;
            const shakeStatus = document.getElementById('shake-status');
            shakeStatus.textContent = '🚽 Registrazione in corso...';
            shakeStatus.classList.add('active');

            // Registra automaticamente un nuovo record
            const now = new Date();
            const date = now.toISOString().split('T')[0];
            const time = now.toTimeString().slice(0,5);
            
            addRecord(date, time, 'Registrato via scuotimento');
            displayRecords();

            // Mostra conferma
            setTimeout(() => {
                alert('Record salvato con successo! 🚽');
                shakeStatus.textContent = 'In attesa...';
                shakeStatus.classList.remove('active');
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