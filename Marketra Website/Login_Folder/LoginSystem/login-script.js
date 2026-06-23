// ─── SVG paths for eye icons ─────────────────────────────────────────────────
const EYE_OPEN   = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
const EYE_CLOSED = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`;

// ─── Password toggle helper (swaps type AND updates eye icon) ────────────────
function hookPasswordToggle(buttonId, inputId, iconId) {
  const btn   = document.getElementById(buttonId);
  const input = document.getElementById(inputId);
  const icon  = document.getElementById(iconId);
  if (!btn || !input) return;

  btn.addEventListener('click', () => {
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
    if (icon) icon.innerHTML = isHidden ? EYE_OPEN : EYE_CLOSED;
  });
}

hookPasswordToggle('togglePass',            'password',        'eyeIcon');
hookPasswordToggle('toggleAdminPass',       'adminPassword',   'adminEyeIcon');
hookPasswordToggle('toggleRegPass',         'regPassword',     'regEyeIcon');
hookPasswordToggle('toggleRegConfirmPass',  'regConfirmPassword', 'regConfirmEyeIcon');

// ─── Portal Tab Switcher ──────────────────────────────────────────────────────
const tabVendor  = document.getElementById('tabVendor');
const tabAdmin   = document.getElementById('tabAdmin');
const panelVendor = document.getElementById('panelVendor');
const panelAdmin  = document.getElementById('panelAdmin');

function switchPortalTab(target) {
  if (target === 'admin') {
    tabAdmin?.classList.add('active');
    panelAdmin?.removeAttribute('hidden');
    tabVendor?.classList.remove('active');
    panelVendor?.setAttribute('hidden', '');
  } else {
    tabVendor?.classList.add('active');
    panelVendor?.removeAttribute('hidden');
    tabAdmin?.classList.remove('active');
    panelAdmin?.setAttribute('hidden', '');
  }
}
tabVendor?.addEventListener('click', () => switchPortalTab('vendor'));
tabAdmin?.addEventListener('click',  () => switchPortalTab('admin'));

// ─── Remember Me — restore saved credentials on page load ────────────────────
(function restoreRememberMe() {
  const saved = localStorage.getItem('marketra_remember');
  if (!saved) return;
  try {
    const { username, remember } = JSON.parse(saved);
    const usernameInput  = document.getElementById('username');
    const rememberCheck  = document.getElementById('rememberMe');
    if (remember && usernameInput) {
      usernameInput.value = username || '';
      if (rememberCheck) rememberCheck.checked = true;
    }
  } catch (_) {}
})();

// Save/clear on login form submit
document.getElementById('loginForm')?.addEventListener('submit', () => {
  const usernameInput = document.getElementById('username');
  const rememberCheck = document.getElementById('rememberMe');
  if (rememberCheck?.checked) {
    localStorage.setItem('marketra_remember', JSON.stringify({
      username: usernameInput?.value.trim() || '',
      remember: true
    }));
  } else {
    localStorage.removeItem('marketra_remember');
  }
});

// ─── Register Modal ───────────────────────────────────────────────────────────
const registerModal = document.getElementById('registerModal');

function openRegisterModal() {
  registerModal?.classList.add('active');
  registerModal?.setAttribute('aria-hidden', 'false');
}
function closeRegisterModal() {
  registerModal?.classList.remove('active');
  registerModal?.setAttribute('aria-hidden', 'true');
}

document.getElementById('registerLink')?.addEventListener('click', (e) => {
  e.preventDefault();
  openRegisterModal();
});
document.getElementById('closeRegister')?.addEventListener('click', closeRegisterModal);
document.getElementById('goToLogin')?.addEventListener('click', (e) => {
  e.preventDefault();
  closeRegisterModal();
});

// Close on backdrop click
registerModal?.addEventListener('click', (e) => {
  if (e.target === registerModal) closeRegisterModal();
});

/* ─── Terms and Privacy Modal ──────────────────────────────────────────────── */
const termsModal        = document.getElementById('termsModal');
const closeTerms        = document.getElementById('closeTerms');
const btnTermsAccept    = document.getElementById('btnTermsAccept');
const regAgreeCheckbox  = document.getElementById('regAgree');

const tabTermsOfService     = document.getElementById('tabTermsOfService');
const tabPrivacyPolicy      = document.getElementById('tabPrivacyPolicy');
const contentTermsOfService = document.getElementById('contentTermsOfService');
const contentPrivacyPolicy  = document.getElementById('contentPrivacyPolicy');

function openTermsModal(activeTab) {
  termsModal?.classList.add('active');
  termsModal?.setAttribute('aria-hidden', 'false');
  switchTermsTab(activeTab);
}

function closeTermsModal() {
  termsModal?.classList.remove('active');
  termsModal?.setAttribute('aria-hidden', 'true');
}

function switchTermsTab(target) {
  if (target === 'privacy') {
    tabPrivacyPolicy?.classList.add('active');
    tabPrivacyPolicy?.setAttribute('aria-selected', 'true');
    contentPrivacyPolicy?.removeAttribute('hidden');
    tabTermsOfService?.classList.remove('active');
    tabTermsOfService?.setAttribute('aria-selected', 'false');
    contentTermsOfService?.setAttribute('hidden', '');
  } else {
    tabTermsOfService?.classList.add('active');
    tabTermsOfService?.setAttribute('aria-selected', 'true');
    contentTermsOfService?.removeAttribute('hidden');
    tabPrivacyPolicy?.classList.remove('active');
    tabPrivacyPolicy?.setAttribute('aria-selected', 'false');
    contentPrivacyPolicy?.setAttribute('hidden', '');
  }
}

document.getElementById('termsLink')?.addEventListener('click', (e) => {
  e.preventDefault();
  openTermsModal('terms');
});
document.getElementById('privacyLink')?.addEventListener('click', (e) => {
  e.preventDefault();
  openTermsModal('privacy');
});
closeTerms?.addEventListener('click', closeTermsModal);
termsModal?.addEventListener('click', (e) => {
  if (e.target === termsModal) closeTermsModal();
});
tabTermsOfService?.addEventListener('click', () => switchTermsTab('terms'));
tabPrivacyPolicy?.addEventListener('click',  () => switchTermsTab('privacy'));

btnTermsAccept?.addEventListener('click', () => {
  if (regAgreeCheckbox) regAgreeCheckbox.checked = true;
  closeTermsModal();
});