const params = new URLSearchParams(window.location.search);
const error = params.get('error');

if (error) {
  const alert = document.querySelector('#loginError');
  alert.textContent = error === 'rate-limit'
    ? 'Too many sign-in attempts. Please try again later.'
    : 'Invalid email or password.';
  alert.hidden = false;
}
