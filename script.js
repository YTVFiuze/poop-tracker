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
            updateShakeStatus('Movimento rilevato... ');
        } else if (now - lastShake > MIN_SHAKE_DURATION) {
            shakeCount++;
            lastShake = now;
            updateShakeStatus(`Movimento rilevato... ${shakeCount}/${REQUIRED_SHAKES} `);
            
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
    updateShakeStatus('In attesa di movimento... ');
}

function updateShakeStatus(message) {
    shakeStatus.textContent = message;
    shakeStatus.classList.toggle('active', isShaking);
}

// Gestione dello scuotimento
function handleShake() {
    if (!isTimerRunning) {
        startTimer();
    }
    showNotification('Registrazione iniziata! ');
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
    showNotification('Visita registrata con successo! ');
    
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
        
        // Imposta il valore iniziale del timer
        document.getElementById('duration').value = '0';
        
        timerInterval = setInterval(() => {
            const elapsedTime = Date.now() - startTime;
            const minutes = Math.floor(elapsedTime / 60000);
            const seconds = Math.floor((elapsedTime % 60000) / 1000);
            
            timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            document.getElementById('duration').value = minutes.toString();
        }, 1000);
    }
}

function stopTimer() {
    if (isTimerRunning) {
        clearInterval(timerInterval);
        isTimerRunning = false;
        timerPopup.style.display = 'none';
        
        const elapsedMinutes = Math.floor((Date.now() - startTime) / 60000);
        document.getElementById('duration').value = elapsedMinutes.toString();
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
    document.body.appendChild(notification);
    
    // Rimuovi la notifica dopo 3 secondi
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function setupEventListeners() {
    // Gestione del timer
    document.body.addEventListener('click', function(e) {
        if (e.target.matches('#stopTimer')) {
            stopTimer();
        }
    });
    
    // Gestione delle valutazioni
    document.querySelectorAll('.star').forEach(star => {
        star.addEventListener('click', function() {
            const rating = this.dataset.rating;
            document.getElementById('rating').value = rating;
            document.querySelectorAll('.star').forEach(s => {
                s.classList.toggle('active', s.dataset.rating <= rating);
            });
        });
    });

    // Gestione delle emoji
    document.querySelectorAll('.mood').forEach(mood => {
        mood.addEventListener('click', function() {
            const selectedMood = this.dataset.mood;
            document.getElementById('mood').value = selectedMood;
            document.querySelectorAll('.mood').forEach(m => {
                m.classList.toggle('active', m.dataset.mood === selectedMood);
            });
        });
    });
    
    // Gestione del promemoria acqua
    waterReminderBtn.addEventListener('click', async function() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                setupWaterReminder();
                showNotification('Promemoria acqua attivato! ');
            }
        }
    });
}

function setupWaterReminder() {
    // Imposta un promemoria ogni 2 ore
    setInterval(() => {
        if (Notification.permission === 'granted') {
            new Notification('Ricordati di bere! ', {
                body: 'Mantieniti idratato per una buona digestione',
                icon: '/favicon.ico'
            });
        }
    }, 7200000); // 2 ore in millisecondi
    
    // Mostra la prima notifica immediatamente
    new Notification('Promemoria acqua attivato! ', {
        body: 'Riceverai un promemoria ogni 2 ore',
        icon: '/favicon.ico'
    });
}

function setupCharts() {
    const ctx1 = document.getElementById('visitsChart').getContext('2d');
    const ctx2 = document.getElementById('timeDistributionChart').getContext('2d');
    
    Chart.defaults.font.family = "'Poppins', sans-serif";
    Chart.defaults.font.size = 14;
    Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--text-color');

    visitsChart = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'],
            datasets: [{
                label: 'Visite',
                data: [0, 0, 0, 0, 0, 0, 0],
                backgroundColor: 'rgba(108, 99, 255, 0.2)',
                borderColor: 'rgba(108, 99, 255, 1)',
                borderWidth: 2,
                borderRadius: 5,
                maxBarThickness: 50
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Visite negli ultimi 7 giorni',
                    padding: {
                        bottom: 30
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        precision: 0
                    },
                    grid: {
                        display: true,
                        drawBorder: false,
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
    
    timeDistributionChart = new Chart(ctx2, {
        type: 'doughnut',
        data: {
            labels: ['Mattina (6-12)', 'Pomeriggio (12-18)', 'Sera (18-6)'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: [
                    'rgba(108, 99, 255, 0.7)',
                    'rgba(76, 175, 80, 0.7)',
                    'rgba(255, 193, 7, 0.7)'
                ],
                borderColor: [
                    'rgba(108, 99, 255, 1)',
                    'rgba(76, 175, 80, 1)',
                    'rgba(255, 193, 7, 1)'
                ],
                borderWidth: 2,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                title: {
                    display: true,
                    text: 'Distribuzione oraria delle visite',
                    padding: {
                        bottom: 30
                    }
                }
            },
            cutout: '60%'
        }
    });
}

function updateStatistics() {
    const records = JSON.parse(localStorage.getItem('poopRecords') || '[]');
    
    // Aggiorna statistiche generali
    document.getElementById('totalVisits').textContent = records.length;
    
    // Calcola media giornaliera
    if (records.length > 0) {
        const dates = [...new Set(records.map(r => r.date))];
        const dailyAvg = (records.length / dates.length).toFixed(1);
        document.getElementById('dailyAverage').textContent = dailyAvg;
    }
    
    // Calcola durata media
    if (records.length > 0) {
        const avgDuration = (records.reduce((sum, r) => sum + parseInt(r.duration || 0), 0) / records.length).toFixed(1);
        document.getElementById('averageDuration').textContent = avgDuration + ' min';
    }
    
    // Calcola valutazione media
    if (records.length > 0) {
        const avgRating = (records.reduce((sum, r) => sum + parseInt(r.rating || 3), 0) / records.length).toFixed(1);
        document.getElementById('averageRating').textContent = avgRating + ' ';
    }
    
    // Aggiorna grafico visite per giorno
    const lastWeekRecords = records.filter(r => {
        const date = new Date(r.date);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return date >= weekAgo;
    });
    
    const visitsByDay = Array(7).fill(0);
    lastWeekRecords.forEach(record => {
        const date = new Date(record.date);
        const dayIndex = date.getDay();
        visitsByDay[dayIndex]++;
    });
    
    visitsChart.data.datasets[0].data = visitsByDay;
    visitsChart.update();
    
    // Aggiorna grafico distribuzione oraria
    const timeDistribution = [0, 0, 0]; // mattina, pomeriggio, sera
    records.forEach(record => {
        const hour = parseInt(record.time.split(':')[0]);
        if (hour >= 6 && hour < 12) timeDistribution[0]++;
        else if (hour >= 12 && hour < 18) timeDistribution[1]++;
        else timeDistribution[2]++;
    });
    
    timeDistributionChart.data.datasets[0].data = timeDistribution;
    timeDistributionChart.update();
}

function showRandomHealthTip() {
    // Mostra un consiglio casuale
    const randomIndex = Math.floor(Math.random() * healthTips.length);
    dailyTipElement.textContent = healthTips[randomIndex];
}

requestMotionPermission();