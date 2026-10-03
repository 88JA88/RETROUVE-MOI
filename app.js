/* RETROUVE-moi — application statique : les données restent dans le navigateur et le QR. */
const form = document.querySelector('#owner-form');
const labelSection = document.querySelector('#label-section');
const qrTarget = document.querySelector('#qrcode');
const error = document.querySelector('#form-error');
const storageKey = 'retrouve-moi-settings';
const profilesKey = 'retrouve-moi-profiles';
const PUBLIC_BASE_URL = 'https://88ja88.github.io/RETROUVE-MOI/';
const DEFAULT_OBJECT = 'objet en vadrouille';
const profileSelect = document.querySelector('#profile-select');
const saveProfileButton = document.querySelector('#save-profile');
const deleteProfileButton = document.querySelector('#delete-profile');

function encodePayload(value) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(value)))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
function decodePayload(value) {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/') + '==='.slice((value.length + 3) % 4);
  return JSON.parse(decodeURIComponent(escape(atob(base64))));
}
function clean(value) { return value.trim(); }
function setFormValues(values) { Object.entries(values).forEach(([name, value]) => { const input = form.elements.namedItem(name); if (input && typeof value === 'string') input.value = value; }); }
function getProfiles() { try { return JSON.parse(localStorage.getItem(profilesKey) || '[]'); } catch { return []; } }
function saveProfiles(profiles) { localStorage.setItem(profilesKey, JSON.stringify(profiles)); }
function renderProfiles(selectedId = '') {
  const profiles = getProfiles();
  profileSelect.replaceChildren(new Option('Nouveau profil', ''));
  profiles.forEach(profile => profileSelect.add(new Option(profile.name, profile.id)));
  profileSelect.value = selectedId;
  deleteProfileButton.hidden = !selectedId;
}
function profileValues() {
  return {
    name: clean(form.elements.namedItem('name').value),
    phone: clean(form.elements.namedItem('phone').value),
    email: clean(form.elements.namedItem('email').value),
  };
}

function showFinder(payload) {
  document.title = 'RETROUVE-moi';
  document.querySelector('#owner-view').hidden = true;
  const finder = document.querySelector('#finder-view'); finder.hidden = false;
  document.querySelector('#help-button').addEventListener('click', () => {
    const actions = document.querySelector('#contact-actions'); actions.innerHTML = '';
    if (payload.p) {
      actions.append(contactLink(`tel:${payload.p}`, '📞', 'Appeler', payload.p));
      const message = `Bonjour, j’ai rencontré votre ${payload.o || DEFAULT_OBJECT}.`;
      actions.append(contactLink(`sms:${payload.p}?body=${encodeURIComponent(message)}`, '💬', 'Envoyer un SMS', payload.p));
    }
    if (payload.e) actions.append(contactLink(`mailto:${payload.e}`, '📩', 'Envoyer un e-mail', payload.e));
    document.querySelector('#finder-start').hidden = true;
    document.querySelector('#finder-contact').hidden = false;
  }, { once: true });
}
function contactLink(href, icon, label, detail) {
  const link = document.createElement('a'); link.className = 'contact-button'; link.href = href;
  link.innerHTML = `<b>${icon}</b><span>${label}<small></small></span>`; link.querySelector('small').textContent = detail;
  return link;
}

function startOwner() {
  try { setFormValues(JSON.parse(localStorage.getItem(storageKey) || '{}')); } catch { /* First use or unreadable saved settings. */ }
  const objectInput = form.elements.namedItem('object');
  if (objectInput && !objectInput.value) objectInput.value = DEFAULT_OBJECT;
  renderProfiles();
  profileSelect.addEventListener('change', () => {
    const profile = getProfiles().find(item => item.id === profileSelect.value);
    if (profile) setFormValues(profile);
    deleteProfileButton.hidden = !profile;
  });
  saveProfileButton.addEventListener('click', () => {
    const profile = profileValues();
    if (!profile.name || (!profile.phone && !profile.email)) {
      error.textContent = 'Indiquez un prénom et un moyen de contact avant d’enregistrer ce profil.';
      return;
    }
    const profiles = getProfiles();
    const id = profileSelect.value || crypto.randomUUID();
    const index = profiles.findIndex(item => item.id === id);
    const savedProfile = { ...profile, id };
    if (index >= 0) profiles[index] = savedProfile; else profiles.push(savedProfile);
    saveProfiles(profiles); renderProfiles(id); error.textContent = 'Profil enregistré.';
  });
  deleteProfileButton.addEventListener('click', () => {
    if (!profileSelect.value || !confirm('Supprimer ce profil ?')) return;
    saveProfiles(getProfiles().filter(item => item.id !== profileSelect.value));
    renderProfiles(); error.textContent = 'Profil supprimé.';
  });
  form.addEventListener('input', () => {
    localStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(new FormData(form).entries())));
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault(); error.textContent = '';
    const values = Object.fromEntries(new FormData(form).entries());
    const name = clean(values.name || ''); const phone = clean(values.phone || ''); const email = clean(values.email || '');
    if (!name) return void (error.textContent = 'Indiquez votre prénom ou vos initiales.');
    if (!phone && !email) return void (error.textContent = 'Indiquez un téléphone ou une adresse e-mail.');
    localStorage.setItem(storageKey, JSON.stringify(values));
    const objectName = clean(values.object || '') || DEFAULT_OBJECT;
    const data = { n: name, p: phone || undefined, e: email || undefined, o: objectName };
    const url = `${PUBLIC_BASE_URL}#r=${encodePayload(data)}`;
    qrTarget.replaceChildren();
    new QRCode(qrTarget, { text: url, width: 280, height: 280, colorDark: '#163a59', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
    labelSection.hidden = false; labelSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  document.querySelector('#label-size').addEventListener('change', (event) => {
    document.querySelector('#print-label').className = `print-label size-${event.target.value}`;
  });
  document.querySelector('#print-button').addEventListener('click', () => window.print());
}

const match = location.hash.match(/^#r=([A-Za-z0-9_-]+)$/);
if (match) { try { showFinder(decodePayload(match[1])); } catch { location.hash = ''; startOwner(); } } else startOwner();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
