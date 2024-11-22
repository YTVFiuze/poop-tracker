// Variabili globali per il rilevamento dello scuotimento
let isShaking = false;
let lastShake = 0;
let shakeCount = 0;
const SHAKE_THRESHOLD = 50;
const MIN_SHAKE_DURATION = 600;
const REQUIRED_SHAKES = 4;

// Elementi DOM
const shakeStatus = document.getElementById('shakeStatus');
const recordsContainer = document.getElementById('records');
const permissionPopup = document.getElementById('permissionPopup');
const grantPermissionBtn = document.getElementById('grantPermission');

// Gestione permessi
async function requestMotionPermission() {
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
            const permissionState = await DeviceMotionEvent.requestPermission();
            if (permissionState === 'granted') {
                permissionPopup.style.display = 'none';
                initializeMotionDetection();
            } else {
                showPermissionPopup();
            }
        } catch (error) {
            console.error('Errore nella richiesta dei permessi:', error);
            showPermissionPopup();
        }
    } else {
        initializeMotionDetection();
    }
}

function showPermissionPopup() {
    permissionPopup.style.display = 'flex';
}

grantPermissionBtn.addEventListener('click', requestMotionPermission);

// Inizializzazione rilevamento movimento
function initializeMotionDetection() {
    window.addEventListener('devicemotion', handleMotion);
    loadRecords();
}

// Gestione del movimento
function handleMotion(event) {
    const acceleration = event.acceleration;
    if (!acceleration) return;

    const totalAcceleration = Math.sqrt(
        Math.pow(acceleration.x || 0, 2) +
        Math.pow(acceleration.y || 0, 2) +
        Math.pow(acceleration.z || 0, 2)
    );

    const now = Date.now();
    
    if (totalAcceleration > SHAKE_THRESHOLD) {
        if (!isShaking) {
            isShaking = true;
            lastShake = now;
            shakeCount = 1;
            updateShakeStatus('Movimento rilevato... 🔄');
        } else if (now - lastShake > MIN_SHAKE_DURATION) {
            shakeCount++;
            lastShake = now;
            updateShakeStatus(`Movimento rilevato... ${shakeCount}/${REQUIRED_SHAKES} 🔄`);
            
            if (shakeCount >= REQUIRED_SHAKES) {
                handleShake();
                resetShakeDetection();
            }
        }
    } else if (now - lastShake > MIN_SHAKE_DURATION) {
        resetShakeDetection();
    }
}

function resetShakeDetection() {
    isShaking = false;
    shakeCount = 0;
    updateShakeStatus('In attesa di movimento... 🔍');
}

function updateShakeStatus(message) {
    shakeStatus.textContent = message;
    shakeStatus.classList.toggle('active', isShaking);
}

// Gestione dello scuotimento
function handleShake() {
    const now = new Date();
    const record = {
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().split(' ')[0],
        notes: 'Registrato automaticamente via scuotimento 📱'
    };
    
    saveRecord(record);
    navigator.vibrate(200);
    showNotification('Visita registrata! 💩');
}

// Gestione del form
document.getElementById('poopForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const record = {
        date: document.getElementById('date').value,
        time: document.getElementById('time').value,
        notes: document.getElementById('notes').value || 'Nessuna nota'
    };
    
    saveRecord(record);
    this.reset();
    showNotification('Visita registrata! 💩');
});

// Gestione dei record
function saveRecord(record) {
    let records = JSON.parse(localStorage.getItem('poopRecords') || '[]');
    records.unshift(record);
    localStorage.setItem('poopRecords', JSON.stringify(records));
    displayRecords();
}

function loadRecords() {
    displayRecords();
}

function displayRecords() {
    const records = JSON.parse(localStorage.getItem('poopRecords') || '[]');
    recordsContainer.innerHTML = '';
    
    records.forEach((record, index) => {
        const recordElement = document.createElement('div');
        recordElement.className = 'record-item';
        recordElement.style.animationDelay = `${index * 0.1}s`;
        
        const date = new Date(`${record.date}T${record.time}`);
        const formattedDate = date.toLocaleDateString('it-IT', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const formattedTime = date.toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        recordElement.innerHTML = `
            <div class="record-date">${formattedDate} alle ${formattedTime}</div>
            <div class="record-notes">${record.notes}</div>
        `;
        
        recordsContainer.appendChild(recordElement);
    });
}

// Notifiche
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--primary-color);
        color: white;
        padding: 15px 30px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideDown 0.3s ease-out, fadeOut 0.3s ease-out 2.7s forwards;
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Stili per le animazioni delle notifiche
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from { transform: translate(-50%, -100%); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
    }
    
    @keyframes fadeOut {
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);

// Inizializzazione
requestMotionPermission();