const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

hamburger.addEventListener('click', () => {
  const expanded = navLinks.classList.toggle('expanded');
  hamburger.setAttribute('aria-expanded', expanded);
});
