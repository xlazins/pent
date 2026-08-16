const scanBtn = document.getElementById('scanBtn');
const targetInput = document.getElementById('target');
const confirmBox = document.getElementById('confirm');
const statusEl = document.getElementById('status');
const resultsPanel = document.getElementById('resultsPanel');
const plainView = document.getElementById('plainView');
const rawView = document.getElementById('rawView');
const logsView = document.getElementById('logsView');

let pollTimer = null;

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    [plainView, rawView, logsView].forEach((v) => v.classList.add('hidden'));
    document.getElementById(tab.dataset.tab + 'View').classList.remove('hidden');
  });
});

scanBtn.addEventListener('click', async () => {
  const target = targetInput.value.trim();
  const confirmedOwnership = confirmBox.checked;

  if (!target) {
    statusEl.textContent = 'Enter a target first.';
    statusEl.className = 'status error';
    return;
  }
  if (!confirmedOwnership) {
    statusEl.textContent = 'You must confirm authorization before scanning.';
    statusEl.className = 'status error';
    return;
  }

  const res = await fetch('/api/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target, confirmedOwnership }),
  });
  const data = await res.json();

  if (!res.ok) {
    statusEl.textContent = data.error || 'Failed to start scan.';
    statusEl.className = 'status error';
    return;
  }

  resultsPanel.classList.remove('hidden');
  scanBtn.disabled = true;
  statusEl.textContent = 'Scan running... this can take a while for a real target.';
  statusEl.className = 'status running';

  clearInterval(pollTimer);
  pollTimer = setInterval(pollStatus, 1500);
});

async function pollStatus() {
  const res = await fetch('/api/status');
  const state = await res.json();

  logsView.textContent = state.logs.join('');
  rawView.textContent = state.rawReport || '(no output yet)';
  logsView.scrollTop = logsView.scrollHeight;

  if (state.plainReport) {
    plainView.textContent = state.plainReport;
  }

  if (!state.running && state.finishedAt) {
    clearInterval(pollTimer);
    scanBtn.disabled = false;
    if (state.error) {
      statusEl.textContent = 'Error: ' + state.error;
      statusEl.className = 'status error';
    } else {
      statusEl.textContent = 'Scan complete.';
      statusEl.className = 'status';
    }
  }
}
