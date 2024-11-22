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

// Variabili globali per i grafici
let visitsChart = null;
let timeDistributionChart = null;

// Inizializzazione
document.addEventListener('DOMContentLoaded', initializePage);

// Funzione per inizializzare la pagina
function initializePage() {
    // Controlla se siamo nella pagina principale
    if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
        setupForm();
        setupTimer();
        setupMotionDetection();
    }
    // Se siamo nella pagina delle statistiche
    else if (window.location.pathname.includes('statistics.html')) {
        displayRecords();
        updateStatistics();
    }
    // Se siamo nella pagina dei grafici
    else if (window.location.pathname.includes('charts.html')) {
        initializeCharts();
    }
}

// Gestione del form
async function handleFormSubmit(event) {
    event.preventDefault();
    
    // Raccogli i dati dal form
    const formData = {
        date: document.getElementById('date').value,
        time: document.getElementById('time').value,
        duration: document.getElementById('duration').value,
        rating: document.getElementById('rating').value,
        mood: document.getElementById('mood').value,
        notes: document.getElementById('notes').value
    };
    
    // Salva i dati
    saveRecord(formData);
    
    // Resetta il form e il timer
    event.target.reset();
    resetTimer();
    
    // Mostra conferma
    showNotification('Record salvato con successo!');
}

// Salvataggio dei dati
function saveRecord(data) {
    try {
        // Carica i record esistenti
        let records = JSON.parse(localStorage.getItem('poopRecords') || '[]');
        
        // Aggiungi il nuovo record
        records.push(data);
        
        // Salva i record aggiornati
        localStorage.setItem('poopRecords', JSON.stringify(records));
        
        console.log('Record salvato:', data);
        return true;
    } catch (error) {
        console.error('Errore nel salvataggio del record:', error);
        return false;
    }
}

// Visualizzazione dei record
function displayRecords() {
    const recordsContainer = document.querySelector('.records-container');
    if (!recordsContainer) {
        console.error('Container dei record non trovato');
        return;
    }

    // Carica i record
    const records = JSON.parse(localStorage.getItem('poopRecords') || '[]');
    
    if (records.length === 0) {
        recordsContainer.innerHTML = '<p class="no-records">Nessun record trovato</p>';
        return;
    }

    // Ordina i record per data e ora (più recenti prima)
    records.sort((a, b) => {
        const dateA = new Date(a.date + 'T' + a.time);
        const dateB = new Date(b.date + 'T' + b.time);
        return dateB - dateA;
    });

    // Genera l'HTML per i record
    const recordsHTML = records.map(record => {
        const date = new Date(record.date + 'T' + record.time);
        const formattedDate = date.toLocaleDateString('it-IT', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div class="record-card">
                <div class="record-header">
                    <span class="record-date">${formattedDate}</span>
                    <span class="record-duration">${record.duration} min</span>
                </div>
                <div class="record-body">
                    <span class="record-rating">${'⭐'.repeat(parseInt(record.rating))}</span>
                    <span class="record-mood">${record.mood}</span>
                </div>
                ${record.notes ? `<div class="record-notes">${record.notes}</div>` : ''}
            </div>
        `;
    }).join('');

    recordsContainer.innerHTML = recordsHTML;
}

// Funzione per ottenere i dati delle visite
function getVisitsData() {
    const records = JSON.parse(localStorage.getItem('poopRecords') || '[]');
    
    // Crea un array di date degli ultimi 7 giorni
    const dates = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
    }
    
    // Conta le visite per ogni giorno
    const visitsByDay = {};
    dates.forEach(date => {
        visitsByDay[date] = records.filter(record => record.date === date).length;
    });
    
    return {
        labels: dates.map(date => {
            const d = new Date(date);
            return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' });
        }),
        data: Object.values(visitsByDay)
    };
}

// Funzione per ottenere la distribuzione oraria
function getTimeDistribution() {
    const records = JSON.parse(localStorage.getItem('poopRecords') || '[]');
    
    // Inizializza array per le 24 ore
    const hourlyDistribution = new Array(24).fill(0);
    
    // Conta le visite per ogni ora
    records.forEach(record => {
        const hour = parseInt(record.time.split(':')[0]);
        hourlyDistribution[hour]++;
    });
    
    return {
        labels: Array.from({length: 24}, (_, i) => `${i.toString().padStart(2, '0')}:00`),
        data: hourlyDistribution
    };
}

// Aggiorna le statistiche
function updateStatistics() {
    const records = JSON.parse(localStorage.getItem('poopRecords') || '[]');
    
    // Elementi delle statistiche
    const totalVisitsEl = document.getElementById('totalVisits');
    const dailyAverageEl = document.getElementById('dailyAverage');
    const averageDurationEl = document.getElementById('averageDuration');
    const averageRatingEl = document.getElementById('averageRating');
    
    if (!totalVisitsEl || !dailyAverageEl || !averageDurationEl || !averageRatingEl) {
        console.error('Elementi delle statistiche non trovati');
        return;
    }
    
    if (records.length === 0) {
        totalVisitsEl.textContent = '0';
        dailyAverageEl.textContent = '0';
        averageDurationEl.textContent = '0 min';
        averageRatingEl.textContent = '0 ⭐';
        return;
    }
    
    // Calcola le statistiche
    const totalVisits = records.length;
    
    // Calcola la media giornaliera
    const dates = new Set(records.map(r => r.date));
    const dailyAverage = (totalVisits / dates.size).toFixed(1);
    
    // Calcola la durata media
    const totalDuration = records.reduce((sum, r) => sum + parseInt(r.duration || 0), 0);
    const averageDuration = (totalDuration / totalVisits).toFixed(1);
    
    // Calcola la valutazione media
    const totalRating = records.reduce((sum, r) => sum + parseInt(r.rating || 0), 0);
    const averageRating = (totalRating / totalVisits).toFixed(1);
    
    // Aggiorna l'interfaccia
    totalVisitsEl.textContent = totalVisits;
    dailyAverageEl.textContent = dailyAverage;
    averageDurationEl.textContent = `${averageDuration} min`;
    averageRatingEl.textContent = `${averageRating} ⭐`;
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

requestMotionPermission();

// Funzione per inizializzare i grafici
function initializeCharts() {
    // Controlla se siamo nella pagina dei grafici
    if (!window.location.pathname.includes('charts.html')) {
        return;
    }

    // Recupera i record
    const records = JSON.parse(localStorage.getItem('poopRecords') || '[]');
    if (records.length === 0) {
        console.log('Nessun record trovato per i grafici');
        document.querySelector('.charts-container').innerHTML = '<p class="no-data">Nessun dato disponibile</p>';
        return;
    }

    // Distruggi i grafici esistenti se presenti
    if (window.visitsChart) visitsChart.destroy();
    if (window.timeDistributionChart) timeDistributionChart.destroy();
    if (window.ratingsChart) ratingsChart.destroy();
    if (window.durationChart) durationChart.destroy();

    // Grafico visite settimanali
    const visitsCtx = document.getElementById('visitsChart');
    if (visitsCtx) {
        const visits = getLastSevenDaysVisits();
        window.visitsChart = new Chart(visitsCtx, {
            type: 'bar',
            data: {
                labels: visits.labels,
                datasets: [{
                    label: 'Visite giornaliere',
                    data: visits.data,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    // Grafico distribuzione oraria
    const timeCtx = document.getElementById('timeDistributionChart');
    if (timeCtx) {
        const timeDistribution = getTimeDistribution();
        window.timeDistributionChart = new Chart(timeCtx, {
            type: 'line',
            data: {
                labels: Array.from({length: 24}, (_, i) => `${i}:00`),
                datasets: [{
                    label: 'Visite per ora',
                    data: timeDistribution,
                    fill: true,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    // Grafico valutazioni
    const ratingsCtx = document.getElementById('ratingsChart');
    if (ratingsCtx) {
        const ratings = getRatingsDistribution();
        window.ratingsChart = new Chart(ratingsCtx, {
            type: 'pie',
            data: {
                labels: ['⭐', '⭐⭐', '⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐⭐⭐'],
                datasets: [{
                    data: ratings,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(255, 159, 64, 0.6)',
                        'rgba(255, 205, 86, 0.6)',
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(54, 162, 235, 0.6)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Grafico durata media
    const durationCtx = document.getElementById('durationChart');
    if (durationCtx) {
        const durations = getAverageDurationByDay();
        window.durationChart = new Chart(durationCtx, {
            type: 'bar',
            data: {
                labels: ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'],
                datasets: [{
                    label: 'Durata media (minuti)',
                    data: durations,
                    backgroundColor: 'rgba(153, 102, 255, 0.6)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

// Funzioni helper per i dati dei grafici
function getLastSevenDaysVisits() {
    const records = JSON.parse(localStorage.getItem('poopRecords') || '[]');
    const last7Days = Array.from({length: 7}, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
    }).reverse();
    
    const counts = last7Days.map(date => 
        records.filter(r => r.date === date).length
    );
    
    return {
        labels: last7Days.map(date => {
            const d = new Date(date);
            return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' });
        }),
        data: counts
    };
}

function getTimeDistribution() {
    const records = JSON.parse(localStorage.getItem('poopRecords') || '[]');
    const distribution = Array(24).fill(0);
    
    records.forEach(record => {
        if (record.time) {
            const hour = parseInt(record.time.split(':')[0]);
            if (!isNaN(hour) && hour >= 0 && hour < 24) {
                distribution[hour]++;
            }
        }
    });
    
    return distribution;
}

function getRatingsDistribution() {
    const records = JSON.parse(localStorage.getItem('poopRecords') || '[]');
    const distribution = Array(5).fill(0);
    
    records.forEach(record => {
        const rating = parseInt(record.rating);
        if (!isNaN(rating) && rating >= 1 && rating <= 5) {
            distribution[rating - 1]++;
        }
    });
    
    return distribution;
}

function getAverageDurationByDay() {
    const records = JSON.parse(localStorage.getItem('poopRecords') || '[]');
    const durationsByDay = Array(7).fill(0).map(() => []);
    
    records.forEach(record => {
        if (record.date && record.duration) {
            const date = new Date(record.date);
            const day = date.getDay();
            const duration = parseInt(record.duration);
            if (!isNaN(duration) && duration >= 0) {
                durationsByDay[day].push(duration);
            }
        }
    });
    
    return durationsByDay.map(durations => {
        if (durations.length === 0) return 0;
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
        return Math.round(avg);
    });
}

// Inizializza la pagina quando il DOM è caricato
document.addEventListener('DOMContentLoaded', initializePage);