document.getElementById('gold').addEventListener('change', (event) => {
	console.log(event.target.value);
	app.setAttribute('data-gold', event.target.value);
});
