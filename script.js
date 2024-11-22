// Variabili globali per il rilevamento dello scuotimento
let isShaking = false;
let lastShake = 0;
let shakeCount = 0;
const SHAKE_THRESHOLD = 50;
const MIN_SHAKE_DURATION = 600;
const REQUIRED_SHAKES = 4;

// Consigli sulla salute
const healthTips = [
    "Bevi almeno 8 bicchieri d'acqua al giorno per una buona digestione",
    "Mangia più fibre per regolare il transito intestinale",
    "Fai attività fisica regolare per migliorare la digestione",
    "Mantieni orari regolari per i pasti",
    "Evita di trattenere lo stimolo quando arriva",
    "Mastica bene il cibo per facilitare la digestione",
    "Limita caffè e bevande gassate",
    "Includi yogurt e probiotici nella tua dieta"
];

// Elementi DOM
const shakeStatus = document.getElementById('shakeStatus');
const recordsContainer = document.getElementById('records');
const permissionPopup = document.getElementById('permissionPopup');
const grantPermissionBtn = document.getElementById('grantPermission');
const timerPopup = document.getElementById('timerPopup');
const timerDisplay = document.getElementById('timer');
const stopTimerBtn = document.getElementById('stopTimer');
const waterReminderBtn = document.getElementById('waterReminder');
const dailyTipElement = document.getElementById('dailyTip');

// Variabili per il timer
let timerInterval;
let startTime;
let isTimerRunning = false;

// Variabili per i grafici
let visitsChart;
let timeDistributionChart;

// Inizializzazione
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    loadRecords();
    updateStatistics();
    showRandomHealthTip();
});

function initializeApp() {
    // Inizializza i grafici
    setupCharts();
    
    // Mostra un consiglio casuale
    showRandomHealthTip();
    
    // Controlla se le notifiche sono supportate
    if ('Notification' in window) {
        if (Notification.permission === 'granted') {
            setupWaterReminder();
        }
    }
}

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
    
    const formData = {
        date: document.getElementById('date').value,
        time: document.getElementById('time').value,
        duration: document.getElementById('duration').value,
        rating: document.getElementById('rating').value,
        mood: document.getElementById('mood').value,
        notes: document.getElementById('notes').value
    };
    
    saveRecord(formData);
    updateStatistics();
    showNotification('Visita registrata con successo! 🎉');
    
    // Reset form
    this.reset();
    document.getElementById('rating').value = '3';
    document.getElementById('mood').value = '😊';
});

// Gestione delle stelle di valutazione
document.querySelectorAll('.star').forEach(star => {
    star.addEventListener('click', function() {
        const rating = this.dataset.rating;
        document.getElementById('rating').value = rating;
        
        // Aggiorna le stelle attive
        document.querySelectorAll('.star').forEach(s => {
            s.classList.toggle('active', s.dataset.rating <= rating);
        });
    });
});

// Gestione delle emoji dello stato d'animo
document.querySelectorAll('.mood').forEach(mood => {
    mood.addEventListener('click', function() {
        const selectedMood = this.dataset.mood;
        document.getElementById('mood').value = selectedMood;
        
        // Aggiorna l'emoji attiva
        document.querySelectorAll('.mood').forEach(m => {
            m.classList.toggle('active', m.dataset.mood === selectedMood);
        });
    });
});

// Gestione del timer
function startTimer() {
    if (!isTimerRunning) {
        isTimerRunning = true;
        startTime = Date.now();
        timerPopup.style.display = 'flex';
        
        timerInterval = setInterval(() => {
            const elapsedTime = Date.now() - startTime;
            const minutes = Math.floor(elapsedTime / 60000);
            const seconds = Math.floor((elapsedTime % 60000) / 1000);
            
            timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }
}

function saveRecord(formData) {
    const records = JSON.parse(localStorage.getItem('poopRecords') || '[]');
    records.push(formData);
    localStorage.setItem('poopRecords', JSON.stringify(records));
    displayRecords();
}

function displayRecords() {
    const records = JSON.parse(localStorage.getItem('poopRecords') || '[]');
    recordsContainer.innerHTML = '';
    
    records.reverse().forEach(record => {
        const recordElement = document.createElement('div');
        recordElement.className = 'record-card';
        recordElement.innerHTML = `
            <div class="record-header">
                <span class="record-date">${record.date}</span>
                <span class="record-time">${record.time}</span>
            </div>
            <div class="record-details">
                <span class="record-duration">⏱️ ${record.duration} min</span>
                <span class="record-rating">⭐ ${record.rating}/5</span>
                <span class="record-mood">${record.mood}</span>
            </div>
            ${record.notes ? `<div class="record-notes">${record.notes}</div>` : ''}
        `;
        recordsContainer.appendChild(recordElement);
    });
    
    updateStatistics();
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

function setupEventListeners() {
    // Aggiungi event listener per il pulsante di stop del timer
    stopTimerBtn.addEventListener('click', stopTimer);
    
    // Aggiungi event listener per il pulsante di promemoria dell'acqua
    waterReminderBtn.addEventListener('click', setupWaterReminder);
}

function setupCharts() {
    // Inizializza i grafici
    visitsChart = new Chart(document.getElementById('visitsChart'), {
        type: 'bar',
        data: {
            labels: ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'],
            datasets: [{
                label: 'Visite',
                data: [0, 0, 0, 0, 0, 0, 0],
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true
                    }
                }]
            }
        }
    });
    
    timeDistributionChart = new Chart(document.getElementById('timeDistributionChart'), {
        type: 'pie',
        data: {
            labels: ['Mattina', 'Pomeriggio', 'Sera'],
            datasets: [{
                label: 'Distribuzione del tempo',
                data: [0, 0, 0],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.2)',
                    'rgba(54, 162, 235, 0.2)',
                    'rgba(255, 206, 86, 0.2)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            title: {
                display: true,
                text: 'Distribuzione del tempo'
            }
        }
    });
}

function updateStatistics() {
    // Aggiorna le statistiche
    const records = JSON.parse(localStorage.getItem('poopRecords') || '[]');
    const visits = records.length;
    const timeDistribution = {
        mattina: 0,
        pomeriggio: 0,
        sera: 0
    };
    
    records.forEach(record => {
        const date = new Date(`${record.date}T${record.time}`);
        const hour = date.getHours();
        
        if (hour >= 6 && hour < 12) {
            timeDistribution.mattina++;
        } else if (hour >= 12 && hour < 18) {
            timeDistribution.pomeriggio++;
        } else {
            timeDistribution.sera++;
        }
    });
    
    visitsChart.data.datasets[0].data = [visits];
    timeDistributionChart.data.datasets[0].data = [timeDistribution.mattina, timeDistribution.pomeriggio, timeDistribution.sera];
    
    visitsChart.update();
    timeDistributionChart.update();
}

function showRandomHealthTip() {
    // Mostra un consiglio casuale
    const randomIndex = Math.floor(Math.random() * healthTips.length);
    dailyTipElement.textContent = healthTips[randomIndex];
}

function setupWaterReminder() {
    // Imposta il promemoria dell'acqua
    if ('Notification' in window) {
        if (Notification.permission === 'granted') {
            const notification = new Notification('Bevi acqua! 💧');
            notification.onclick = function() {
                window.open('https://www.example.com/bevi-acqua', '_blank');
            };
        }
    }
}

function stopTimer() {
    // Ferma il timer
    clearInterval(timerInterval);
    isTimerRunning = false;
}

requestMotionPermission();