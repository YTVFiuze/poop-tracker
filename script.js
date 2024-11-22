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
    // Carica i dati salvati
    const records = loadRecords();
    
    // Inizializza l'app in base alla pagina corrente
    initializeApp();
    
    // Setup degli event listeners
    setupEventListeners();
    
    // Setup del form se siamo nella home
    if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/')) {
        setupForm();
        showRandomHealthTip();
    }
    
    // Setup delle statistiche se siamo nella pagina statistiche
    if (window.location.pathname.includes('statistics.html')) {
        displayRecords(records);
        updateStatistics(records);
        setupCharts();
    }
});

function initializeApp() {
    // Inizializza i grafici solo se siamo nella pagina statistiche
    if (window.location.pathname.includes('statistics.html')) {
        setupCharts();
    }
    
    // Mostra un consiglio casuale solo nella home
    if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/')) {
        showRandomHealthTip();
    }
    
    // Controlla se le notifiche sono supportate
    if ('Notification' in window) {
        if (Notification.permission === 'granted') {
            setupWaterReminder();
        }
    }
}

// Caricamento dei record
function loadRecords() {
    // Carica i record dal localStorage
    const records = JSON.parse(localStorage.getItem('poopRecords') || '[]');
    
    // Se siamo nella pagina statistiche, mostra i record
    if (window.location.pathname.includes('statistics.html')) {
        displayRecords(records);
        updateStatistics(records);
    }
    
    return records;
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

// Funzione per salvare un record
function saveRecord(formData) {
    // Carica i record esistenti
    const records = JSON.parse(localStorage.getItem('poopRecords') || '[]');
    
    // Aggiungi il nuovo record
    records.push(formData);
    
    // Salva nel localStorage
    localStorage.setItem('poopRecords', JSON.stringify(records));
    
    // Aggiorna l'interfaccia se siamo nella pagina statistiche
    if (window.location.pathname.includes('statistics.html')) {
        displayRecords();
        updateStatistics();
    }
}

// Funzione per visualizzare i record
function displayRecords() {
    const recordsContainer = document.getElementById('records');
    if (!recordsContainer) return;

    // Carica i record dal localStorage
    const records = JSON.parse(localStorage.getItem('poopRecords') || '[]');
    
    // Ordina i record per data e ora (più recenti prima)
    records.sort((a, b) => {
        const dateA = new Date(a.date + 'T' + a.time);
        const dateB = new Date(b.date + 'T' + b.time);
        return dateB - dateA;
    });

    // Crea l'HTML per i record
    const recordsHTML = records.map(record => {
        // Formatta la data
        const date = new Date(record.date + 'T' + record.time);
        const formattedDate = date.toLocaleDateString('it-IT', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Crea le stelle
        const stars = '⭐'.repeat(parseInt(record.rating));

        return `
            <div class="record-card">
                <div class="record-header">
                    <span class="record-date">${formattedDate}</span>
                    <span class="record-duration">${record.duration} min</span>
                </div>
                <div class="record-body">
                    <span class="record-rating">${stars}</span>
                    <span class="record-mood">${record.mood}</span>
                </div>
                ${record.notes ? `<div class="record-notes">${record.notes}</div>` : ''}
            </div>
        `;
    }).join('');

    // Aggiorna il contenitore
    recordsContainer.innerHTML = recordsHTML || '<p>Nessuna visita registrata</p>';
}

// Gestione del form
function setupForm() {
    const form = document.getElementById('poopForm');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Imposta data e ora correnti se non specificate
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        const currentTime = now.toTimeString().slice(0, 5);

        // Raccogli i dati dal form con controlli
        const dateInput = document.getElementById('date');
        const timeInput = document.getElementById('time');
        const durationInput = document.getElementById('duration');
        const ratingInput = document.getElementById('rating');
        const moodInput = document.getElementById('mood');
        const notesInput = document.getElementById('notes');

        const formData = {
            date: dateInput ? dateInput.value || currentDate : currentDate,
            time: timeInput ? timeInput.value || currentTime : currentTime,
            duration: durationInput ? durationInput.value || '0' : '0',
            rating: ratingInput ? ratingInput.value || '3' : '3',
            mood: moodInput ? moodInput.value || '😊' : '😊',
            notes: notesInput ? notesInput.value || '' : ''
        };

        // Salva i dati
        saveRecord(formData);
        
        // Mostra notifica
        showNotification('Visita registrata con successo! 🎉');
        
        // Reset form
        form.reset();
        
        // Reset inputs nascosti
        if (ratingInput) ratingInput.value = '3';
        if (moodInput) moodInput.value = '😊';
        
        // Reset stelle
        document.querySelectorAll('.star').forEach(s => {
            s.classList.toggle('active', s.dataset.rating <= 3);
        });
        
        // Reset emoji
        document.querySelectorAll('.mood').forEach(m => {
            m.classList.toggle('active', m.dataset.mood === '😊');
        });
        
        // Se il timer è attivo, fermalo
        if (isTimerRunning) {
            stopTimer();
        }
    });
}

// Gestione del timer
function startTimer() {
    if (!isTimerRunning) {
        isTimerRunning = true;
        startTime = Date.now();
        
        // Mostra il popup del timer
        if (timerPopup) {
            timerPopup.style.display = 'flex';
            timerPopup.style.opacity = '1';
            
            // Aggiungi event listener al pulsante stop
            if (stopTimerBtn) {
                stopTimerBtn.onclick = stopTimer;
                stopTimerBtn.disabled = false;
            }
        }
        
        // Imposta il valore iniziale del timer
        const durationInput = document.getElementById('duration');
        if (durationInput) {
            durationInput.value = '0';
        }
        
        // Aggiorna immediatamente il display
        updateTimerDisplay();
        
        // Avvia l'aggiornamento periodico
        timerInterval = setInterval(updateTimerDisplay, 1000);
    }
}

function updateTimerDisplay() {
    if (!isTimerRunning || !startTime) return;

    const elapsedTime = Date.now() - startTime;
    const minutes = Math.floor(elapsedTime / 60000);
    const seconds = Math.floor((elapsedTime % 60000) / 1000);
    
    // Aggiorna il display del timer
    if (timerDisplay) {
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // Aggiorna il campo durata
    const durationInput = document.getElementById('duration');
    if (durationInput) {
        durationInput.value = minutes.toString();
    }
}

function stopTimer() {
    if (!isTimerRunning) return;
    console.log('Stopping timer...');

    // Ferma il timer
    clearInterval(timerInterval);
    isTimerRunning = false;
    
    // Calcola la durata finale
    const elapsedMinutes = Math.floor((Date.now() - startTime) / 60000);
    
    // Aggiorna il campo durata
    const durationInput = document.getElementById('duration');
    if (durationInput) {
        durationInput.value = elapsedMinutes.toString();
    }
    
    // Nascondi il popup con una transizione
    if (timerPopup) {
        timerPopup.style.opacity = '0';
        setTimeout(() => {
            timerPopup.style.display = 'none';
            timerPopup.style.opacity = '1';
            
            // Rimuovi event listener dal pulsante stop
            if (stopTimerBtn) {
                stopTimerBtn.onclick = null;
                stopTimerBtn.disabled = true;
            }
        }, 300);
    }
    
    // Reset delle variabili
    startTime = null;
    timerInterval = null;
}

// Gestione delle notifiche
function showNotification(message) {
    if (!('Notification' in window)) return;
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animazione di fade-in
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Rimuovi dopo 3 secondi
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Setup degli event listeners
function setupEventListeners() {
    // Setup delle stelle di valutazione
    const stars = document.querySelectorAll('.star');
    if (stars.length > 0) {
        stars.forEach(star => {
            star.addEventListener('click', function() {
                const rating = this.dataset.rating;
                const ratingInput = document.getElementById('rating');
                if (ratingInput) {
                    ratingInput.value = rating;
                }
                
                // Aggiorna le stelle attive
                stars.forEach(s => {
                    s.classList.toggle('active', s.dataset.rating <= rating);
                });
            });
        });
    }

    // Setup delle emoji dello stato d'animo
    const moods = document.querySelectorAll('.mood');
    if (moods.length > 0) {
        moods.forEach(mood => {
            mood.addEventListener('click', function() {
                const selectedMood = this.dataset.mood;
                const moodInput = document.getElementById('mood');
                if (moodInput) {
                    moodInput.value = selectedMood;
                }
                
                // Aggiorna l'emoji attiva
                moods.forEach(m => {
                    m.classList.toggle('active', m.dataset.mood === selectedMood);
                });
            });
        });
    }

    // Setup del pulsante stop timer
    if (stopTimerBtn) {
        stopTimerBtn.addEventListener('click', stopTimer);
    }

    // Setup del promemoria acqua
    if (waterReminderBtn) {
        waterReminderBtn.addEventListener('click', setupWaterReminder);
    }
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
    const visitsCtx = document.getElementById('visitsChart')?.getContext('2d');
    const timeCtx = document.getElementById('timeDistributionChart')?.getContext('2d');
    
    if (!visitsCtx || !timeCtx) return;

    // Colori del tema
    const colors = {
        primary: '#6C63FF',
        secondary: '#FF6B6B',
        tertiary: '#4ECDC4',
        background: 'rgba(255, 255, 255, 0.1)',
        text: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim()
    };

    // Configurazione comune per i grafici
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: {
                display: true,
                position: 'top',
                labels: {
                    usePointStyle: true,
                    pointStyle: 'circle',
                    padding: 15,
                    font: {
                        size: window.innerWidth < 768 ? 11 : 13,
                        family: "'Poppins', sans-serif",
                        weight: '500'
                    }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleFont: {
                    size: 14,
                    family: "'Poppins', sans-serif",
                    weight: '600'
                },
                bodyFont: {
                    size: 13,
                    family: "'Poppins', sans-serif"
                },
                padding: 12,
                cornerRadius: 8,
                displayColors: false
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)',
                    drawBorder: false
                },
                ticks: {
                    font: {
                        size: window.innerWidth < 768 ? 11 : 12,
                        family: "'Poppins', sans-serif"
                    },
                    padding: 8,
                    color: colors.text
                }
            },
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    font: {
                        size: window.innerWidth < 768 ? 11 : 12,
                        family: "'Poppins', sans-serif"
                    },
                    padding: 8,
                    color: colors.text
                }
            }
        }
    };

    // Grafico visite per giorno
    const visitsData = getVisitsData();
    if (visitsChart) visitsChart.destroy();
    visitsChart = new Chart(visitsCtx, {
        type: 'bar',
        data: {
            labels: visitsData.labels,
            datasets: [{
                label: 'Visite',
                data: visitsData.data,
                backgroundColor: [
                    'rgba(108, 99, 255, 0.7)',
                    'rgba(255, 107, 107, 0.7)',
                    'rgba(78, 205, 196, 0.7)',
                    'rgba(255, 180, 95, 0.7)',
                    'rgba(131, 96, 195, 0.7)',
                    'rgba(87, 190, 177, 0.7)',
                    'rgba(255, 145, 144, 0.7)'
                ],
                borderColor: [
                    'rgb(108, 99, 255)',
                    'rgb(255, 107, 107)',
                    'rgb(78, 205, 196)',
                    'rgb(255, 180, 95)',
                    'rgb(131, 96, 195)',
                    'rgb(87, 190, 177)',
                    'rgb(255, 145, 144)'
                ],
                borderWidth: 2,
                borderRadius: 8,
                maxBarThickness: 40
            }]
        },
        options: {
            ...commonOptions,
            plugins: {
                ...commonOptions.plugins,
                tooltip: {
                    ...commonOptions.plugins.tooltip,
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y} visite`;
                        }
                    }
                }
            },
            scales: {
                ...commonOptions.scales,
                y: {
                    ...commonOptions.scales.y,
                    ticks: {
                        ...commonOptions.scales.y.ticks,
                        stepSize: 1
                    }
                }
            }
        }
    });

    // Grafico distribuzione oraria
    const timeData = getTimeDistribution();
    if (timeDistributionChart) timeDistributionChart.destroy();
    timeDistributionChart = new Chart(timeCtx, {
        type: 'doughnut',
        data: {
            labels: timeData.labels,
            datasets: [{
                data: timeData.data,
                backgroundColor: [
                    'rgba(108, 99, 255, 0.8)',
                    'rgba(255, 107, 107, 0.8)',
                    'rgba(78, 205, 196, 0.8)'
                ],
                borderColor: [
                    'rgb(108, 99, 255)',
                    'rgb(255, 107, 107)',
                    'rgb(78, 205, 196)'
                ],
                borderWidth: 2,
                hoverOffset: 15
            }]
        },
        options: {
            ...commonOptions,
            cutout: '60%',
            radius: '90%',
            plugins: {
                ...commonOptions.plugins,
                tooltip: {
                    ...commonOptions.plugins.tooltip,
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed} visite`;
                        }
                    }
                }
            }
        }
    });
}

// Aggiorna i grafici quando la finestra viene ridimensionata
window.addEventListener('resize', debounce(() => {
    setupCharts();
}, 250));

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function getVisitsData() {
    const records = JSON.parse(localStorage.getItem('poopRecords') || '[]');
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
    
    return {
        labels: ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'],
        data: visitsByDay
    };
}

function getTimeDistribution() {
    const records = JSON.parse(localStorage.getItem('poopRecords') || '[]');
    const timeDistribution = [0, 0, 0]; // mattina, pomeriggio, sera
    records.forEach(record => {
        const hour = parseInt(record.time.split(':')[0]);
        if (hour >= 6 && hour < 12) timeDistribution[0]++;
        else if (hour >= 12 && hour < 18) timeDistribution[1]++;
        else timeDistribution[2]++;
    });
    
    return {
        labels: ['Mattina (6-12)', 'Pomeriggio (12-18)', 'Sera (18-6)'],
        data: timeDistribution
    };
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
    const visitsData = getVisitsData();
    visitsChart.data.datasets[0].data = visitsData.data;
    visitsChart.update();
    
    // Aggiorna grafico distribuzione oraria
    const timeData = getTimeDistribution();
    timeDistributionChart.data.datasets[0].data = timeData.data;
    timeDistributionChart.update();
}

function showRandomHealthTip() {
    // Mostra un consiglio casuale
    const randomIndex = Math.floor(Math.random() * healthTips.length);
    dailyTipElement.textContent = healthTips[randomIndex];
}

requestMotionPermission();