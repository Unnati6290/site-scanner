const $ = (id) => document.getElementById(id);
const SEVERITIES = ['critical', 'high', 'medium', 'low'];

// Build elements with textContent only (never innerHTML) so nothing can inject HTML
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function setMessage(text, isError = false) {
  const m = $('message');
  m.textContent = text;
  m.className = isError ? 'error' : 'ok';
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }

  if (res.status === 401) {
    logout();
    throw new Error('Session expired. Please log in again.');
  }
  if (!res.ok) throw new Error((data && data.error) || 'Request failed');
  return data;
}

function logout() {
  localStorage.removeItem('token');
  showView();
}

function showView() {
  const loggedIn = Boolean(localStorage.getItem('token'));
  $('auth-section').hidden = loggedIn;
  $('dashboard').hidden = !loggedIn;
  if (loggedIn) loadDashboard();
}

async function authenticate(path) {
  try {
    const res = await fetch(`/api/auth/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: $('email').value.trim(), password: $('password').value }),
    });
    const data = await res.json();
    if (!res.ok) return setMessage(data.error || 'Something went wrong', true);
    localStorage.setItem('token', data.token);
    $('password').value = '';
    setMessage('');
    showView();
  } catch {
    setMessage('Could not reach the server', true);
  }
}

async function loadDashboard() {
  try {
    await Promise.all([loadSites(), loadHistory()]);
  } catch (err) {
    setMessage(err.message, true);
  }
}

async function loadSites() {
  const sites = await api('/api/sites');
  const list = $('sites-list');
  list.replaceChildren();

  if (!sites.length) {
    list.append(el('p', 'muted', 'No sites yet. Add one above.'));
    return;
  }

  for (const site of sites) {
    const card = el('div', 'card');
    const head = el('div', 'row-between');
    head.append(
      el('strong', '', site.origin),
      el('span', site.verified ? 'badge verified' : 'badge pending', site.verified ? 'Verified' : 'Not verified')
    );
    card.append(head);

    if (site.verified) {
      const btn = el('button', '', 'Scan now');
      btn.dataset.action = 'scan';
      btn.dataset.origin = site.origin;
      card.append(btn);
    } else {
      card.append(
        el('p', 'muted', `Option 1: make this URL return exactly the token below: ${site.origin}/site-scanner-verify.txt`),
        el('code', '', site.token),
        el('p', 'muted', 'Option 2: add a DNS TXT record on your domain with this value:'),
        el('code', '', `site-scanner-verify=${site.token}`)
      );
      const btn = el('button', '', 'Verify');
      btn.dataset.action = 'verify';
      btn.dataset.id = site._id;
      card.append(btn);
    }
    list.append(card);
  }
}

function renderResult(scan) {
  const box = $('results');
  box.replaceChildren();
  box.append(el('p', '', `${scan.url} — ${scan.issueCount} issue(s)`));

  if (!scan.issues.length) {
    box.append(el('p', 'ok', 'No issues found by these checks.'));
    return;
  }

  const sorted = [...scan.issues].sort(
    (a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity)
  );
  for (const issue of sorted) {
    const sev = SEVERITIES.includes(issue.severity) ? issue.severity : 'low';
    const card = el('div', `card sev-${sev}`);
    const head = el('div', 'row-between');
    head.append(el('strong', '', issue.title), el('span', 'badge', sev.toUpperCase()));
    card.append(head, el('p', 'muted', issue.category), el('p', '', issue.fix));
    box.append(card);
  }
}

async function loadHistory() {
  const scans = await api('/api/scan');
  const box = $('history');
  box.replaceChildren();
  if (!scans.length) {
    box.append(el('p', 'muted', 'No scans yet.'));
    return;
  }
  for (const s of scans) {
    const btn = el('button', 'secondary history-item',
      `${s.url} — ${s.issueCount} issue(s) — ${new Date(s.createdAt).toLocaleString()}`);
    btn.dataset.action = 'view';
    btn.dataset.id = s._id;
    box.append(btn);
  }
}

// One click handler for every dynamic button (no inline onclick, which Helmet blocks)
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const { action, id, origin } = btn.dataset;

  try {
    if (action === 'verify') {
      setMessage('Checking...');
      await api(`/api/sites/${id}/verify`, { method: 'POST' });
      setMessage('Site verified!');
      await loadSites();
    } else if (action === 'scan') {
      setMessage('Scanning...');
      const scan = await api('/api/scan', { method: 'POST', body: JSON.stringify({ url: origin }) });
      renderResult(scan);
      setMessage('Scan complete');
      await loadHistory();
    } else if (action === 'view') {
      renderResult(await api(`/api/scan/${id}`));
    }
  } catch (err) {
    setMessage(err.message, true);
  }
});

$('login-btn').addEventListener('click', () => authenticate('login'));
$('register-btn').addEventListener('click', () => authenticate('register'));
$('logout-btn').addEventListener('click', logout);

$('add-site-btn').addEventListener('click', async () => {
  try {
    await api('/api/sites', { method: 'POST', body: JSON.stringify({ url: $('site-url').value.trim() }) });
    $('site-url').value = '';
    setMessage('Site added. Follow the instructions to verify it.');
    await loadSites();
  } catch (err) {
    setMessage(err.message, true);
  }
});

showView();