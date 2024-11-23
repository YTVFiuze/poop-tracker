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
        setupChartUpdates();
    }

    // Inizializza le statistiche se siamo nella pagina statistics.html
    if (window.location.pathname.includes('statistics.html')) {
        updateStatistics();
        setupStatisticsUpdates();
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
            notes: document.getElementById('notes').value || ''
        };

        await saveRecord(formData);
        
        // Aggiorna i grafici in tutte le finestre aperte
        if (window.localStorage) {
            // Trigger un evento personalizzato per notificare altre finestre
            const updateEvent = new StorageEvent('storage', {
                key: 'poopRecords',
                newValue: localStorage.getItem('poopRecords'),
                url: window.location.href
            });
            window.dispatchEvent(updateEvent);
        }

        showNotification('Registrazione salvata con successo! 🎉');
        resetForm();
    } catch (error) {
        console.error('Errore nel salvataggio:', error);
        showNotification('Errore nel salvataggio. Riprova. ❌');
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

// Funzione per calcolare la durata dal timer
function calculateDuration() {
    if (!startTime) return 0;
    const endTime = new Date();
    const diffInMs = endTime - startTime;
    const diffInMinutes = Math.round(diffInMs / (1000 * 60));
    console.log('Durata calcolata:', diffInMinutes, 'minuti');
    return diffInMinutes;
}

// Funzione per fermare il timer
function stopTimer() {
    if (!startTime) return;
    
    const duration = calculateDuration();
    console.log('Timer fermato, durata:', duration, 'minuti');
    
    // Aggiorna il campo durata nel form
    const durationInput = document.getElementById('duration');
    if (durationInput) {
        durationInput.value = duration;
        console.log('Campo durata aggiornato:', duration);
    }
    
    document.getElementById('timerPopup').style.display = 'none';
    showNotification('Timer fermato ⏱️');
    
    startTime = null;
}

// Salvataggio dei dati
async function saveRecord(data) {
    try {
        // Assicurati che la durata sia un numero valido
        const duration = parseInt(data.duration);
        data.duration = isNaN(duration) ? 0 : duration;
        
        console.log('Salvataggio record con durata:', data.duration, 'minuti');
        
        // Carica i record esistenti
        let records = [];
        try {
            records = JSON.parse(localStorage.getItem('poopRecords') || '[]');
            console.log('Record esistenti caricati:', records);
        } catch (e) {
            console.error('Errore nel caricamento dei record esistenti:', e);
            records = [];
        }
        
        // Aggiungi il nuovo record
        records.push(data);
        
        // Salva nel localStorage
        localStorage.setItem('poopRecords', JSON.stringify(records));
        console.log('Record salvato con successo:', data);
        
        // Aggiorna i grafici se siamo nella pagina dei grafici
        if (window.location.pathname.includes('charts.html')) {
            initializeCharts();
        }
    } catch (error) {
        console.error('Errore nel salvataggio:', error);
        throw error;
    }
}

// Funzione per pulire tutti i grafici esistenti
function destroyAllCharts() {
    console.log('Pulizia di tutti i grafici esistenti...');
    Object.keys(charts).forEach(key => {
        if (charts[key]) {
            try {
                console.log(`Distruggo il grafico ${key}`);
                charts[key].destroy();
                charts[key] = null;
            } catch (error) {
                console.error(`Errore durante la distruzione del grafico ${key}:`, error);
            }
        }
    });
}

// Inizializzazione dei grafici
function initializeCharts() {
    console.log('Inizializzazione grafici...');
    
    try {
        // Prima di tutto, distruggi tutti i grafici esistenti
        destroyAllCharts();

        // Recupera i dati dal localStorage
        const records = JSON.parse(localStorage.getItem('poopRecords') || '[]');
        console.log('Record caricati:', records);

        if (records.length === 0) {
            console.log('Nessun record trovato');
            document.querySelector('.charts-container').innerHTML = 
                '<p class="no-data">Nessun dato disponibile. Aggiungi alcune visite per vedere le statistiche.</p>';
            return;
        }

        // Inizializza ogni grafico in sequenza
        console.log('Creazione grafico visite...');
        const visitsData = getLastSevenDaysVisits(records);
        charts.visits = createVisitsChart(visitsData);

        console.log('Creazione grafico valutazioni...');
        const ratingsData = getRatingsDistribution(records);
        charts.ratings = createRatingsChart(ratingsData);

        console.log('Creazione grafico distribuzione temporale...');
        const timeData = getTimeDistribution(records);
        charts.timeDistribution = createTimeDistributionChart(timeData);

        console.log('Creazione grafico durata...');
        const durationData = getAverageDurationByDay(records);
        charts.duration = createDurationChart(durationData);

        console.log('Inizializzazione completata con successo');
    } catch (error) {
        console.error('Errore durante l\'inizializzazione:', error);
        document.querySelector('.charts-container').innerHTML = 
            '<p class="error">Si è verificato un errore nel caricamento dei grafici. Riprova più tardi.</p>';
    }
}

// Modifica la funzione di aggiornamento dei grafici
function setupChartUpdates() {
    // Aggiorna i grafici ogni 30 secondi
    setInterval(() => {
        console.log('Aggiornamento periodico dei grafici...');
        initializeCharts();
    }, 30000);

    // Ascolta gli eventi di storage per aggiornamenti cross-window
    window.addEventListener('storage', (e) => {
        if (e.key === 'poopRecords') {
            console.log('Rilevata modifica ai dati, aggiornamento grafici...');
            initializeCharts();
        }
    });

    // Inizializzazione iniziale
    initializeCharts();
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

// Aggiungi listener per gli aggiornamenti del localStorage
window.addEventListener('storage', (event) => {
    if (event.key === 'poopRecords') {
        // Se siamo nella pagina dei grafici, aggiornali
        if (window.location.pathname.includes('charts.html')) {
            initializeCharts();
        }
        // Se siamo nella pagina delle statistiche, aggiornale
        if (window.location.pathname.includes('statistics.html')) {
            updateStatistics();
        }
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
    // Debug: stampa i record ricevuti
    console.log('Records ricevuti:', records);

    const now = new Date();
    const dates = [];
    const ratings = [];

    // Crea array delle date per gli ultimi 7 giorni
    for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        dates.push(date);
    }

    // Debug: stampa le date generate
    console.log('Date generate:', dates);

    // Per ogni giorno, calcola la media delle valutazioni
    dates.forEach(date => {
        const dayRecords = records.filter(record => {
            const recordDate = new Date(record.date);
            const sameDay = recordDate.getDate() === date.getDate() &&
                          recordDate.getMonth() === date.getMonth() &&
                          recordDate.getFullYear() === date.getFullYear();
            
            // Debug: stampa i record trovati per ogni giorno
            if (sameDay) {
                console.log('Record trovati per', date.toISOString().split('T')[0], ':', record);
            }
            
            return sameDay;
        });

        if (dayRecords.length > 0) {
            const dayRatings = dayRecords.map(r => Number(r.rating) || 0);
            const avgRating = dayRatings.reduce((a, b) => a + b, 0) / dayRatings.length;
            ratings.push(avgRating);
            
            // Debug: stampa la media calcolata
            console.log('Media calcolata per', date.toISOString().split('T')[0], ':', avgRating);
        } else {
            ratings.push(null);
        }
    });

    // Debug: stampa l'oggetto dati finale
    const data = {
        labels: dates.map(date => date.toLocaleDateString('it-IT', {
            weekday: 'short',
            day: 'numeric'
        })),
        datasets: [{
            label: 'Valutazione Media',
            data: ratings,
            borderColor: 'rgb(255, 159, 64)',
            backgroundColor: 'rgba(255, 159, 64, 0.2)',
            borderWidth: 2,
            fill: true,
            tension: 0,
            pointRadius: 6,
            pointHoverRadius: 8,
            pointBackgroundColor: 'rgb(255, 159, 64)',
            pointBorderColor: 'white',
            pointBorderWidth: 2,
            spanGaps: true
        }]
    };
    
    console.log('Dati finali del grafico:', data);
    return data;
}

function getAverageDurationByDay(records) {
    console.log('Calcolo durata media per giorno, records:', records);
    
    const now = new Date();
    const last7Days = [];
    const durations = [];
    const labels = [];

    // Genera le date degli ultimi 7 giorni
    for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        last7Days.push(date);
    }

    // Calcola la durata media per ogni giorno
    last7Days.forEach(targetDate => {
        const dayRecords = records.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate.getDate() === targetDate.getDate() &&
                   recordDate.getMonth() === targetDate.getMonth() &&
                   recordDate.getFullYear() === targetDate.getFullYear();
        });

        console.log(`Record per ${targetDate.toISOString().split('T')[0]}:`, dayRecords);

        if (dayRecords.length > 0) {
            // Calcola la media delle durate, assicurandosi che siano numeri
            const totalDuration = dayRecords.reduce((sum, record) => {
                const duration = parseInt(record.duration);
                const validDuration = isNaN(duration) ? 0 : duration;
                console.log(`Durata record per ${targetDate.toISOString().split('T')[0]}:`, validDuration);
                return sum + validDuration;
            }, 0);
            
            const avgDuration = totalDuration / dayRecords.length;
            const roundedAvg = Math.round(avgDuration);
            durations.push(roundedAvg);
            
            console.log(`${targetDate.toISOString().split('T')[0]}:`, {
                totalDuration,
                numRecords: dayRecords.length,
                avgDuration: roundedAvg
            });
        } else {
            durations.push(null);
            console.log(`Nessun record per ${targetDate.toISOString().split('T')[0]}`);
        }

        labels.push(targetDate.toLocaleDateString('it-IT', {
            weekday: 'short',
            day: 'numeric'
        }));
    });

    console.log('Durate finali:', durations);
    console.log('Labels finali:', labels);

    return {
        labels: labels,
        datasets: [{
            label: 'Durata Media (minuti)',
            data: durations,
            backgroundColor: 'rgba(153, 102, 255, 0.2)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1
        }]
    };
}

function createDurationChart(data) {
    console.log('Creazione grafico durata con dati:', data);
    
    const ctx = document.getElementById('durationChart');
    if (!ctx) {
        console.error('Canvas durationChart non trovato');
        return null;
    }

    // Distruggi il grafico esistente se presente
    if (charts.duration) {
        charts.duration.destroy();
    }

    // Trova il valore massimo per impostare il limite dell'asse y
    const maxDuration = Math.max(...data.datasets[0].data.filter(v => v !== null)) || 10;
    const yAxisMax = Math.ceil(maxDuration / 5) * 5; // Arrotonda al multiplo di 5 più vicino

    return new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const minutes = context.raw;
                            if (minutes === null || minutes === undefined) return 'Nessun dato';
                            return `${Math.round(minutes)} minuti`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: yAxisMax,
                    ticks: {
                        stepSize: Math.max(1, Math.floor(yAxisMax / 5)),
                        callback: function(value) {
                            return Math.round(value) + ' min';
                        }
                    },
                    title: {
                        display: true,
                        text: 'Durata Media (minuti)'
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
    // Debug: verifica che il canvas esista
    const canvas = document.getElementById('ratingsChart');
    if (!canvas) {
        console.error('Canvas ratingsChart non trovato!');
        return null;
    }
    console.log('Canvas trovato:', canvas);

    // Debug: verifica che i dati siano validi
    if (!data || !data.datasets || !data.datasets[0] || !data.datasets[0].data) {
        console.error('Dati non validi per il grafico:', data);
        return null;
    }

    // Distruggi il grafico esistente se presente
    if (charts.ratings) {
        console.log('Distruggo il grafico esistente');
        charts.ratings.destroy();
        charts.ratings = null;
    }

    return new Chart(canvas, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            if (value === null) return 'Nessuna valutazione';
                            return `${value.toFixed(1)} ⭐`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    min: 0,
                    max: 5,
                    ticks: {
                        stepSize: 1,
                        callback: function(value) {
                            return '⭐'.repeat(value);
                        }
                    }
                }
            }
        }
    });
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