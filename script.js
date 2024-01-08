'use strict';

class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);

    constructor(coords, distance, duration) {
        this.coords = coords; // [lat, lng]
        this.distance = distance; // km
        this.duration = duration; // min
    }

    _setDescription() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }

}

class Running extends Workout {
    type = 'running'
    constructor(coords, distance, duration, cadance) {
        super(coords, distance, duration)
        this.cadance = cadance;
        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        // min/km
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

class Cycling extends Workout {
    type = 'cycling'
    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration)
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() {
        // km/hr
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cylcing1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cylcing1);



/////////////////////////////////////////////////
// Application Architecture

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const btnDeleteAll = document.querySelector('.delete__all__btn');

class App {
    #map;
    #mapZoomLevel = 13;
    #mapEvent;
    #workouts = [];

    constructor() {
        // Get users position
        this._getPosition();
        
        // Get data from local storage
        this._getLocalStorage();

        // Attach event handlers
        form.addEventListener('submit', this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toggleElevationField);
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

        // // Workout Buttons
        // containerWorkouts.addEventListener('click', this._edit);
        containerWorkouts.addEventListener('click', this._delete);

    }

    _getPosition() {
        if(navigator.geolocation){
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function() {
                alert('Could not get your position.');
            });
        };
    }

    _loadMap(position) {
        const {latitude} = position.coords;
        const {longitude} = position.coords;
        console.log(`https://www.google.com/maps/@${latitude},${longitude}`);
    
        const coords = [latitude, longitude];
    
        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    
        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {                
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);
    
        // handling click on map
        this.#map.on('click', this._showForm.bind(this));

        this.#workouts.forEach(work => {
            this._renderWorkoutMarker(work);
        });
    
    }

    _showForm(mapE) {
        this.#mapEvent = mapE;
            form.classList.remove('hidden');
            inputDistance.focus();
    }

    _hideForm() {
        // Empty Inputs
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
        
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => form.style.display = 'grid', 1000);
    }

    _toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _newWorkout(e) {
        
        // Check is data is valid
        const validInputs = (...inputs) => 
            inputs.every(inp => Number.isFinite(inp));

        const allPositive = (...inputs) => 
            inputs.every(inp => inp > 0);

        e.preventDefault();

        // Get Data from form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const {lat, lng} = this.#mapEvent.latlng;
        let workout;

        // If workout is running, creating running object
        if(type === 'running') {
            // Check if data is valid
            const cadance = +inputCadence.value;
            if(
                // !Number.isFinite(distance || 
                // !Number.isFinite(duration || 
                // !Number.isFinite(cadance)))
                !validInputs(distance, duration, cadance) || 
                !allPositive(distance, duration, cadance)
            ) 
                return alert('Inputs have to be positive numbers!');
        
            workout = new Running ({lat, lng}, distance, duration, cadance);

        }

        // If workout is cycling, creating cycling object
        if(type === 'cycling') {
            const elevation = +inputElevation.value;
            // check if data is valid
            if(
                !validInputs(distance, duration, elevation) || 
                !allPositive(distance, duration)
                )
                return alert('Inputs have to be positive numbers!');

            workout = new Cycling ({lat, lng}, distance, duration, elevation);

            }
        
        // Add new object to workout array
        this.#workouts.push(workout);

        // Render workout on map as marker
        this._renderWorkoutMarker(workout);

        // Render workout on list
        this._renderWorkout(workout);


        // Clear input fields + Hide form,clear input fields
        this._hideForm();

        // Set Local Storage for all workouts
        this._setLocalStorage();
    
    }

    _renderWorkoutMarker(workout) {
        L.marker(workout.coords).addTo(this.#map)
        .bindPopup(L.popup({
            maxWidth: 250,
            minWidth: 100,
            autoClose: false,
            closeOnClick: false,
            className: `${workout.type}-popup`,
            })
        )
        .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
        .openPopup();
    }

    _renderWorkout(workout) {

        let html = `
            <li class="workout workout--${workout.type}" data-id="${workout.id}">
            <h2 class="workout__title">${workout.description}
            <button class="btn__edit">Edit</button>
            <button class="btn__delete">Delete</button>
            </h2>
            <div class="workout__details">
                <span class="workout__icon">${
                    workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
                }</span>
                <span class="workout__value">${workout.distance}</span>
                <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⏱</span>
                <span class="workout__value">${workout.duration}</span>
                <span class="workout__unit">min</span>
            </div>
        `;

        if(workout.type === 'running')
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.pace.toFixed(1)}</span>
                    <span class="workout__unit">min/km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">🦶🏼</span>
                    <span class="workout__value">${workout.cadance}</span>
                    <span class="workout__unit">spm</span>
                </div>
                </li>
                `;

        if(workout.type === 'cycling')
            html += `
            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.speed.toFixed(1)}</span>
                <span class="workout__unit">km/h</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⛰</span>
                <span class="workout__value">${workout.elevationGain}</span>
                <span class="workout__unit">m</span>
            </div>
            </li>
            `;

        form.insertAdjacentHTML('afterend', html);
    }

    _moveToPopup(e) {
        const workoutEl = e.target.closest('.workout');

        if(!workoutEl) return;

        const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);

        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1
            },
        });

    }

    // _edit(e) {
    //     const btnEd = e.target.closest('button');
    //     const work = btnEd.closest('.workout');

    //     if(btnEd.className !== 'btn__edit') return;
        
    //     form.style.display = 'grid';
    //     form.classList.remove('hidden');
            
    //     // inputType.value = work.inputElevation;
    //     // inputDistance.value = work.inputDistance;
    //     // inputDuration.value = inputDuration;
    //     // inputCadence.value = inputCadence;
    //     // inputElevation.value = inputElevation;
    //     console.log(this);

    // }

    _delete(e) {
        const btnEl = e.target.closest('button');
        const work = btnEl.closest('.workout');

        if(btnEl.className !== 'btn__delete') return

        const ul = work.parentNode;

        ul.removeChild(work);
    }

    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));

        if(!data) return;

        this.#workouts = data;

        this.#workouts.forEach(work => {
            this._renderWorkout(work);
        });
    }

    _reset() {
        localStorage.removeItem('workouts');
        location.reload();
    }

}

btnDeleteAll.addEventListener('click', function() {
    localStorage.clear();
    location.reload();
});

const app = new App();