const STORAGE_KEY = 'ledgerly.subscriptions.v1';
const SETTINGS_KEY = 'ledgerly.settings.v1';
const CURRENCY_OPTIONS = ['auto', 'GBP', 'USD', 'EUR', 'AUD', 'CAD', 'NZD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK'];
const CYCLE_LABELS = {
  monthly: 'Monthly',
  yearly: 'Yearly',
  custom: 'Custom',
};
const CYCLE_HELP = {
  monthly: 'Best for subscriptions that renew every month.',
  yearly: 'Useful for annual plans you do not want to forget later.',
  custom: 'Use for anything irregular and track the next payment manually.',
};

const els = {
  form: document.getElementById('subscriptionForm'),
  formTitle: document.getElementById('formTitle'),
  cancelEdit: document.getElementById('cancelEdit'),
  saveButton: document.getElementById('saveButton'),
  heroAmount: document.getElementById('heroAmount'),
  heroSupport: document.getElementById('heroSupport'),
  heroInsights: document.getElementById('heroInsights'),
  attentionList: document.getElementById('attentionList'),
  headerSummary: document.getElementById('headerSummary'),
  stats: document.getElementById('stats'),
  upcomingList: document.getElementById('upcomingList'),
  upcomingCount: document.getElementById('upcomingCount'),
  subscriptionList: document.getElementById('subscriptionList'),
  subscriptionCount: document.getElementById('subscriptionCount'),
  resetDemo: document.getElementById('resetDemo'),
  installButton: document.getElementById('installButton'),
  appModeBadge: document.getElementById('appModeBadge'),
  settingsShortcut: document.getElementById('settingsShortcut'),
  closeSettings: document.getElementById('closeSettings'),
  preferenceSummary: document.getElementById('preferenceSummary'),
  savePreferences: document.getElementById('savePreferences'),
  resetPreferences: document.getElementById('resetPreferences'),
  localeInput: document.getElementById('localeInput'),
  currencySelect: document.getElementById('currencySelect'),
  searchInput: document.getElementById('searchInput'),
  filterSelect: document.getElementById('filterSelect'),
  sortSelect: document.getElementById('sortSelect'),
  activeFilters: document.getElementById('activeFilters'),
  cycleHelper: document.getElementById('cycleHelper'),
  cycleInput: document.getElementById('cycle'),
  cycleSegments: [...document.querySelectorAll('[data-cycle]')],
  tabs: [...document.querySelectorAll('[data-section]')],
  screens: [...document.querySelectorAll('[data-section-panel]')],
  toggleCards: [...document.querySelectorAll('.toggle-card')],
  inputs: {
    id: document.getElementById('subscriptionId'),
    name: document.getElementById('name'),
    price: document.getElementById('price'),
    cycle: document.getElementById('cycle'),
    nextPaymentDate: document.getElementById('nextPaymentDate'),
    category: document.getElementById('category'),
    notes: document.getElementById('notes'),
    trial: document.getElementById('trial'),
    active: document.getElementById('active'),
  },
};

const demoSubscriptions = [
  { id: crypto.randomUUID(), name: 'Spotify', price: 10.99, cycle: 'monthly', nextPaymentDate: addDays(8), category: 'Entertainment', notes: 'Family plan', trial: false, active: true, createdAt: now() },
  { id: crypto.randomUUID(), name: 'Notion', price: 96, cycle: 'yearly', nextPaymentDate: addDays(5), category: 'Productivity', notes: 'Review before renewal', trial: true, active: true, createdAt: now() },
  { id: crypto.randomUUID(), name: 'Gym Pass', price: 30, cycle: 'monthly', nextPaymentDate: addDays(2), category: 'Health', notes: '', trial: false, active: true, createdAt: now() },
];

let subscriptions = loadSubscriptions();
if (!subscriptions.length) {
  subscriptions = demoSubscriptions.map(item => ({ ...item }));
  saveSubscriptions();
}

let settings = loadSettings();
let formatterState = buildFormatterState(settings);
let deferredPrompt = null;
let libraryState = { search: '', filter: 'all', sort: 'renewal-asc' };

populateCurrencySelect();
fillSettingsForm();
setCycle('monthly');
syncToggleCards();
setActiveSection(readInitialSection(), { pushHash: false });
renderInstallState();
render();
registerSW();

els.form.addEventListener('submit', onSubmit);
els.cancelEdit.addEventListener('click', clearForm);
els.resetDemo.addEventListener('click', () => {
  subscriptions = demoSubscriptions.map(item => ({ ...item, id: crypto.randomUUID() }));
  saveSubscriptions();
  clearForm();
  render();
  setActiveSection('overview');
});
els.savePreferences.addEventListener('click', savePreferences);
els.resetPreferences.addEventListener('click', resetPreferences);
els.installButton.addEventListener('click', installApp);
els.settingsShortcut?.addEventListener('click', () => setActiveSection('preferences'));
els.closeSettings?.addEventListener('click', () => setActiveSection('overview'));
els.tabs.forEach(tab => tab.addEventListener('click', () => setActiveSection(tab.dataset.section)));
els.searchInput?.addEventListener('input', () => {
  libraryState.search = els.searchInput.value.trim();
  render();
});
els.filterSelect?.addEventListener('change', () => {
  libraryState.filter = els.filterSelect.value;
  render();
});
els.sortSelect?.addEventListener('change', () => {
  libraryState.sort = els.sortSelect.value;
  render();
});
els.cycleSegments.forEach(button => {
  button.addEventListener('click', () => setCycle(button.dataset.cycle));
});
[els.inputs.trial, els.inputs.active].forEach(input => input?.addEventListener('change', syncToggleCards));
window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
window.addEventListener('appinstalled', onAppInstalled);
window.addEventListener('hashchange', () => {
  const section = readInitialSection();
  if (section) setActiveSection(section, { pushHash: false });
});
window.matchMedia('(display-mode: standalone)').addEventListener?.('change', renderInstallState);

function now() {
  return new Date().toISOString();
}

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

function toISODate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function loadSubscriptions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSubscriptions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
}

function loadSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return {
      locale: normalizeLocaleOrAuto(parsed.locale) || 'auto',
      currency: normalizeCurrencyOrAuto(parsed.currency) || 'auto',
    };
  } catch {
    return { locale: 'auto', currency: 'auto' };
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function normalizeLocaleOrAuto(value) {
  if (!value || value === 'auto') return 'auto';
  try {
    return Intl.getCanonicalLocales(value)[0];
  } catch {
    return null;
  }
}

function normalizeCurrencyOrAuto(value) {
  if (!value || value === 'auto') return 'auto';
  const code = String(value).trim().toUpperCase();
  return isSupportedCurrency(code) ? code : null;
}

function getBrowserLocale() {
  const candidate = normalizeLocaleOrAuto(navigator.languages?.[0] || navigator.language || 'en-GB');
  return candidate === 'auto' ? 'en-GB' : candidate || 'en-GB';
}

function buildFormatterState(preferences) {
  const resolvedLocale = preferences.locale === 'auto' ? getBrowserLocale() : preferences.locale;
  const resolvedCurrency = preferences.currency === 'auto'
    ? detectCurrencyFromLocale(resolvedLocale)
    : preferences.currency;

  return {
    locale: resolvedLocale,
    currency: isSupportedCurrency(resolvedCurrency) ? resolvedCurrency : 'USD',
    moneyFormatter: createCurrencyFormatter(resolvedLocale, resolvedCurrency),
    dateFormatter: new Intl.DateTimeFormat(resolvedLocale, { month: 'short', day: 'numeric', year: 'numeric' }),
  };
}

function createCurrencyFormatter(locale, currency) {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency });
  } catch {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  }
}

function isSupportedCurrency(code) {
  try {
    new Intl.NumberFormat('en', { style: 'currency', currency: code });
    return true;
  } catch {
    return false;
  }
}

function detectCurrencyFromLocale(localeValue) {
  const region = getRegionFromLocale(localeValue);
  const regionMap = {
    GB: 'GBP',
    US: 'USD',
    AU: 'AUD',
    CA: 'CAD',
    NZ: 'NZD',
    IE: 'EUR',
    FR: 'EUR',
    DE: 'EUR',
    ES: 'EUR',
    IT: 'EUR',
    NL: 'EUR',
    PT: 'EUR',
    BE: 'EUR',
    AT: 'EUR',
    FI: 'EUR',
    GR: 'EUR',
    JP: 'JPY',
    CH: 'CHF',
    SE: 'SEK',
    NO: 'NOK',
    DK: 'DKK',
  };
  return regionMap[region] || 'USD';
}

function getRegionFromLocale(localeValue) {
  try {
    if (typeof Intl.Locale === 'function') {
      return new Intl.Locale(localeValue).region || '';
    }
  } catch {
    // ignore
  }
  const match = String(localeValue).match(/[-_]([A-Za-z]{2})\b/);
  return match ? match[1].toUpperCase() : '';
}

function money(value) {
  return formatterState.moneyFormatter.format(Number(value || 0));
}

function formatDate(value) {
  return formatterState.dateFormatter.format(new Date(value));
}

function annualize(subscription) {
  if (!subscription.active) return 0;
  if (subscription.cycle === 'yearly' || subscription.cycle === 'custom') return Number(subscription.price) || 0;
  return (Number(subscription.price) || 0) * 12;
}

function monthlyEquivalent(subscription) {
  return annualize(subscription) / 12;
}

function daysUntil(dateValue) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateValue);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

function getUrgency(subscription) {
  const days = daysUntil(subscription.nextPaymentDate);
  if (days <= 3) return { tone: 'critical', label: days < 0 ? 'Overdue' : days === 0 ? 'Due today' : `${days}d left` };
  if (days <= 7) return { tone: 'warning', label: `${days}d left` };
  return { tone: 'neutral', label: days <= 14 ? `${days}d away` : 'Planned' };
}

function sortByRenewalAsc(a, b) {
  return new Date(a.nextPaymentDate) - new Date(b.nextPaymentDate);
}

function getCategoryLabel(subscription) {
  return subscription.category?.trim() || 'Uncategorized';
}

function getAvatarLabel(subscription) {
  const parts = String(subscription.name || '?').trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?';
}

function getCycleSummary(subscription) {
  if (subscription.cycle === 'monthly') return `${money(subscription.price)} / month`;
  if (subscription.cycle === 'yearly') return `${money(subscription.price)} / year`;
  return `${money(subscription.price)} / custom`;
}

function readForm() {
  return {
    id: els.inputs.id.value || crypto.randomUUID(),
    name: els.inputs.name.value.trim(),
    price: Number(els.inputs.price.value),
    cycle: els.inputs.cycle.value,
    nextPaymentDate: els.inputs.nextPaymentDate.value,
    category: els.inputs.category.value.trim(),
    notes: els.inputs.notes.value.trim(),
    trial: els.inputs.trial.checked,
    active: els.inputs.active.checked,
    createdAt: subscriptions.find(item => item.id === els.inputs.id.value)?.createdAt || now(),
  };
}

function onSubmit(event) {
  event.preventDefault();
  const data = readForm();
  const existingIndex = subscriptions.findIndex(item => item.id === data.id);
  if (existingIndex >= 0) subscriptions[existingIndex] = data;
  else subscriptions.unshift(data);
  saveSubscriptions();
  clearForm();
  render();
  setActiveSection('library');
}

function fillForm(subscription) {
  if (!subscription) return;
  els.inputs.id.value = subscription.id;
  els.inputs.name.value = subscription.name;
  els.inputs.price.value = subscription.price;
  els.inputs.nextPaymentDate.value = subscription.nextPaymentDate;
  els.inputs.category.value = subscription.category || '';
  els.inputs.notes.value = subscription.notes || '';
  els.inputs.trial.checked = !!subscription.trial;
  els.inputs.active.checked = !!subscription.active;
  setCycle(subscription.cycle || 'monthly');
  syncToggleCards();
  els.formTitle.textContent = 'Edit subscription';
  els.saveButton.textContent = 'Update subscription';
  els.cancelEdit.classList.remove('hidden');
  setActiveSection('editor');
  els.inputs.name.focus();
}

function clearForm() {
  els.form.reset();
  els.inputs.id.value = '';
  setCycle('monthly');
  els.inputs.active.checked = true;
  els.formTitle.textContent = 'Add subscription';
  els.saveButton.textContent = 'Save subscription';
  els.cancelEdit.classList.add('hidden');
  syncToggleCards();
}

function setCycle(cycle) {
  const next = CYCLE_LABELS[cycle] ? cycle : 'monthly';
  els.cycleInput.value = next;
  els.cycleSegments.forEach(button => button.classList.toggle('active', button.dataset.cycle === next));
  if (els.cycleHelper) els.cycleHelper.textContent = CYCLE_HELP[next];
}

function syncToggleCards() {
  els.toggleCards.forEach(card => {
    const input = card.querySelector('input');
    card.classList.toggle('selected', !!input?.checked);
  });
}

function removeSubscription(id) {
  subscriptions = subscriptions.filter(item => item.id !== id);
  saveSubscriptions();
  render();
  if (els.inputs.id.value === id) clearForm();
}

function getFilteredSubscriptions() {
  const search = libraryState.search.trim().toLowerCase();
  let items = [...subscriptions];

  if (search) {
    items = items.filter(item => [item.name, item.category, item.notes].join(' ').toLowerCase().includes(search));
  }

  switch (libraryState.filter) {
    case 'active':
      items = items.filter(item => item.active);
      break;
    case 'trial':
      items = items.filter(item => item.trial);
      break;
    case 'cancelled':
      items = items.filter(item => !item.active);
      break;
    case 'due-soon':
      items = items.filter(item => item.active && daysUntil(item.nextPaymentDate) <= 7);
      break;
    default:
      break;
  }

  const sorters = {
    'renewal-asc': (a, b) => new Date(a.nextPaymentDate) - new Date(b.nextPaymentDate),
    'price-desc': (a, b) => Number(b.price) - Number(a.price),
    'price-asc': (a, b) => Number(a.price) - Number(b.price),
    'name-asc': (a, b) => a.name.localeCompare(b.name),
    'name-desc': (a, b) => b.name.localeCompare(a.name),
    newest: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
  };

  items.sort(sorters[libraryState.sort] || sorters['renewal-asc']);
  return items;
}

function render() {
  const sorted = [...subscriptions].sort(sortByRenewalAsc);
  const active = sorted.filter(item => item.active);
  const monthlyTotal = active.reduce((sum, item) => sum + monthlyEquivalent(item), 0);
  const yearlyTotal = active.reduce((sum, item) => sum + annualize(item), 0);
  const trialCount = active.filter(item => item.trial).length;
  const dueSoon = active.filter(item => daysUntil(item.nextPaymentDate) <= 7).length;
  const upcoming = active.slice(0, 5);
  const largest = active.reduce((best, item) => annualize(item) > annualize(best || {}) ? item : best, null);
  const filtered = getFilteredSubscriptions();

  els.headerSummary.textContent = `${active.length} active · ${money(monthlyTotal)}/month · ${dueSoon} due soon`;
  els.heroAmount.textContent = money(monthlyTotal);
  els.heroSupport.textContent = `Annual equivalent ${money(yearlyTotal)}`;
  els.heroInsights.innerHTML = [
    renderInsight('Renewals', `${dueSoon} in 7 days`),
    renderInsight('Trials', `${trialCount} flagged`),
    renderInsight('Largest spend', largest ? `${largest.name} · ${money(largest.cycle === 'monthly' ? largest.price : largest.price / 12)}/mo` : 'Nothing yet'),
  ].join('');

  els.attentionList.innerHTML = renderAttentionItems(active, dueSoon, trialCount, largest).join('');
  els.stats.innerHTML = [
    stat('Saved', subscriptions.length, 'All records'),
    stat('Active', active.length, 'Included in totals'),
    stat('Cancelled', subscriptions.length - active.length, 'Kept for reference'),
    stat('Annual total', money(yearlyTotal), 'Across active plans'),
  ].join('');

  els.upcomingCount.textContent = dueSoon ? `${dueSoon} urgent` : `${upcoming.length} planned`;
  els.upcomingList.innerHTML = upcoming.length
    ? upcoming.map(renderUpcoming).join('')
    : renderEmpty('No active renewals coming up.', 'A suspiciously calm week.');

  els.subscriptionCount.textContent = `${filtered.length} shown`;
  els.subscriptionList.innerHTML = filtered.length
    ? filtered.map(renderSubscription).join('')
    : renderEmpty('No subscriptions match that view.', 'Try a different filter or search.');

  renderActiveFilters(filtered.length);
  renderPreferenceSummary();
  bindCardActions();
}

function renderInsight(label, value) {
  return `<div class="insight-chip"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function renderAttentionItems(active, dueSoon, trialCount, largest) {
  const items = [];
  if (dueSoon) {
    items.push(attentionItem('warning', 'Due soon', `${dueSoon} subscription${dueSoon === 1 ? '' : 's'} renew in the next 7 days.`));
  }
  if (trialCount) {
    items.push(attentionItem('critical', 'Trials to review', `${trialCount} trial${trialCount === 1 ? '' : 's'} still need a decision before billing.`));
  }
  if (largest) {
    items.push(attentionItem('teal', 'Largest subscription', `${largest.name} is your biggest current line item.`));
  }
  if (!items.length) {
    items.push(attentionItem('success', 'All quiet', 'No urgent renewals or trials are demanding attention right now.'));
  }
  return items;
}

function attentionItem(tone, label, text) {
  return `<article class="attention-item ${tone}"><div class="attention-label">${escapeHtml(label)}</div><strong>${escapeHtml(text.split('.')[0])}</strong><p>${escapeHtml(text)}</p></article>`;
}

function renderUpcoming(subscription) {
  const urgency = getUrgency(subscription);
  return `<article class="renewal-item ${urgency.tone}">
    <div class="renewal-main">
      <div class="service-mark">${escapeHtml(getAvatarLabel(subscription))}</div>
      <div>
        <h3 class="item-name">${escapeHtml(subscription.name)}</h3>
        <p class="item-meta">${escapeHtml(getCategoryLabel(subscription))} · ${escapeHtml(CYCLE_LABELS[subscription.cycle] || subscription.cycle)}</p>
      </div>
    </div>
    <div class="renewal-side">
      <div class="item-price">${money(subscription.price)}</div>
      <div class="renewal-date">${formatDate(subscription.nextPaymentDate)}</div>
      <span class="urgency-pill ${urgency.tone}">${escapeHtml(urgency.label)}</span>
    </div>
  </article>`;
}

function renderSubscription(subscription) {
  const urgency = getUrgency(subscription);
  const notes = subscription.notes ? `<p class="item-notes">${escapeHtml(subscription.notes)}</p>` : '';
  const dueTone = subscription.active ? urgency.tone : 'neutral';
  return `<article class="subscription-item" data-id="${subscription.id}">
    <button class="item-card-button" type="button" data-edit="${subscription.id}">
      <div class="item-head">
        <div class="item-identity">
          <div class="service-mark">${escapeHtml(getAvatarLabel(subscription))}</div>
          <div>
            <h3 class="item-name">${escapeHtml(subscription.name)}</h3>
            <p class="item-meta">${escapeHtml(getCategoryLabel(subscription))} · ${escapeHtml(getCycleSummary(subscription))}</p>
          </div>
        </div>
        <div class="item-price-block">
          <div class="item-price">${money(subscription.price)}</div>
          <div class="item-meta">${escapeHtml(CYCLE_LABELS[subscription.cycle] || subscription.cycle)}</div>
        </div>
      </div>

      <div class="renewal-row">
        <div>
          <div class="row-label">Next payment</div>
          <div class="renewal-date">${formatDate(subscription.nextPaymentDate)}</div>
        </div>
        <span class="urgency-pill ${dueTone}">${subscription.active ? escapeHtml(urgency.label) : 'Inactive'}</span>
      </div>

      <div class="item-badges">
        <span class="badge ${subscription.active ? 'success' : 'outline'}">${subscription.active ? 'Active' : 'Cancelled'}</span>
        ${subscription.trial ? '<span class="badge warning">Trial</span>' : ''}
        <span class="badge neutral">${escapeHtml(getCategoryLabel(subscription))}</span>
      </div>
      ${notes}
    </button>
    <div class="item-actions compact-actions">
      <button class="ghost utility" type="button" data-edit="${subscription.id}">Edit</button>
      <button class="danger utility" type="button" data-delete="${subscription.id}">Delete</button>
    </div>
  </article>`;
}

function renderEmpty(title, text) {
  return `<div class="empty"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(text)}</span></div>`;
}

function stat(label, value, hint) {
  return `<div class="stat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong><small>${escapeHtml(hint)}</small></div>`;
}

function renderActiveFilters(count) {
  const chips = [];
  if (libraryState.search) chips.push(`<div class="filter-chip">Search · ${escapeHtml(libraryState.search)}</div>`);
  if (libraryState.filter !== 'all') chips.push(`<div class="filter-chip">Filter · ${escapeHtml(els.filterSelect.selectedOptions[0].textContent)}</div>`);
  if (libraryState.sort !== 'renewal-asc') chips.push(`<div class="filter-chip passive">Sort · ${escapeHtml(els.sortSelect.selectedOptions[0].textContent)}</div>`);
  if (!chips.length) chips.push(`<div class="filter-chip passive">Showing ${count} subscription${count === 1 ? '' : 's'}</div>`);
  els.activeFilters.innerHTML = chips.join('');
}

function bindCardActions() {
  els.subscriptionList.querySelectorAll('[data-edit]').forEach(button => {
    button.onclick = () => fillForm(subscriptions.find(item => item.id === button.dataset.edit));
  });

  els.subscriptionList.querySelectorAll('[data-delete]').forEach(button => {
    button.onclick = event => {
      event.stopPropagation();
      if (confirm('Delete this subscription?')) removeSubscription(button.dataset.delete);
    };
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[match]));
}

function populateCurrencySelect() {
  els.currencySelect.innerHTML = CURRENCY_OPTIONS.map(code => `<option value="${code}">${code === 'auto' ? 'Automatic' : code}</option>`).join('');
}

function fillSettingsForm() {
  els.localeInput.value = settings.locale === 'auto' ? '' : settings.locale;
  els.currencySelect.value = settings.currency || 'auto';
}

function renderPreferenceSummary() {
  const localeSource = settings.locale === 'auto' ? 'Automatic locale' : 'Pinned locale';
  const currencySource = settings.currency === 'auto' ? 'Automatic currency' : 'Pinned currency';
  els.preferenceSummary.innerHTML = [
    preferenceChip(localeSource, formatterState.locale),
    preferenceChip(currencySource, formatterState.currency),
    preferenceChip('Preview', money(19.99)),
  ].join('');
}

function preferenceChip(label, value) {
  return `<div class="preference-chip"><strong>${escapeHtml(label)}:</strong>&nbsp;${escapeHtml(value)}</div>`;
}

function savePreferences() {
  const nextLocale = normalizeLocaleOrAuto(els.localeInput.value.trim() || 'auto');
  const nextCurrency = normalizeCurrencyOrAuto(els.currencySelect.value || 'auto');

  if (!nextLocale) {
    alert('That locale is not valid. Try something like en-GB or leave it blank for automatic detection.');
    return;
  }
  if (!nextCurrency) {
    alert('That currency code is not supported in this browser.');
    return;
  }

  settings = { locale: nextLocale, currency: nextCurrency };
  formatterState = buildFormatterState(settings);
  saveSettings();
  fillSettingsForm();
  render();
}

function resetPreferences() {
  settings = { locale: 'auto', currency: 'auto' };
  formatterState = buildFormatterState(settings);
  saveSettings();
  fillSettingsForm();
  render();
}

function readInitialSection() {
  const hash = window.location.hash.replace('#', '').trim();
  return ['overview', 'editor', 'library', 'preferences'].includes(hash) ? hash : 'overview';
}

function setActiveSection(section, options = {}) {
  const { pushHash = true } = options;
  const nextSection = ['overview', 'editor', 'library', 'preferences'].includes(section) ? section : 'overview';
  els.tabs.forEach(tab => {
    const active = tab.dataset.section === nextSection;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  els.screens.forEach(screen => {
    const active = screen.dataset.sectionPanel === nextSection;
    screen.classList.toggle('active', active);
    screen.hidden = !active;
  });
  if (pushHash) history.replaceState(null, '', `#${nextSection}`);
}

function onBeforeInstallPrompt(event) {
  event.preventDefault();
  deferredPrompt = event;
  renderInstallState();
}

async function installApp() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice.catch(() => null);
  deferredPrompt = null;
  renderInstallState();
}

function onAppInstalled() {
  deferredPrompt = null;
  renderInstallState();
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function renderInstallState() {
  const standalone = isStandalone();
  els.appModeBadge.textContent = standalone ? 'Installed mode' : 'Browser mode';
  els.installButton.classList.toggle('hidden', standalone || !deferredPrompt);
}

async function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('./service-worker.js');
  } catch {
    // ignore
  }
}
