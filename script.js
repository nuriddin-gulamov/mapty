// Strict Mode
'use strict';

// DOM Manipulation
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);

    constructor(coords, distance, duration) {
        this.coords = coords; // [lat, lng]
        this.distance = distance; // km
        this.duration = duration; // min
    };

    _setDescription() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]}  ${this.date.getDate()}`
    };
};

class Running extends Workout {
    type = 'running';
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    };

    calcPace() {
        // min/km
        this.pace = this.duration / this.distance;
        return this.pace;
    };
};

class Cycling extends Workout {
    type = 'cycling';
    constructor(coords, distance, duration, elev) {
        super(coords, distance, duration);
        this.elev = elev;
        this.calcSpeed();
        this._setDescription();
    };

    calcSpeed() {
        // km/h
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    };
};

const run1 = new Running([32, -54], 12, 35, 178);
const cycl1 = new Cycling([77, -100], 34, 23, 43);

class App {
    #map;
    #mapEvent;
    #workouts = [];

    constructor() {
        // Get user's position
        this._getPosition();

        // Get data from local storage
        this._getLocalStorage();

        // Attach event handlers
        form.onsubmit = this._newWorkout.bind(this);
        inputType.onchange = this._toggleElevationField//.bind(this);
        containerWorkouts.onclick = this._moveToPopup.bind(this);
    };

    _getPosition() {
        if(navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function() {;
                alert('Could not get your position');
            });
        };
    };

    _loadMap(position) {
        const {latitude} = position.coords;
        const {longitude} = position.coords;
        const coords = [latitude, longitude];

        this.#map = L.map('map').setView(coords, 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        this.#map.on('click', this._showForm.bind(this));

        this.#workouts.forEach(work => {
            this._renderWorkoutMarker(work);
        });
    };

    _showForm(mapE) {
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
    };

    _hideForm() {
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
        form.classList.add('hidden');
    };

    _toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    };

    _newWorkout(e) {
        e.preventDefault();

        const isValidInput = (...inputs) => inputs.every(inp => Number.isFinite(inp));
        const allPositive = (...inputs) => inputs.every(inp => inp > 0); 

        const {lat, lng} = this.#mapEvent.latlng;
        let workout;

        // Get data from form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        
        // If workout is running, create running object
        if (type === 'running') {
            const cadence = +inputCadence.value;
            // Check if data is valid
            if (!isValidInput(distance, duration, cadence) || !allPositive(distance, duration, cadence)) {
                alert('Numbers have to pe positive values!'); 
                return inputDistance = inputDuration = inputCadence = inputElevation = '';
            };
                
            workout = new Running([lat, lng], distance, duration, cadence);
        };

        // If workout is cycling, create cycling object
        if (type === 'cycling') {
            const elev = +inputElevation.value;
            // Check if data is valid
            if (!isValidInput(distance, duration, elev) || !allPositive(distance, duration)) {
                alert('Numbers have to pe positive values!'); 
                return inputDistance = inputDuration = inputCadence = inputElevation = '';
            };
                
            workout = new Cycling([lat, lng], distance, duration, elev);
        };

        // Add new object to workout array
        this.#workouts.push(workout);

        // Render workout on list
        this._renderWorkout(workout);

        // Render workout on map as a marker
        this._renderWorkoutMarker(workout);
        
        // Hide form + clear input fields
        this._hideForm();

        // Set local storage to all workouts
        this._setLocalStorage();
    };

    _renderWorkoutMarker(workout) {
        L
        .marker(workout.coords)
        .addTo(this.#map)
        .bindPopup(L.popup({
            maxWidth: 250,
            minWidth: 100,
            autoClose: false,
            closeOnClick: false,
            className: `${workout.type }-popup`,
        }))
        .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
        .openPopup();
    };

    _renderWorkout(workout) {
        const htmlWorkout = `
            <li class="workout workout--${workout.type}" data-id="${workout.id}">
                <h2 class="workout__title">${workout.description}</h2>
                <div class="workout__details">
                    <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
                    <span class="workout__value">${workout.distance}</span>
                    <span class="workout__unit">km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⏱</span>
                    <span class="workout__value">${workout.duration}</span>
                    <span class="workout__unit">min</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.type === 'running' ? Math.round(workout.pace) : Math.round(workout.speed)}</span>
                    <span class="workout__unit">${workout.type === 'running' ? 'min/km' : 'km/h'}</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">${workout.type === 'running' ? '🦶🏼' : '⛰'}</span>
                    <span class="workout__value">${workout.type === 'running' ? workout.cadence : workout.elev}</span>
                    <span class="workout__unit">${workout.type === 'running' ? 'spm' : 'km/h'}</span>
                </div>
            </li>
        `;

        form.insertAdjacentHTML('afterend', htmlWorkout);
    };

    _moveToPopup(e) {
        const workoutEl = e.target.closest('.workout');
        
        if (!workoutEl) return;
        const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);

        this.#map.setView(workout.coords, 13, {
            animate: true,
            pan: {
                duration: 1,
            },
        });
    };

    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    };

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));
        
        if (!data) return;

        this.#workouts = data;

        this.#workouts.forEach(work => {
            this._renderWorkout(work);
        });
    };

    _reset() {
        localStorage.removeItem('workouts');
        location.reload();
    };
};

const app = new App();