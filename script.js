// Costanti e configurazioni
const SHAKE_THRESHOLD = 50;
const MIN_SHAKE_DURATION = 600;
const REQUIRED_SHAKES = 4;

// Stato dell'applicazione
let isShaking = false;
let lastShake = 0;
let shakeCount = 0;
let timerInterval = null;
let startTime = null;
let charts = {
    visits: null,
    timeDistribution: null,
    ratings: null,
    duration: null
};

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

// Inizializzazione della pagina
document.addEventListener('DOMContentLoaded', () => {
    // Imposta la data di oggi nel form
    const dateInput = document.getElementById('date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }

    // Imposta l'ora attuale nel form
    const timeInput = document.getElementById('time');
    if (timeInput) {
        const now = new Date();
        timeInput.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }

    // Setup degli event listener
    setupEventListeners();

    // Inizializza i grafici se siamo nella pagina charts.html
    if (window.location.pathname.includes('charts.html')) {
        initializeCharts();
    }

    // Mostra un consiglio casuale
    const dailyTip = document.getElementById('dailyTip');
    if (dailyTip) {
        const randomTip = healthTips[Math.floor(Math.random() * healthTips.length)];
        dailyTip.textContent = randomTip;
    }
});

// Setup degli event listener
function setupEventListeners() {
    // Form di registrazione
    const form = document.getElementById('poopForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    // Stelle di valutazione
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        star.addEventListener('click', () => {
            const rating = parseInt(star.dataset.rating);
            document.getElementById('rating').value = rating;
            stars.forEach((s, index) => {
                s.style.opacity = index < rating ? '1' : '0.3';
            });
        });
    });

    // Emoji dello stato d'animo
    const moods = document.querySelectorAll('.mood');
    moods.forEach(mood => {
        mood.addEventListener('click', () => {
            moods.forEach(m => m.classList.remove('selected'));
            mood.classList.add('selected');
            document.getElementById('mood').value = mood.dataset.mood;
        });
    });

    // Timer
    const stopTimerBtn = document.getElementById('stopTimer');
    if (stopTimerBtn) {
        stopTimerBtn.addEventListener('click', stopTimer);
    }
}

// Gestione del form
async function handleFormSubmit(event) {
    event.preventDefault();

    try {
        const formData = {
            date: document.getElementById('date').value,
            time: document.getElementById('time').value,
            duration: parseInt(document.getElementById('duration').value) || 0,
            rating: parseInt(document.getElementById('rating').value) || 3,
            mood: document.getElementById('mood').value || '😊',
            notes: document.getElementById('notes').value.trim()
        };

        // Validazione data e ora
        if (!formData.date || !formData.time) {
            showNotification('Inserisci data e ora');
            return;
        }

        // Controlla che la data/ora non sia nel futuro
        const selectedDateTime = new Date(`${formData.date}T${formData.time}`);
        if (selectedDateTime > new Date()) {
            showNotification('Non puoi registrare visite future ⚠️');
            return;
        }

        if (await saveRecord(formData)) {
            // Reset completo del form
            resetForm();
            showNotification('Visita registrata con successo! 🚽');
        }
    } catch (error) {
        console.error('Errore durante il salvataggio:', error);
        showNotification('Errore durante il salvataggio ❌');
    }
}

// Reset del form
function resetForm() {
    const now = new Date();
    
    // Reset data
    const dateInput = document.getElementById('date');
    dateInput.value = now.toISOString().split('T')[0];
    
    // Reset ora
    const timeInput = document.getElementById('time');
    timeInput.value = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    
    // Reset durata
    const durationInput = document.getElementById('duration');
    durationInput.value = '0';
    
    // Reset valutazione
    const ratingInput = document.getElementById('rating');
    ratingInput.value = '3';
    document.querySelectorAll('.star').forEach((star, index) => {
        star.style.opacity = index < 3 ? '1' : '0.3';
    });
    
    // Reset stato d'animo
    const moodInput = document.getElementById('mood');
    moodInput.value = '😊';
    document.querySelectorAll('.mood').forEach(mood => {
        mood.classList.remove('selected');
        if (mood.dataset.mood === '😊') {
            mood.classList.add('selected');
        }
    });
    
    // Reset note
    const notesInput = document.getElementById('notes');
    notesInput.value = '';
}

// Salvataggio dei dati
async function saveRecord(formData) {
    try {
        let records = [];
        const stored = localStorage.getItem('poopRecords');
        
        if (stored) {
            try {
                records = JSON.parse(stored);
                if (!Array.isArray(records)) {
                    records = [];
                }
            } catch (e) {
                console.error('Errore nel parsing dei record:', e);
                records = [];
            }
        }

        const dateTime = new Date(`${formData.date}T${formData.time}`);
        
        // Validazione dei dati
        if (isNaN(dateTime.getTime())) {
            throw new Error('Data/ora non valida');
        }
        
        const newRecord = {
            id: Date.now(),
            date: dateTime.toISOString(),
            duration: Math.max(0, formData.duration || 0),
            rating: Math.min(5, Math.max(1, formData.rating || 3)),
            mood: formData.mood || '😊',
            notes: (formData.notes || '').trim()
        };

        records.unshift(newRecord);
        
        // Limita il numero di record memorizzati (opzionale)
        const MAX_RECORDS = 1000;
        if (records.length > MAX_RECORDS) {
            records = records.slice(0, MAX_RECORDS);
        }
        
        localStorage.setItem('poopRecords', JSON.stringify(records));
        return true;
    } catch (error) {
        console.error('Errore nel salvataggio:', error);
        throw error; // Propaga l'errore per gestirlo nel form
    }
}

// Inizializzazione dei grafici
function initializeCharts() {
    try {
        const records = JSON.parse(localStorage.getItem('poopRecords') || '[]');
        
        if (records.length === 0) {
            document.querySelector('.charts-container').innerHTML = 
                '<p class="no-data">Nessun dato disponibile. Aggiungi alcune visite per vedere le statistiche.</p>';
            return;
        }

        // Distruggi i grafici esistenti
        Object.values(charts).forEach(chart => {
            if (chart) chart.destroy();
        });

        // Grafico visite settimanali
        const visitsData = getLastSevenDaysVisits(records);
        charts.visits = createVisitsChart(visitsData);

        // Grafico distribuzione oraria
        const timeData = getTimeDistribution(records);
        charts.timeDistribution = createTimeDistributionChart(timeData);

        // Grafico valutazioni
        const ratingsData = getRatingsDistribution(records);
        charts.ratings = createRatingsChart(ratingsData);

        // Grafico durata media
        const durationData = getAverageDurationByDay(records);
        charts.duration = createDurationChart(durationData);
    } catch (error) {
        console.error('Errore nell\'inizializzazione dei grafici:', error);
        document.querySelector('.charts-container').innerHTML = 
            '<p class="error">Si è verificato un errore nel caricamento dei grafici. Riprova più tardi.</p>';
    }
}

// Aggiorna i grafici ogni 30 secondi se siamo nella pagina dei grafici
function setupChartUpdates() {
    if (window.location.pathname.includes('charts.html')) {
        initializeCharts();
        setInterval(initializeCharts, 30000); // Aggiorna ogni 30 secondi
    }
}

// Aggiorna le statistiche nella pagina statistics.html
function updateStatistics() {
    if (!window.location.pathname.includes('statistics.html')) return;

    try {
        const records = JSON.parse(localStorage.getItem('poopRecords') || '[]');
        
        // Visite totali
        document.getElementById('totalVisits').textContent = records.length;

        // Media giornaliera
        const now = new Date();
        const firstRecord = records.length > 0 ? new Date(records[records.length - 1].date) : now;
        const daysDiff = Math.max(1, Math.ceil((now - firstRecord) / (1000 * 60 * 60 * 24)));
        document.getElementById('dailyAverage').textContent = (records.length / daysDiff).toFixed(1);

        // Durata media
        const totalDuration = records.reduce((sum, record) => sum + (record.duration || 0), 0);
        const averageDuration = records.length > 0 ? Math.round(totalDuration / records.length) : 0;
        document.getElementById('averageDuration').textContent = `${averageDuration} min`;

        // Valutazione media
        const totalRating = records.reduce((sum, record) => sum + (record.rating || 3), 0);
        const averageRating = records.length > 0 ? (totalRating / records.length).toFixed(1) : 0;
        document.getElementById('averageRating').textContent = `${averageRating} ⭐`;

        // Aggiorna la lista dei record
        const container = document.querySelector('.records-container');
        if (container) {
            container.innerHTML = records.slice(0, 10).map(record => `
                <div class="record-card">
                    <div class="record-header">
                        <span class="record-date">
                            ${new Date(record.date).toLocaleDateString('it-IT', { 
                                weekday: 'short', 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>
                        <span class="record-duration">${record.duration} min</span>
                    </div>
                    <div class="record-body">
                        <span class="record-rating">${'⭐'.repeat(record.rating)}</span>
                        <span class="record-mood">${record.mood}</span>
                    </div>
                    ${record.notes ? `<div class="record-notes">${record.notes}</div>` : ''}
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Errore nell\'aggiornamento delle statistiche:', error);
        showNotification('Errore nell\'aggiornamento delle statistiche ❌');
    }
}

// Aggiorna le statistiche ogni 30 secondi se siamo nella pagina statistics.html
function setupStatisticsUpdates() {
    if (window.location.pathname.includes('statistics.html')) {
        updateStatistics();
        setInterval(updateStatistics, 30000);
    }
}

// Aggiungi setupChartUpdates all'inizializzazione della pagina
document.addEventListener('DOMContentLoaded', () => {
    // Setup esistente
    const dateInput = document.getElementById('date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }

    const timeInput = document.getElementById('time');
    if (timeInput) {
        const now = new Date();
        timeInput.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }

    setupEventListeners();
    setupChartUpdates(); 
    setupStatisticsUpdates(); 

    const dailyTip = document.getElementById('dailyTip');
    if (dailyTip) {
        const randomTip = healthTips[Math.floor(Math.random() * healthTips.length)];
        dailyTip.textContent = randomTip;
    }
});

// Funzioni helper per i dati dei grafici
function getLastSevenDaysVisits(records) {
    const last7Days = Array.from({length: 7}, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
    }).reverse();

    const visitsByDay = {};
    last7Days.forEach(day => visitsByDay[day] = 0);

    records.forEach(record => {
        const recordDate = new Date(record.date).toISOString().split('T')[0];
        if (visitsByDay.hasOwnProperty(recordDate)) {
            visitsByDay[recordDate]++;
        }
    });

    return {
        labels: last7Days.map(date => {
            const d = new Date(date);
            return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' });
        }),
        datasets: [{
            label: 'Visite',
            data: last7Days.map(day => visitsByDay[day]),
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
        }]
    };
}

function getTimeDistribution(records) {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const last7Days = startOfDay.getTime() - (7 * 24 * 60 * 60 * 1000);

    const distribution = Array(24).fill(0);
    records
        .filter(record => new Date(record.date).getTime() >= last7Days)
        .forEach(record => {
            const hour = new Date(record.date).getHours();
            distribution[hour]++;
        });
    return {
        labels: Array.from({length: 24}, (_, i) => `${String(i).padStart(2, '0')}:00`),
        datasets: [{
            label: 'Visite per ora',
            data: distribution,
            fill: true,
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            tension: 0.4
        }]
    };
}

function getRatingsDistribution(records) {
    const now = new Date();
    const last30Days = now.getTime() - (30 * 24 * 60 * 60 * 1000);

    const distribution = Array(5).fill(0);
    records
        .filter(record => new Date(record.date).getTime() >= last30Days)
        .forEach(record => {
            if (record.rating >= 1 && record.rating <= 5) {
                distribution[record.rating - 1]++;
            }
        });
    return {
        labels: ['⭐', '⭐⭐', '⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐⭐⭐'],
        datasets: [{
            data: distribution,
            backgroundColor: [
                'rgba(255, 99, 132, 0.6)',
                'rgba(255, 159, 64, 0.6)',
                'rgba(255, 205, 86, 0.6)',
                'rgba(75, 192, 192, 0.6)',
                'rgba(54, 162, 235, 0.6)'
            ],
            borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(255, 159, 64, 1)',
                'rgba(255, 205, 86, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(54, 162, 235, 1)'
            ],
            borderWidth: 1
        }]
    };
}

function getAverageDurationByDay(records) {
    const now = new Date();
    const last7Days = now.getTime() - (7 * 24 * 60 * 60 * 1000);
    
    const durationsByDay = Array(7).fill(0).map(() => []);
    
    records
        .filter(record => new Date(record.date).getTime() >= last7Days)
        .forEach(record => {
            const day = new Date(record.date).getDay();
            if (record.duration >= 0) {
                durationsByDay[day].push(record.duration);
            }
        });

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    const today = now.getDay();
    const orderedDays = [...dayNames.slice(today + 1), ...dayNames.slice(0, today + 1)];

    return {
        labels: orderedDays,
        datasets: [{
            label: 'Durata media (minuti)',
            data: [...durationsByDay.slice(today + 1), ...durationsByDay.slice(0, today + 1)]
                .map(durations => 
                    durations.length > 0 
                        ? Math.round(durations.reduce((a, b) => a + b) / durations.length) 
                        : 0
                ),
            backgroundColor: 'rgba(153, 102, 255, 0.6)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1
        }]
    };
}

// Funzioni di utilità
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }, 100);
}

// Timer functions
function startTimer() {
    if (timerInterval) return;
    
    startTime = Date.now();
    document.getElementById('timerPopup').style.display = 'block';
    
    timerInterval = setInterval(updateTimerDisplay, 1000);
    showNotification('Timer avviato ⏱️');
}

function updateTimerDisplay() {
    if (!startTime || !timerInterval) return;
    
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    document.getElementById('timer').textContent = 
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function stopTimer() {
    if (!timerInterval) return;
    
    clearInterval(timerInterval);
    timerInterval = null;
    
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById('duration').value = Math.max(1, Math.round(elapsed / 60));
    
    document.getElementById('timerPopup').style.display = 'none';
    showNotification('Timer fermato ⏱️');
    
    startTime = null;
}

// Funzioni di creazione dei grafici
function createVisitsChart(data) {
    const ctx = document.getElementById('visitsChart').getContext('2d');
    return new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
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

function createTimeDistributionChart(data) {
    const ctx = document.getElementById('timeDistributionChart').getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
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

function createRatingsChart(data) {
    const ctx = document.getElementById('ratingsChart').getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 5,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function createDurationChart(data) {
    const ctx = document.getElementById('durationChart').getContext('2d');
    return new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value + ' min';
                        }
                    }
                }
            }
        }
    });
}