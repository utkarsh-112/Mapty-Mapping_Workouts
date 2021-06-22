'use strict';

//workout data
class Workout{
	date = new Date();
	id=(Date.now() + '').slice(-10);

	constructor(coords,distance,duration){
		this.coords=coords;		//[lat,lng]
		this.distance=distance;	//in km
		this.duration=duration;	//in min
	}	
	_setDescription(){
		const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
		this.description=`${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
	}
}

//child classes
class Running extends Workout{
	type='running';

	constructor(coords,distance,duration,cadence){
		super(coords,distance,duration);
		this.cadence=cadence;
		this.calcPace();
		this._setDescription();
	}
	calcPace(){
		// min/km
		this.pace=this.duration/this.distance;
		return this.pace; 
	}
}

class Cycling extends Workout{
	type='cycling';

	constructor(coords,distance,duration,elevationGain){
		super(coords,distance,duration);
		this.elevationGain=elevationGain;
		this.calcSpeed();
		this._setDescription();
	}
	calcSpeed(){
		// km/h
		this.speed=this.distance/(this.duration/60);
		return this.speed;
	}
}
// const run1=new Running([39,-12],5.2,24,178);
// const cycle1=new Cycling([39,-12],27,95,523);
// console.log(run1,cycle1);

////////////////////////////////////////
//APPLICATION ARCHITECTURE
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
	#map;	//private instance properties of this class
	#mapEvent;
	#workouts=[];

	constructor(){
		//Get user's position
		this._getPosition();		//automatically called when object is created i.e. as the page loads

		//Get data from local storage
		this._getLocalStorage();

		//attach event handlers
		form.addEventListener('submit', this._newWorkout.bind(this))	//submit form

		inputType.addEventListener('change',this._toggleElevationField)	//changing input fields for running and cycling

		containerWorkouts.addEventListener('click',this._movetoPopup.bind(this));
		

	}
	_getPosition(){
	//Geolocation API
	if(navigator.geolocation)
		navigator.geolocation.getCurrentPosition(this._loadMap.bind(this)      //successful callback
			//using bind so that we can use this keyword in loadMap as well
		,function(){		//error callback
			alert('Could not get your location');
		}
		);
	}
	_loadMap(position){	
			const {latitude}=position.coords;
			const {longitude}=position.coords;
			// console.log(`https://www.google.pt/maps/@${latitude},${longitude}`);

			const coords=[latitude,longitude];

			//adding map to our app using leaflet
			this.#map = L.map('map').setView(coords, 14);   //14 is the zoom level of the map

			L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
			    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
			}).addTo(this.#map);

			this.#map.on('click',this._showForm.bind(this))   //this is not on the window object, 'on' comes from leaflet library, we can use this as event listener
			
			//restoring marker from local storage
			this.#workouts.forEach(work => {
			this._renderWorkoutMarker(work);
		})
	}
	_showForm(mapE){
			//form
			this.#mapEvent=mapE;
			form.classList.remove('hidden'); 
			inputDistance.focus();		//when we click on map curson blicks on distance field

	}
	_toggleElevationField(){		
			inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
			inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
	}
	_newWorkout(e){

		const validInputs=(...inputs)=>					//... operator gives an array of all inputs
		inputs.every(inp=>Number.isFinite(inp));		//every function will loop over every element and return true/false depending on what the element returns

		const Allpositive=(...inputs)=>
		inputs.every(inp=> inp>0);		
		
		e.preventDefault();
		//1. get data from the form
			const type=inputType.value;
			const distance=+inputDistance.value;  //converting the inputDistance.value to number using +
			const duration=+inputDuration.value;
			const {lat,lng}=this.#mapEvent.latlng;
			let workout;

		//2. check if data is valid

		//3. if workout is running,create running object
			if(type === 'running'){
				const cadence=+inputCadence.value;

				//check if data is valid
				// if(!Number.isFinite(distance) || !Number.isFinite(duration) || !Number.isFinite(cadence)) 
				if(!validInputs(distance,duration,cadence) || !Allpositive(distance,duration,cadence))
				//this condition reads as if any input is not finite or any number is not positive
					return alert("Inputs have to positive numbers");

			workout=new Running([lat,lng],distance,duration,cadence);
			}
		
		//4. if workout is cycling,create cycling object
			if(type === 'cycling'){
				const elevation=+inputElevation.value;

				//check if data is valid
				// if(!Number.isFinite(distance) || !Number.isFinite(duration) || !Number.isFinite(elevation)) 
				if(!validInputs(distance,duration,elevation) || !Allpositive(distance,duration))
					return alert("Inputs have to positive numbers");

			workout=new Cycling([lat,lng],distance,duration,elevation);
			}

		//5. add new object to workout array
			this.#workouts.push(workout);

		//6. render workout on map as marker
			this._renderWorkoutMarker(workout);

		//7. render workout on list
			this._renderWorkout(workout);
		//8. hide the form+clear input fields
			//clear input fields
			inputDistance.value=inputDuration.value=inputCadence.value=inputElevation.value='';
			form.style.display='none';
			form.classList.add('hidden');
			setTimeout(()=>form.style.display='grid',1000);

		//9. Set local storage to all Workouts
			this._setLocalStorage()
		}


		_renderWorkoutMarker(workout) {
			//display marker
			L.marker(workout.coords)
				.addTo(this.#map)
			    .bindPopup(
			    	L.popup({
			    		maxWidth : 250,
			    		minWidth : 100,
			    		autoClose:false,
			    		closeOnClick:false,
			    		className:`${workout.type}-popup`, 
			    	})
			    	)
			    .setPopupContent(`${(workout.type==='running') ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
			    .openPopup();
		}

	_renderWorkout(workout){
		let html = `
		<li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${(workout.type==='running') ? '🏃‍♂️' : '🚴‍♀️'}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
        `;

       if(workout.type==='running'){
       	html+=`<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`;
       }

       if(workout.type==='cycling'){
       	html+=`<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>`;
       }
      form.insertAdjacentHTML('afterend',html); 
	} 
	_movetoPopup(e){
		const workoutEl=e.target.closest('.workout');

		if(!workoutEl) return;

		const workout=this.#workouts.find(work=>work.id===workoutEl.dataset.id);

		this.#map.setView(workout.coords,14,{animate : true,pan : {duration:1}});
	}
	_setLocalStorage(){
		localStorage.setItem('workouts',JSON.stringify(this.#workouts));	//converting JS object into string
	}
	_getLocalStorage(){
		const data=JSON.parse(localStorage.getItem('workouts'));	//converting string back to JS object

		if(!data) return;

		this.#workouts=data;	//restoring data

		this.#workouts.forEach(work => {
			this._renderWorkout(work);		//displaying restored workouts
		})
	}

	//public method to reset the app data
	reset(){
		localStorage.removeItem('workouts');
		location.reload();
	}
}


const app=new App();