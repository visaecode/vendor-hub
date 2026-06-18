/* ---- Tab Switcher ---- */
const tabVendor   = document.getElementById('tabVendor');
const tabAdmin    = document.getElementById('tabAdmin');
const panelVendor = document.getElementById('panelVendor');
const panelAdmin  = document.getElementById('panelAdmin');

function switchTab(activeTab, activePanel, inactiveTab, inactivePanel) {
  activeTab.classList.add('active');
  activeTab.setAttribute('aria-selected', 'true');
  inactiveTab.classList.remove('active');
  inactiveTab.setAttribute('aria-selected', 'false');
  activePanel.removeAttribute('hidden');
  inactivePanel.setAttribute('hidden', '');
}

tabVendor.addEventListener('click', () => switchTab(tabVendor, panelVendor, tabAdmin, panelAdmin));
tabAdmin.addEventListener('click',  () => switchTab(tabAdmin,  panelAdmin,  tabVendor, panelVendor));

/* ---- Admin password toggle ---- */
const toggleAdminBtn  = document.getElementById('toggleAdminPass');
const adminPassInput  = document.getElementById('adminPassword');
const adminEyeIcon    = document.getElementById('adminEyeIcon');

toggleAdminBtn.addEventListener('click', () => {
  const hidden = adminPassInput.type === 'password';
  adminPassInput.type = hidden ? 'text' : 'password';
  adminEyeIcon.innerHTML = hidden
    ? `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`
    : `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`;
});

/* ---- Admin form submission ---- */
document.getElementById('adminLoginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  // TODO (backend): wire up Firebase admin authentication here
});

/* ---- Login password toggle ---- */

const toggleBtn = document.getElementById('togglePass');
const passInput = document.getElementById('password');
const eyeIcon   = document.getElementById('eyeIcon');

toggleBtn.addEventListener('click', () => {
  const hidden = passInput.type === 'password';
  passInput.type = hidden ? 'text' : 'password';
  eyeIcon.innerHTML = hidden
    ? `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`
    : `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`;
});

/* ---- Modal open/close ---- */
const registerLink  = document.getElementById('registerLink');
const registerModal = document.getElementById('registerModal');
const closeRegister = document.getElementById('closeRegister');
const goToLogin     = document.getElementById('goToLogin');

function openModal() {
  registerModal.classList.add('active');
  registerModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  registerModal.classList.remove('active');
  registerModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

registerLink.addEventListener('click', (e) => { e.preventDefault(); openModal(); });
closeRegister.addEventListener('click', closeModal);
goToLogin.addEventListener('click', (e) => { e.preventDefault(); closeModal(); });

registerModal.addEventListener('click', (e) => {
  if (e.target === registerModal) closeModal();
});

/* ---- Password policy live checker ---- */
const regPassInput = document.getElementById('regPassword');
const toggleRegBtn = document.getElementById('toggleRegPass');
const regEyeIcon   = document.getElementById('regEyeIcon');

const rules = {
  'pol-len':   (v) => v.length >= 8,
  'pol-upper': (v) => /[A-Z]/.test(v),
  'pol-lower': (v) => /[a-z]/.test(v),
  'pol-num':   (v) => /[0-9]/.test(v),
  'pol-sym':   (v) => /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~;']/.test(v),
};

regPassInput.addEventListener('input', () => {
  const val = regPassInput.value;
  for (const [id, test] of Object.entries(rules)) {
    const li   = document.getElementById(id);
    const icon = li.querySelector('.pol-icon');
    const pass = test(val);
    li.classList.toggle('pol-pass', pass);
    li.classList.toggle('pol-fail', !pass && val.length > 0);
    icon.textContent = pass ? '✓' : '✕';
  }
});

/* ---- Register password visibility toggle ---- */
toggleRegBtn.addEventListener('click', () => {
  const hidden = regPassInput.type === 'password';
  regPassInput.type = hidden ? 'text' : 'password';
  regEyeIcon.innerHTML = hidden
    ? `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`
    : `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`;
});

/* ---- Register form submission ---- */
document.getElementById('registerForm').addEventListener('submit', (e) => {
  e.preventDefault();
  // TODO (backend): wire up Firebase / API registration call here
});


/* ---- Forgot Password Modal ---- */
const forgotLink  = document.getElementById('forgotPass');
const forgotModal = document.getElementById('forgotModal');
const closeForgot = document.getElementById('closeForgot');
const fpStep1     = document.getElementById('fpStep1');
const fpStep2     = document.getElementById('fpStep2');
const fpSentTo    = document.getElementById('fpSentTo');
const fpResendBtn = document.getElementById('fpResendBtn');

function openForgot() {
  forgotModal.classList.add('active');
  forgotModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  // Reset to step 1 each time it opens
  fpStep1.style.display = '';
  fpStep2.style.display = 'none';
  document.getElementById('fpContact').value = '';
}

function closeForgot_fn() {
  forgotModal.classList.remove('active');
  forgotModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

forgotLink.addEventListener('click', (e) => { e.preventDefault(); openForgot(); });
closeForgot.addEventListener('click', closeForgot_fn);
document.getElementById('fpBackToLogin').addEventListener('click', (e) => { e.preventDefault(); closeForgot_fn(); });
document.getElementById('fpDoneBtn').addEventListener('click', closeForgot_fn);

forgotModal.addEventListener('click', (e) => {
  if (e.target === forgotModal) closeForgot_fn();
});

// Step 1 → Step 2 (UI only; backend sends the actual email)
document.getElementById('forgotForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const contact = document.getElementById('fpContact').value.trim();
  if (!contact) return;
  fpSentTo.textContent = contact;
  fpStep1.style.display = 'none';
  fpStep2.style.display = '';
});

// Resend button cooldown
fpResendBtn.addEventListener('click', () => {
  fpResendBtn.disabled = true;
  fpResendBtn.textContent = 'Sent!';
  setTimeout(() => {
    fpResendBtn.disabled = false;
    fpResendBtn.textContent = 'Resend link';
  }, 30000); // 30 second cooldown
});