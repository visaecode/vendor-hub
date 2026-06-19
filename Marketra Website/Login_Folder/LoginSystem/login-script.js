const tabVendor = document.getElementById('tabVendor');
const tabAdmin = document.getElementById('tabAdmin');
const panelVendor = document.getElementById('panelVendor');
const panelAdmin = document.getElementById('panelAdmin');

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
tabAdmin?.addEventListener('click', () => switchPortalTab('admin'));

function hookPasswordToggle(buttonId, inputId) {
  document.getElementById(buttonId)?.addEventListener('click', () => {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
  });
}
hookPasswordToggle('togglePass', 'password');
hookPasswordToggle('toggleRegPass', 'regPassword');
hookPasswordToggle('toggleAdminPass', 'adminPassword');

const registerModal = document.getElementById('registerModal');
document.getElementById('registerLink')?.addEventListener('click', (e) => { e.preventDefault(); registerModal?.classList.add('active'); });
document.getElementById('closeRegister')?.addEventListener('click', () => registerModal?.classList.remove('active'));

/* ---- Terms and Privacy Modal ---- */
const termsModal = document.getElementById('termsModal');
const closeTerms = document.getElementById('closeTerms');
const btnTermsAccept = document.getElementById('btnTermsAccept');
const regAgreeCheckbox = document.getElementById('regAgree');

const tabTermsOfService = document.getElementById('tabTermsOfService');
const tabPrivacyPolicy = document.getElementById('tabPrivacyPolicy');
const contentTermsOfService = document.getElementById('contentTermsOfService');
const contentPrivacyPolicy = document.getElementById('contentPrivacyPolicy');

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
  if (e.target === termsModal) {
    closeTermsModal();
  }
});

tabTermsOfService?.addEventListener('click', () => switchTermsTab('terms'));
tabPrivacyPolicy?.addEventListener('click', () => switchTermsTab('privacy'));

btnTermsAccept?.addEventListener('click', () => {
  if (regAgreeCheckbox) {
    regAgreeCheckbox.checked = true;
  }
  closeTermsModal();
});