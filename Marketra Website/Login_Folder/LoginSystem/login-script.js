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