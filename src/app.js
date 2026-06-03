/**
 * EduFinance — School Financial Management System
 * src/app.js — Additional application logic
 *
 * NOTE: Core config, state, API, auth, boot, settings, grades,
 * students, history, terms, term fees, fee payments, fee tracking,
 * and receipts are all defined inline in index.html.
 *
 * This file contains: Expenses, Reports, Dashboard, Navigation,
 * Modals, Confirm, Toast, Utils, and the session-restore boot check.
 */

// ══ EXPENSES ══════════════════════════════════════
let _expData = [], _expPieChart = null;

async function loadExpenses(termId) {
  const tb = document.getElementById('exp-tbody');
  tb.innerHTML = '<tr><td colspan="6"><div class="loading"><div class="spin"></div></div></td></tr>';
  try {
    _expData = await api(`/rest/v1/ef_expenses?term_id=eq.${termId}&select=*&order=expense_date.desc`) || [];
    renderExpTable(_expData);
    renderExpCharts(_expData);
    await loadCats();
  } catch(e) {
    tb.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text3)">No expenses</td></tr>';
  }
}

function renderExpTable(d) {
  const tb = document.getElementById('exp-tbody');
  if (!d.length) {
    tb.innerHTML = '<tr><td colspan="6"><div class="empty"><div class="empty-t">No expenses recorded</div></div></td></tr>';
    return;
  }
  tb.innerHTML = d.map(e => `<tr>
    <td class="bold">${e.description}</td>
    <td><span class="badge bg-blue">${e.category}</span></td>
    <td class="td-m">${e.supplier || '—'}</td>
    <td class="td-m">${e.expense_date || '—'}</td>
    <td class="bold mono" style="color:var(--amber-mid)">KSh ${fmt(e.amount)}</td>
    <td><div class="flex g8">
      <button class="btn btn-ghost btn-xs" onclick="editExpense('${e.id}')">
        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <button class="btn btn-danger btn-xs" onclick="deleteExpense('${e.id}')">Del</button>
    </div></td>
  </tr>`).join('');
}

function filterExpenses() {
  const c = document.getElementById('exp-cat-f').value;
  renderExpTable(c ? _expData.filter(e => e.category === c) : _expData);
}

function renderExpCharts(d) {
  const total = d.reduce((s, e) => s + e.amount, 0);
  document.getElementById('exp-total').textContent = 'KSh ' + fmt(total);

  const byCat = {};
  d.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
  const cats = Object.keys(byCat);
  const vals = cats.map(c => byCat[c]);
  const colors = ['#1a3c6e','#166534','#92400e','#991b1b','#6d28d9','#0369a1','#c2410c','#065f46'];

  document.getElementById('exp-cat-bars').innerHTML = cats.map((c, i) => {
    const pct = total > 0 ? Math.round(byCat[c] / total * 100) : 0;
    return `<div style="margin-bottom:10px">
      <div class="flex jb text-sm mb8" style="margin-bottom:3px">
        <span class="c2">${c}</span>
        <span class="mono bold">KSh ${fmt(byCat[c])}</span>
      </div>
      <div class="prog"><div class="prog-fill" style="width:${pct}%;background:${colors[i % colors.length]}"></div></div>
    </div>`;
  }).join('');

  document.getElementById('exp-pie-leg').innerHTML = cats.map((c, i) =>
    `<div style="display:flex;align-items:center;gap:5px">
      <div class="leg-dot" style="background:${colors[i % colors.length]}"></div>${c}
    </div>`
  ).join('');

  if (_expPieChart) _expPieChart.destroy();
  const ctx = document.getElementById('expPieC').getContext('2d');
  _expPieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: cats,
      datasets: [{ data: vals, backgroundColor: colors.slice(0, cats.length), borderWidth: 2, borderColor: '#fff' }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '60%' }
  });
}

function editExpense(id) {
  const e = _expData.find(x => x.id === id);
  if (!e) return;
  document.getElementById('ne-id').value = id;
  document.getElementById('ne-desc').value = e.description;
  document.getElementById('ne-amount').value = e.amount;
  document.getElementById('ne-date').value = e.expense_date || '';
  document.getElementById('ne-supplier').value = e.supplier || '';
  document.getElementById('ne-cat').value = e.category;
  openM('m-add-expense');
}

async function saveExpense() {
  const eid = document.getElementById('ne-id').value;
  const desc = document.getElementById('ne-desc').value.trim();
  const cat = document.getElementById('ne-cat').value;
  const amount = parseFloat(document.getElementById('ne-amount').value);
  const date = document.getElementById('ne-date').value;
  if (!desc || !cat || !amount || !date) { toast('All required fields needed', 'error'); return; }
  try {
    if (eid) {
      await api(`/rest/v1/ef_expenses?id=eq.${eid}`, 'PATCH', {
        description: desc, category: cat, amount,
        expense_date: date, supplier: document.getElementById('ne-supplier').value.trim() || null
      });
      toast('Expense updated', 'success');
    } else {
      await api('/rest/v1/ef_expenses', 'POST', {
        term_id: _curTermId, description: desc, category: cat, amount,
        expense_date: date, supplier: document.getElementById('ne-supplier').value.trim() || null
      });
      toast('Expense added', 'success');
    }
    closeM('m-add-expense');
    document.getElementById('ne-id').value = '';
    ['ne-desc', 'ne-amount', 'ne-supplier'].forEach(id => document.getElementById(id).value = '');
    await loadExpenses(_curTermId);
  } catch(e) { toast('Failed: ' + e.message, 'error'); }
}

async function deleteExpense(id) {
  const e = _expData.find(x => x.id === id);
  confirm2('Delete expense', 'Remove this expense record?', async () => {
    try {
      await api(`/rest/v1/ef_expenses?id=eq.${id}`, 'DELETE');
      await loadExpenses(_curTermId);
      toastWithUndo('Expense deleted', async () => {
        await api('/rest/v1/ef_expenses', 'POST', { ...e, id: undefined });
        await loadExpenses(_curTermId);
      });
    } catch(e2) { toast('Failed', 'error'); }
  });
}

// ══ REPORTS ═══════════════════════════════════════
let _repBarChart = null, _repPieChart = null;

async function loadReports() {
  const tid = document.getElementById('rep-term-sel').value;
  if (!tid) {
    document.getElementById('rep-content').innerHTML = '<div class="loading">Select a term to view report</div>';
    return;
  }
  document.getElementById('rep-content').innerHTML = '<div class="loading"><div class="spin"></div> Loading report…</div>';
  try {
    const [fees, expenses] = await Promise.all([
      api(`/rest/v1/ef_student_fees?term_id=eq.${tid}&select=*,ef_students(ef_grades(name))`),
      api(`/rest/v1/ef_expenses?term_id=eq.${tid}&select=amount,category,description,expense_date`)
    ]);
    const tname = TERMS.find(t => t.id === tid)?.name || '';
    const expected = (fees || []).reduce((s, f) => s + f.expected, 0);
    const collected = (fees || []).reduce((s, f) => s + f.paid, 0);
    const outstanding = expected - collected;
    const totalExp = (expenses || []).reduce((s, e) => s + e.amount, 0);
    const net = collected - totalExp;
    const paid = (fees || []).filter(f => f.status === 'paid').length;
    const partial = (fees || []).filter(f => f.status === 'partial').length;
    const due = (fees || []).filter(f => f.status === 'due').length;

    const byG = {};
    (fees || []).forEach(f => {
      const gn = f.ef_students?.ef_grades?.name || 'Unknown';
      if (!byG[gn]) byG[gn] = { e: 0, p: 0, count: 0 };
      byG[gn].e += f.expected;
      byG[gn].p += f.paid;
      byG[gn].count++;
    });
    const gns = Object.keys(byG);

    document.getElementById('rep-content').innerHTML = `
      <div id="rep-print-area">
        <div class="flex ac jb mb20" style="padding-bottom:14px;border-bottom:2px solid var(--navy)">
          <div class="flex ac g12">
            ${_logoDataUrl ? `<img src="${_logoDataUrl}" style="width:44px;height:44px;object-fit:contain;border-radius:7px">` : ''}
            <div>
              <div style="font-family:var(--display);font-size:19px;font-weight:700;color:var(--navy)">${SETTINGS.school_name || 'School'}</div>
              <div class="c3 text-sm">Financial Report — ${tname}</div>
            </div>
          </div>
          <div class="text-sm c3">Generated: ${new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
        <div class="metrics-row">
          <div class="metric-card"><div class="mc-icon" style="background:var(--navy-light)"><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#1a3c6e" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="mc-label">Expected</div><div class="mc-value mono">${fmt(expected)}</div></div>
          <div class="metric-card"><div class="mc-icon" style="background:var(--green-bg)"><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#166534" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div><div class="mc-label">Collected</div><div class="mc-value mono text-green">${fmt(collected)}</div></div>
          <div class="metric-card"><div class="mc-icon" style="background:var(--red-bg)"><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#991b1b" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg></div><div class="mc-label">Outstanding</div><div class="mc-value mono text-red">${fmt(outstanding)}</div></div>
          <div class="metric-card"><div class="mc-icon" style="background:var(--amber-bg)"><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#92400e" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div><div class="mc-label">Expenses</div><div class="mc-value mono" style="color:var(--amber-mid)">${fmt(totalExp)}</div></div>
          <div class="metric-card"><div class="mc-icon" style="background:var(--green-bg)"><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#166534" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg></div><div class="mc-label">Net balance</div><div class="mc-value mono text-green">${fmt(net)}</div></div>
        </div>
        <div class="chart-grid">
          <div class="chart-card chart-full">
            <div class="chart-title">Expected vs collected by grade</div>
            <div class="legend">
              <div style="display:flex;align-items:center;gap:5px"><div class="leg-dot" style="background:#dbeafe;border:1.5px solid #1a3c6e"></div>Expected</div>
              <div style="display:flex;align-items:center;gap:5px"><div class="leg-dot" style="background:#166534"></div>Collected</div>
            </div>
            <div style="position:relative;height:220px"><canvas id="repBarC"></canvas></div>
          </div>
          <div class="chart-card">
            <div class="chart-title">Payment status</div>
            <div class="legend" id="rep-pie-leg"></div>
            <div style="position:relative;height:175px"><canvas id="repPieC"></canvas></div>
          </div>
          <div class="chart-card">
            <div class="chart-title">Per-grade breakdown</div>
            <table style="width:100%;font-size:12.5px;border-collapse:collapse">
              <thead><tr style="border-bottom:1px solid var(--border)">
                <th style="padding:5px 6px;text-align:left;color:var(--text3);font-size:10.5px;text-transform:uppercase;font-weight:700">Grade</th>
                <th style="padding:5px 6px;text-align:right;color:var(--text3);font-size:10.5px;text-transform:uppercase;font-weight:700">Expected</th>
                <th style="padding:5px 6px;text-align:right;color:var(--text3);font-size:10.5px;text-transform:uppercase;font-weight:700">Collected</th>
                <th style="padding:5px 6px;text-align:right;color:var(--text3);font-size:10.5px;text-transform:uppercase;font-weight:700">Rate</th>
              </tr></thead>
              <tbody>${gns.map(g => {
                const gd = byG[g];
                const pct = gd.e > 0 ? Math.round(gd.p / gd.e * 100) : 0;
                return `<tr style="border-bottom:1px solid var(--border)">
                  <td style="padding:6px">${g}</td>
                  <td style="padding:6px;text-align:right;font-variant-numeric:tabular-nums">${fmt(gd.e)}</td>
                  <td style="padding:6px;text-align:right;font-variant-numeric:tabular-nums;color:var(--green-mid)">${fmt(gd.p)}</td>
                  <td style="padding:6px;text-align:right"><span class="badge ${pct >= 80 ? 'bg-green' : pct >= 50 ? 'bg-amber' : 'bg-red'}">${pct}%</span></td>
                </tr>`;
              }).join('')}</tbody>
            </table>
          </div>
        </div>
        <div class="card mt16">
          <div class="card-header"><div class="card-title">Expense breakdown</div></div>
          <div class="card-body">
            <table style="width:100%;font-size:12.5px;border-collapse:collapse">
              <thead><tr style="border-bottom:1px solid var(--border)">
                <th style="padding:5px 6px;text-align:left;color:var(--text3);font-size:10.5px;text-transform:uppercase;font-weight:700">Description</th>
                <th style="padding:5px 6px;text-align:left;color:var(--text3);font-size:10.5px;text-transform:uppercase;font-weight:700">Category</th>
                <th style="padding:5px 6px;text-align:left;color:var(--text3);font-size:10.5px;text-transform:uppercase;font-weight:700">Date</th>
                <th style="padding:5px 6px;text-align:right;color:var(--text3);font-size:10.5px;text-transform:uppercase;font-weight:700">Amount</th>
              </tr></thead>
              <tbody>
                ${(expenses || []).map(e => `<tr style="border-bottom:1px solid var(--border)">
                  <td style="padding:6px">${e.description}</td>
                  <td style="padding:6px"><span class="badge bg-blue">${e.category}</span></td>
                  <td style="padding:6px;color:var(--text3)">${e.expense_date || '—'}</td>
                  <td style="padding:6px;text-align:right;font-variant-numeric:tabular-nums;font-weight:700;color:var(--amber-mid)">KSh ${fmt(e.amount)}</td>
                </tr>`).join('')}
                <tr style="background:var(--surface2)">
                  <td colspan="3" style="padding:7px 6px;font-weight:700;color:var(--text)">Total expenses</td>
                  <td style="padding:7px 6px;text-align:right;font-weight:700;font-variant-numeric:tabular-nums;color:var(--amber-mid)">KSh ${fmt(totalExp)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Charts
    const tick = { color: '#8a97aa', font: { size: 10, family: 'Lato' } };
    const grid = { color: 'rgba(0,0,0,0.05)' };

    if (_repBarChart) _repBarChart.destroy();
    _repBarChart = new Chart(document.getElementById('repBarC').getContext('2d'), {
      type: 'bar',
      data: {
        labels: gns,
        datasets: [
          { label: 'Expected', data: gns.map(g => byG[g].e), backgroundColor: '#dbeafe', borderColor: '#1a3c6e', borderWidth: 1.5, borderRadius: 4 },
          { label: 'Collected', data: gns.map(g => byG[g].p), backgroundColor: '#166534', borderWidth: 0, borderRadius: 4 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { ticks: { ...tick, callback: v => 'KSh ' + fmt(v) }, grid }, x: { ticks: tick, grid: { display: false } } }
      }
    });

    document.getElementById('rep-pie-leg').innerHTML =
      `<div style="display:flex;align-items:center;gap:5px"><div class="leg-dot" style="background:#166534"></div>Paid ${paid}</div>` +
      `<div style="display:flex;align-items:center;gap:5px"><div class="leg-dot" style="background:#d97706"></div>Partial ${partial}</div>` +
      `<div style="display:flex;align-items:center;gap:5px"><div class="leg-dot" style="background:#dc2626"></div>Due ${due}</div>`;

    if (_repPieChart) _repPieChart.destroy();
    _repPieChart = new Chart(document.getElementById('repPieC').getContext('2d'), {
      type: 'doughnut',
      data: { datasets: [{ data: [paid, partial, due], backgroundColor: ['#166534', '#d97706', '#dc2626'], borderWidth: 2, borderColor: '#fff' }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '58%' }
    });

  } catch(e) {
    document.getElementById('rep-content').innerHTML = '<div class="empty"><div class="empty-t">Failed to load report</div></div>';
  }
}

async function exportCSV() {
  const tid = document.getElementById('rep-term-sel').value;
  if (!tid) { toast('Select a term first', 'error'); return; }
  try {
    const fees = await api(`/rest/v1/ef_student_fees?term_id=eq.${tid}&select=*,ef_students(full_name,admission_no,parent_name,parent_phone,ef_grades(name)),ef_terms(name)`);
    const rows = [['Student', 'Adm No', 'Grade', 'Parent', 'Phone', 'Expected', 'Paid', 'Balance', 'Status', 'Term']];
    (fees || []).forEach(f => rows.push([
      f.ef_students?.full_name || '', f.ef_students?.admission_no || '',
      f.ef_students?.ef_grades?.name || '', f.ef_students?.parent_name || '',
      f.ef_students?.parent_phone || '', f.expected, f.paid,
      f.expected - f.paid, f.status, f.ef_terms?.name || ''
    ]));
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `report-${TERMS.find(t => t.id === tid)?.name || tid}.csv`;
    a.click();
    toast('CSV exported', 'success');
  } catch(e) { toast('Export failed', 'error'); }
}

// ══ DASHBOARD ═════════════════════════════════════
let _dashPie = null, _dashBar = null, _dashLine = null;

async function loadDashboard() {
  const tidEl = document.getElementById('dash-term-sel');
  let tid = tidEl.value;
  if (!tid && _activeTerm) { tid = _activeTerm.id; tidEl.value = tid; }
  if (!tid) {
    document.getElementById('dash-term-label').textContent = 'No terms yet — create one in Fee Setup';
    return;
  }
  const tname = TERMS.find(t => t.id === tid)?.name || '';
  document.getElementById('dash-term-label').textContent = tname + (TERMS.find(t => t.id === tid)?.is_active ? ' · Active term' : '');

  try {
    const [fees, expenses] = await Promise.all([
      api(`/rest/v1/ef_student_fees?term_id=eq.${tid}&select=*,ef_students(ef_grades(name))`),
      api(`/rest/v1/ef_expenses?term_id=eq.${tid}&select=amount`)
    ]);
    const expected = (fees || []).reduce((s, f) => s + f.expected, 0);
    const collected = (fees || []).reduce((s, f) => s + f.paid, 0);
    const outstanding = expected - collected;
    const pct = expected > 0 ? Math.round(collected / expected * 100) : 0;
    const paid = (fees || []).filter(f => f.status === 'paid').length;
    const partial = (fees || []).filter(f => f.status === 'partial').length;
    const due = (fees || []).filter(f => f.status === 'due').length;

    document.getElementById('m-exp').textContent = 'KSh ' + fmt(expected);
    document.getElementById('m-col').textContent = 'KSh ' + fmt(collected);
    document.getElementById('m-out').textContent = 'KSh ' + fmt(outstanding);
    document.getElementById('m-stu').textContent = fees.length;
    document.getElementById('m-pct').textContent = pct + '% collected';
    document.getElementById('m-paid-c').textContent = paid + ' fully paid';

    // Pie chart
    if (_dashPie) _dashPie.destroy();
    document.getElementById('dash-pie-leg').innerHTML =
      `<div style="display:flex;align-items:center;gap:5px"><div class="leg-dot" style="background:#166534"></div>Paid (${paid})</div>` +
      `<div style="display:flex;align-items:center;gap:5px"><div class="leg-dot" style="background:#d97706"></div>Partial (${partial})</div>` +
      `<div style="display:flex;align-items:center;gap:5px"><div class="leg-dot" style="background:#dc2626"></div>Due (${due})</div>`;
    _dashPie = new Chart(document.getElementById('dashPieC').getContext('2d'), {
      type: 'doughnut',
      data: { datasets: [{ data: [paid, partial, due], backgroundColor: ['#166534', '#d97706', '#dc2626'], borderWidth: 2, borderColor: '#fff' }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '64%' }
    });

    // Grade bar chart
    const byG = {};
    (fees || []).forEach(f => {
      const gn = f.ef_students?.ef_grades?.name || 'Unknown';
      if (!byG[gn]) byG[gn] = { e: 0, p: 0 };
      byG[gn].e += f.expected;
      byG[gn].p += f.paid;
    });
    const gns = Object.keys(byG);
    const tick = { color: '#8a97aa', font: { size: 10, family: 'Lato' } };
    if (_dashBar) _dashBar.destroy();
    _dashBar = new Chart(document.getElementById('dashBarC').getContext('2d'), {
      type: 'bar',
      data: {
        labels: gns,
        datasets: [{
          data: gns.map(g => byG[g].e > 0 ? Math.round(byG[g].p / byG[g].e * 100) : 0),
          backgroundColor: gns.map(g => {
            const p = byG[g].e > 0 ? byG[g].p / byG[g].e : 0;
            return p >= 0.8 ? '#166534' : p >= 0.5 ? '#d97706' : '#dc2626';
          }),
          borderWidth: 0, borderRadius: 4
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { min: 0, max: 100, ticks: { ...tick, callback: v => v + '%' }, grid: { color: 'rgba(0,0,0,0.05)' } },
          x: { ticks: tick, grid: { display: false } }
        }
      }
    });

    // Payment activity line chart
    const payments = await api('/rest/v1/ef_payments?select=amount,paid_at,fee_id&order=paid_at.asc');
    const fids = new Set((fees || []).map(f => f.id));
    const tp = (payments || []).filter(p => fids.has(p.fee_id));
    const byDay = {};
    tp.forEach(p => { const d = p.paid_at?.slice(0, 10); if (d) byDay[d] = (byDay[d] || 0) + p.amount; });
    const days = Object.keys(byDay).sort();
    if (_dashLine) _dashLine.destroy();
    _dashLine = new Chart(document.getElementById('dashLineC').getContext('2d'), {
      type: 'line',
      data: {
        labels: days,
        datasets: [{
          data: days.map(d => byDay[d]),
          borderColor: '#1a3c6e', backgroundColor: 'rgba(26,60,110,0.06)',
          tension: 0.4, fill: true, pointRadius: 3, borderWidth: 2, pointBackgroundColor: '#1a3c6e'
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { ticks: { ...tick, callback: v => 'KSh ' + fmt(v) }, grid: { color: 'rgba(0,0,0,0.05)' } },
          x: { ticks: tick, grid: { display: false } }
        }
      }
    });

    // Red flags
    const flags = [];
    if (due > 0) flags.push(`<div class="alert a-red"><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> <strong>${due} student${due > 1 ? 's' : ''}</strong> have not made any payment this term</div>`);
    if (partial > 0) flags.push(`<div class="alert a-amber"><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> <strong>${partial}</strong> students have partial payments — follow-up needed</div>`);
    gns.forEach(g => {
      const gd = byG[g];
      const p = gd.e > 0 ? gd.p / gd.e : 0;
      if (p < 0.4 && gd.e > 0) flags.push(`<div class="alert a-red"><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><line x1="12" y1="20" x2="12" y2="10"/><line x1="12" y1="6" x2="12.01" y2="6"/></svg> <strong>${g}</strong> — only ${Math.round(p * 100)}% collection rate</div>`);
    });
    if (pct >= 90) flags.push(`<div class="alert a-green"><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Excellent — <strong>${pct}%</strong> of fees collected this term</div>`);
    document.getElementById('dash-flags').innerHTML = flags.length ? flags.join('') : '<div class="alert a-green"><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> No critical issues this term</div>';

    // Notification dot
    if (due > 0) document.getElementById('notif-dot').classList.add('show');
    else document.getElementById('notif-dot').classList.remove('show');

  } catch(e) { console.error(e); }
}

// ══ NAVIGATION ════════════════════════════════════
const PAGE_TITLES = {
  dashboard: 'Dashboard', 'all-students': 'Students', grades: 'Grades & Streams',
  fees: 'Fee Setup', 'fee-payments': 'Fee Payments', 'fee-tracking': 'Fee Tracking',
  receipts: 'Receipts', expenses: 'Expenses', reports: 'Reports',
  history: 'History', settings: 'Settings'
};

function nav(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sb-item,.sb-child,.sb-settings').forEach(n => n.classList.remove('active'));
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');
  document.getElementById('topbar-title').textContent = PAGE_TITLES[page] || page;
  const navEl = document.getElementById('nav-' + page) || document.getElementById('nav-' + page.replace('-', ''));
  if (navEl) navEl.classList.add('active');

  if (page === 'all-students') { if (!_students.length || _stuLoaded === false) loadStudents(); else renderStudentsTable(_students); }
  if (page === 'grades') { loadGrades(); renderGradesTable(); }
  if (page === 'fees') { renderAllTermCards(); populateYearFilter(); }
  if (page === 'fee-payments') {
    renderTermCards('fp-terms-grid', TERMS, 'fp');
    if (_activeTerm && !document.getElementById('ip-fee-payments').classList.contains('open')) openTerm(_activeTerm.id, _activeTerm.name, 'fp');
  }
  if (page === 'fee-tracking') {
    renderTermCards('ft-terms-grid', TERMS, 'ft');
    if (_activeTerm && !document.getElementById('ip-fee-tracking').classList.contains('open')) openTerm(_activeTerm.id, _activeTerm.name, 'ft');
  }
  if (page === 'receipts') {
    loadTermDropdowns();
    if (_activeTerm) document.getElementById('rec-term-sel').value = _activeTerm.id;
    loadReceipts();
  }
  if (page === 'expenses') {
    renderTermCards('exp-terms-grid', TERMS, 'exp');
    if (_activeTerm && !document.getElementById('ip-expenses').classList.contains('open')) openTerm(_activeTerm.id, _activeTerm.name, 'exp');
  }
  if (page === 'reports') {
    loadTermDropdowns();
    if (_activeTerm) document.getElementById('rep-term-sel').value = _activeTerm.id;
    loadReports();
  }
  if (page === 'history') loadHistory();
  if (page === 'settings') { loadUsers(); loadCats(); }
}
  if (page === 'templates') loadTemplates();

function navToggle(group) {
  const children = document.getElementById('children-' + group);
  const navItem = document.getElementById('nav-' + group);
  if (!children) return;
  const isOpen = children.classList.contains('open');
  document.querySelectorAll('.sb-children').forEach(c => c.classList.remove('open'));
  document.querySelectorAll('.sb-item').forEach(i => i.classList.remove('open'));
  if (!isOpen) { children.classList.add('open'); navItem.classList.add('open'); }
  const firstChild = children.querySelector('.sb-child');
  if (firstChild && !isOpen) { const childPage = firstChild.id.replace('nav-', ''); nav(childPage); }
}

function openInner(id) { document.getElementById(id).classList.add('open'); }
function closeInner(id) { document.getElementById(id).classList.remove('open'); }

// ══ MODALS ═════════════════════════════════════════
function openM(id) { document.getElementById(id).classList.add('open'); }
function closeM(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.overlay').forEach(o => o.addEventListener('click', e => {
  if (e.target === o) o.classList.remove('open');
}));

// ══ CONFIRM ════════════════════════════════════════
function confirm2(title, msg, cb) {
  document.getElementById('conf-title').textContent = title;
  document.getElementById('conf-msg').innerHTML = msg;
  _confirmCb = cb;
  openM('m-confirm');
}

document.getElementById('conf-ok').onclick = () => { closeM('m-confirm'); if (_confirmCb) _confirmCb(); };

// ══ TOAST ══════════════════════════════════════════
function toast(msg, type = 'success') {
  const wrap = document.getElementById('toast-wrap');
  const t = document.createElement('div');
  const icon = type === 'success'
    ? '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#16a34a" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
    : type === 'error'
    ? '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#dc2626" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
    : '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#1a3c6e" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
  t.className = 'toast ' + type;
  t.innerHTML = icon + ' ' + msg;
  wrap.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 350); }, 3500);
}

function toastWithUndo(msg, undoCb) {
  const wrap = document.getElementById('toast-wrap');
  const t = document.createElement('div');
  t.className = 'toast info';
  t.innerHTML = `<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#1a3c6e" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> ${msg} <button class="undo-btn" id="undo-${Date.now()}">Undo</button>`;
  wrap.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  const btn = t.querySelector('.undo-btn');
  let done = false;
  btn.onclick = () => { done = true; t.classList.remove('show'); setTimeout(() => t.remove(), 350); undoCb(); };
  setTimeout(() => { if (!done) { t.classList.remove('show'); setTimeout(() => t.remove(), 350); } }, 5000);
}

// ══ UTILS ═════════════════════════════════════════
function fmt(n) {
  if (!n && n !== 0) return '0';
  return Math.round(n).toLocaleString('en-KE');
}

function togglePw(id, btn) {
  const el = document.getElementById(id);
  el.type = el.type === 'password' ? 'text' : 'password';
  btn.innerHTML = el.type === 'text'
    ? '<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
    : '<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
}

// ══ KEYBOARD ══════════════════════════════════════
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('login-screen').style.display !== 'none') doLogin();
  if (e.key === 'Escape') {
    document.querySelectorAll('.overlay.open').forEach(o => o.classList.remove('open'));
    document.querySelectorAll('.inner-page.open').forEach(p => p.classList.remove('open'));
  }
});

// ══ SESSION RESTORE BOOT ══════════════════════════
(async () => {
  const saved = sessionStorage.getItem('ef_t');
  const email = sessionStorage.getItem('ef_e');
  if (saved) {
    AUTH = saved;
    USER_EMAIL = email || '';
    const initials = (email || 'US').split('@')[0].slice(0, 2).toUpperCase();
    document.getElementById('profile-btn').textContent = initials;
    document.getElementById('login-screen').style.display = 'none';
    // Open students nav group by default
    document.getElementById('children-students').classList.add('open');
    document.getElementById('nav-students').classList.add('open');
    await bootApp();
  }
})();
// ══════════════════════════════════════════════════════════════
// app-mpesa-addon.js
// Paste this at the BOTTOM of src/app.js
// Requires: SB and KEY constants already defined in index.html
// ══════════════════════════════════════════════════════════════

// ── STK Push: trigger M-Pesa prompt on parent's phone ─────────
async function triggerSTKPush(feeId, studentName, phone, amount) {
  if (!phone) { toast('No phone number for this parent', 'error'); return; }
  if (!amount || amount <= 0) { toast('No outstanding balance', 'info'); return; }

  const normalised = phone.replace(/^\+/, '').replace(/^0/, '254');
  const accountRef = (SETTINGS.account_prefix || 'STU') + '-' + feeId.slice(-6).toUpperCase();
  const desc = `Fees - ${studentName}`;

  toast(`Sending M-Pesa prompt to ${normalised}…`, 'info');

  try {
    const res = await fetch(`${SB}/functions/v1/stk-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': KEY,
        'Authorization': 'Bearer ' + AUTH,
      },
      body: JSON.stringify({
        phone:       normalised,
        amount:      Math.round(amount),
        fee_id:      feeId,
        account_ref: accountRef,
        description: desc,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'STK push failed');

    toast(`✓ M-Pesa prompt sent! Ask parent to check their phone.`, 'success');

    // Poll for confirmation for up to 60 seconds
    pollPaymentStatus(data.CheckoutRequestID, feeId);

  } catch (e) {
    toast('M-Pesa error: ' + e.message, 'error');
  }
}

// ── Poll transaction status after STK push ────────────────────
async function pollPaymentStatus(checkoutRequestId, feeId) {
  const maxAttempts = 12; // 12 × 5s = 60 seconds
  let attempts = 0;

  const interval = setInterval(async () => {
    attempts++;
    try {
      const { data } = await supabaseQuery(
        `/rest/v1/ef_mpesa_transactions?checkout_request_id=eq.${checkoutRequestId}&select=status,result_desc,mpesa_receipt_number`
      );
      const txn = data?.[0];

      if (txn?.status === 'success') {
        clearInterval(interval);
        toast(`✓ Payment confirmed! Receipt: ${txn.mpesa_receipt_number}`, 'success');
        // Refresh whichever panel is open
        if (_curTermId) {
          if (document.getElementById('ip-fee-tracking').classList.contains('open')) await loadFTData(_curTermId);
          if (document.getElementById('ip-fee-payments').classList.contains('open')) await loadFPData(_curTermId);
        }
      } else if (txn?.status === 'failed') {
        clearInterval(interval);
        toast(`Payment failed: ${txn.result_desc || 'Cancelled by user'}`, 'error');
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        // Don't show error — payment may still come through via callback
      }
    } catch (e) {
      if (attempts >= maxAttempts) clearInterval(interval);
    }
  }, 5000);
}

// Helper: raw fetch to Supabase REST (returns {data, error})
async function supabaseQuery(path) {
  const res = await fetch(SB + path, {
    headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + AUTH }
  });
  const data = await res.json();
  return { data, error: res.ok ? null : data };
}

// ── Copy pay link to clipboard ─────────────────────────────────
function copyPayLink(feeId, studentName) {
  const base = SETTINGS.pay_url || window.location.origin + '/pay.html';
  const url  = `${base}?fee=${feeId}&name=${encodeURIComponent(studentName)}`;
  navigator.clipboard.writeText(url).then(() => {
    toast('Payment link copied!', 'success');
  }).catch(() => {
    prompt('Copy this payment link:', url);
  });
}

// ── Share via WhatsApp ────────────────────────────────────────
function shareWhatsApp(feeId, studentName, balance, phone) {
  const base    = SETTINGS.pay_url || window.location.origin + '/pay.html';
  const payLink = `${base}?fee=${feeId}&name=${encodeURIComponent(studentName)}`;
  const paybill = SETTINGS.paybill || 'XXXXXX';
  const tname   = TERMS.find(t => t.id === _curTermId)?.name || 'this term';

  const message =
    `Dear Parent,\n\nFees balance for *${studentName}* is *KSh ${fmt(balance)}* for ${tname}.\n\n` +
    `Pay securely via this link:\n${payLink}\n\n` +
    `Or pay directly:\nM-Pesa Paybill: *${paybill}*\nAccount: STU-${feeId.slice(-6).toUpperCase()}\n\nThank you.`;

  const normalised = (phone || '').replace(/^\+/, '').replace(/^0/, '254');
  const waUrl = normalised
    ? `https://wa.me/${normalised}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;

  window.open(waUrl, '_blank');
}

// ── M-Pesa transaction history modal ─────────────────────────
async function showMpesaHistory(feeId) {
  try {
    const txns = await api(
      `/rest/v1/ef_mpesa_transactions?fee_id=eq.${feeId}&select=*&order=created_at.desc`
    );
    if (!txns || !txns.length) { toast('No M-Pesa transactions for this student', 'info'); return; }

    const rows = txns.map(t => `
      <tr style="border-bottom:1px solid var(--border)">
        <td style="padding:6px">${t.created_at ? new Date(t.created_at).toLocaleString('en-KE') : '—'}</td>
        <td style="padding:6px"><span class="badge ${t.status === 'success' ? 'bg-green' : t.status === 'failed' ? 'bg-red' : 'bg-amber'}">${t.status}</span></td>
        <td style="padding:6px mono">KSh ${fmt(t.amount)}</td>
        <td style="padding:6px">${t.mpesa_receipt_number || '—'}</td>
        <td style="padding:6px text-sm" style="color:var(--text3)">${t.result_desc || ''}</td>
      </tr>`).join('');

    document.getElementById('conf-title').textContent = 'M-Pesa Transaction History';
    document.getElementById('conf-msg').innerHTML = `
      <table style="width:100%;font-size:12.5px;border-collapse:collapse">
        <thead><tr style="border-bottom:2px solid var(--border)">
          <th style="padding:5px 6px;text-align:left">Date</th>
          <th style="padding:5px 6px;text-align:left">Status</th>
          <th style="padding:5px 6px;text-align:left">Amount</th>
          <th style="padding:5px 6px;text-align:left">Receipt</th>
          <th style="padding:5px 6px;text-align:left">Note</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    document.getElementById('conf-ok').textContent = 'Close';
    _confirmCb = () => { document.getElementById('conf-ok').textContent = 'Confirm'; };
    openM('m-confirm');
  } catch(e) { toast('Failed to load history', 'error'); }
}

// ══ TEMPLATES ═══════════════════════════════════════
let _tpl = {global:{},receipt:{},invoice:{},feeStatement:{},expense:{},general:{}};

async function loadTemplates(){
  try{
    const rows=await api('/rest/v1/ef_templates?select=*&limit=1');
    if(rows&&rows.length){
      _tpl.global=rows[0].global||{};
      _tpl.receipt=rows[0].receipt||{};
      _tpl.invoice=rows[0].invoice||{};
      _tpl.feeStatement=rows[0].fee_statement||{};
      _tpl.expense=rows[0].expense_report||{};
      _tpl.general=rows[0].general_report||{};
      _tplId=rows[0].id;
    }
  }catch(e){}
  switchTemplateTab('global',document.querySelector('.sub-tab'));
}
let _tplId=null;

function switchTemplateTab(tab, el){
  document.querySelectorAll('#page-templates .sub-tab').forEach(t=>t.classList.remove('active'));
  if(el)el.classList.add('active');
  const c=document.getElementById('tpl-content');
  if(tab==='global') c.innerHTML=renderGlobalTab();
  else if(tab==='receipt') c.innerHTML=renderDocTab('receipt','Receipt',['Student Name','Admission No','Grade & Stream','Term','Amount Paid','Balance','M-Pesa Ref','Payer Name','Payer Phone','Date','Cashier']);
  else if(tab==='invoice') c.innerHTML=renderDocTab('invoice','Invoice',['Student Name','Admission No','Grade & Stream','Term','Fee Breakdown','Total Expected','Amount Paid','Balance Due','Due Date']);
  else if(tab==='fee-statement') c.innerHTML=renderDocTab('feeStatement','Fee Statement',['Student Name','Admission No','Grade','All Terms History','Per Term Summary','Overall Balance']);
  else if(tab==='expense') c.innerHTML=renderDocTab('expense','Expense Report',['Date Range','Category','Description','Amount','Recorded By','Category Totals','Grand Total']);
  else if(tab==='general') c.innerHTML=renderDocTab('general','General Report',['Title','Date Range','Summary Metrics','Data Table','Notes']);
}

function renderGlobalTab(){
  const g=_tpl.global;
  return `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:20px">
    <div class="card">
      <div class="card-header"><div class="card-title">School Identity</div></div>
      <div class="card-body" style="display:flex;flex-direction:column;gap:14px">
        <div class="fg"><label class="fl">School Name</label><input class="input w100" id="tpl-school-name" value="${g.schoolName||''}" placeholder="e.g. Young Muslim Association School"></div>
        <div class="fg"><label class="fl">Address</label><input class="input w100" id="tpl-address" value="${g.address||''}" placeholder="e.g. P.O Box 1234, Nairobi"></div>
        <div class="fg"><label class="fl">Phone</label><input class="input w100" id="tpl-phone" value="${g.phone||''}" placeholder="e.g. +254 700 000000"></div>
        <div class="fg"><label class="fl">Email</label><input class="input w100" id="tpl-email" value="${g.email||''}" placeholder="e.g. info@school.ac.ke"></div>
        <div class="fg"><label class="fl">Footer Message</label><input class="input w100" id="tpl-footer" value="${g.footer||''}" placeholder="e.g. Thank you for your payment"></div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Appearance</div></div>
      <div class="card-body" style="display:flex;flex-direction:column;gap:14px">
        <div class="fg"><label class="fl">Primary Color</label><div class="flex ac g8"><input type="color" id="tpl-color" value="${g.color||'#1a3c6e'}" style="width:44px;height:36px;border:1px solid var(--border2);border-radius:6px;cursor:pointer;padding:2px"><span class="c3 text-sm">Used in headers and accents</span></div></div>
        <div class="fg"><label class="fl">Logo</label>
          ${g.logo?`<div class="flex ac g8"><img src="${g.logo}" style="height:52px;border:1px solid var(--border);border-radius:6px;padding:4px"><button class="btn btn-danger btn-xs" onclick="removeLogo()">Remove</button></div>`:''}
          <input type="file" id="tpl-logo" accept="image/*" style="margin-top:6px" onchange="previewLogo(this)">
          <div id="tpl-logo-preview"></div>
        </div>
        <div class="fg"><label class="fl">Signature/Stamp Area</label>
          <label class="flex ac g8" style="cursor:pointer">
            <input type="checkbox" id="tpl-stamp" ${g.showStamp?'checked':''}>
            <span class="text-sm">Show signature and stamp area on documents</span>
          </label>
        </div>
        <div class="fg"><label class="fl">Watermark Text</label><input class="input w100" id="tpl-watermark" value="${g.watermark||''}" placeholder="e.g. OFFICIAL or leave blank"></div>
      </div>
    </div>
  </div>
  <div style="margin-top:16px;display:flex;justify-content:flex-end">
    <button class="btn btn-primary" onclick="saveTemplates()">
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
      Save & Apply
    </button>
  </div>`;
}

function renderDocTab(key, label, fields){
  const d=_tpl[key]||{};
  const layout=d.layout||'A';
  const hidden=d.hidden||[];
  return `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:20px">
    <div>
      <div class="card" style="margin-bottom:16px">
        <div class="card-header"><div class="card-title">Layout</div></div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
            ${['A','B','C'].map(l=>`
            <div onclick="selectLayout('${key}','${l}',this)" style="border:2px solid ${layout===l?'var(--navy)':'var(--border)'};border-radius:8px;padding:12px;cursor:pointer;text-align:center;transition:all .15s" id="layout-opt-${key}-${l}">
              <div style="font-weight:700;color:${layout===l?'var(--navy)':'var(--text2)'}">Layout ${l}</div>
              <div class="text-xs c3" style="margin-top:4px">${l==='A'?'Classic centered':l==='B'?'Modern bold':'Minimal B&W'}</div>
              <div style="margin-top:8px;height:60px;background:var(--surface2);border-radius:4px;display:flex;flex-direction:column;gap:3px;padding:6px;overflow:hidden">
                ${l==='A'?'<div style="height:6px;background:#1a3c6e;border-radius:2px;width:60%;margin:0 auto"></div><div style="height:3px;background:var(--border2);border-radius:2px;margin-top:3px"></div><div style="height:3px;background:var(--border2);border-radius:2px"></div><div style="height:3px;background:var(--border2);border-radius:2px;width:80%"></div>':l==='B'?'<div style="height:12px;background:#1a3c6e;border-radius:2px;width:100%"></div><div style="height:3px;background:var(--border2);border-radius:2px;margin-top:4px"></div><div style="height:3px;background:var(--border2);border-radius:2px"></div>':'<div style="height:3px;background:#333;border-radius:2px;width:40%"></div><div style="height:3px;background:var(--border2);border-radius:2px;margin-top:4px"></div><div style="height:3px;background:var(--border2);border-radius:2px"></div>'}
              </div>
            </div>`).join('')}
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Fields to Show</div></div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:8px">
          ${fields.map(f=>`
          <label class="flex ac g8" style="cursor:pointer;padding:6px 0;border-bottom:1px solid var(--border)">
            <input type="checkbox" class="tpl-field-cb" data-key="${key}" data-field="${f}" ${!hidden.includes(f)?'checked':''}>
            <span style="font-size:13px">${f}</span>
          </label>`).join('')}
        </div>
      </div>
    </div>
    <div class="card" style="position:sticky;top:24px">
      <div class="card-header"><div class="card-title">Preview</div><span class="badge bg-blue">Sample</span></div>
      <div class="card-body" id="tpl-preview-${key}" style="background:#f8f8f8;min-height:400px;font-size:12px">
        ${renderDocPreview(key,label,fields,layout,hidden)}
      </div>
    </div>
  </div>
  <div style="margin-top:16px;display:flex;justify-content:flex-end">
    <button class="btn btn-primary" onclick="saveTemplates()">
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
      Save & Apply
    </button>
  </div>`;
}

function renderDocPreview(key,label,fields,layout,hidden){
  const g=_tpl.global||{};
  const color=g.color||'#1a3c6e';
  const visibleFields=fields.filter(f=>!hidden.includes(f));
  const schoolName=g.schoolName||'School Name';
  const address=g.address||'P.O Box 1234, Nairobi';
  if(layout==='A') return `
    <div style="background:#fff;padding:20px;border-radius:4px;font-family:'Jost',sans-serif">
      <div style="text-align:center;border-bottom:2px solid ${color};padding-bottom:10px;margin-bottom:10px">
        <div style="font-size:15px;font-weight:800;color:${color}">${schoolName}</div>
        <div style="font-size:10px;color:#666">${address}</div>
        <div style="font-size:11px;font-weight:700;color:${color};margin-top:4px;text-transform:uppercase">${label}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
        ${visibleFields.map(f=>`<div style="padding:3px 0;border-bottom:1px solid #f0f0f0"><span style="font-size:9px;color:#999;text-transform:uppercase">${f}</span><div style="font-size:11px;color:#333;font-weight:600">Sample Value</div></div>`).join('')}
      </div>
      ${g.showStamp?`<div style="margin-top:12px;display:flex;justify-content:flex-end"><div style="border:1px dashed #ccc;width:80px;height:40px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#aaa">Stamp/Sign</div></div>`:''}
      ${g.footer?`<div style="text-align:center;margin-top:10px;font-size:9px;color:#aaa;border-top:1px dashed #ddd;padding-top:6px">${g.footer}</div>`:''}
    </div>`;
  if(layout==='B') return `
    <div style="background:#fff;border-radius:4px;font-family:'Jost',sans-serif;overflow:hidden">
      <div style="background:${color};padding:14px 20px;display:flex;justify-content:space-between;align-items:center">
        <div><div style="font-size:14px;font-weight:800;color:#fff">${schoolName}</div><div style="font-size:9px;color:rgba(255,255,255,.7)">${address}</div></div>
        <div style="font-size:12px;font-weight:700;color:#fff;text-transform:uppercase">${label}</div>
      </div>
      <div style="padding:16px">
        ${visibleFields.map(f=>`<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f0f0f0"><span style="font-size:10px;color:#666">${f}</span><span style="font-size:10px;font-weight:700;color:#333">Sample Value</span></div>`).join('')}
        ${g.showStamp?`<div style="margin-top:12px;display:flex;justify-content:flex-end"><div style="border:1px dashed #ccc;width:80px;height:40px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#aaa">Stamp/Sign</div></div>`:''}
        ${g.footer?`<div style="text-align:center;margin-top:10px;font-size:9px;color:#aaa;border-top:1px dashed #ddd;padding-top:6px">${g.footer}</div>`:''}
      </div>
    </div>`;
  return `
    <div style="background:#fff;padding:20px;border-radius:4px;font-family:'Jost',sans-serif">
      <div style="border-bottom:1px solid #333;padding-bottom:8px;margin-bottom:10px;display:flex;justify-content:space-between">
        <div><div style="font-size:13px;font-weight:800;color:#000">${schoolName}</div><div style="font-size:9px;color:#555">${address}</div></div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#000">${label}</div>
      </div>
      ${visibleFields.map(f=>`<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #eee"><span style="font-size:10px;color:#444">${f}</span><span style="font-size:10px;color:#000">Sample Value</span></div>`).join('')}
      ${g.showStamp?`<div style="margin-top:12px;display:flex;justify-content:flex-end"><div style="border:1px dashed #999;width:80px;height:40px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#aaa">Stamp/Sign</div></div>`:''}
      ${g.footer?`<div style="text-align:center;margin-top:10px;font-size:9px;color:#888;border-top:1px dashed #ddd;padding-top:6px">${g.footer}</div>`:''}
    </div>`;
}

function selectLayout(key,layout,el){
  _tpl[key]=_tpl[key]||{};
  _tpl[key].layout=layout;
  ['A','B','C'].forEach(l=>{
    const opt=document.getElementById(`layout-opt-${key}-${l}`);
    if(opt){opt.style.borderColor=l===layout?'var(--navy)':'var(--border)';opt.querySelector('div').style.color=l===layout?'var(--navy)':'var(--text2)';}
  });
  updatePreview(key);
}

function updatePreview(key){
  const labelMap={receipt:'Receipt',invoice:'Invoice',feeStatement:'Fee Statement',expense:'Expense Report',general:'General Report'};
  const fieldsMap={
    receipt:['Student Name','Admission No','Grade & Stream','Term','Amount Paid','Balance','M-Pesa Ref','Payer Name','Payer Phone','Date','Cashier'],
    invoice:['Student Name','Admission No','Grade & Stream','Term','Fee Breakdown','Total Expected','Amount Paid','Balance Due','Due Date'],
    feeStatement:['Student Name','Admission No','Grade','All Terms History','Per Term Summary','Overall Balance'],
    expense:['Date Range','Category','Description','Amount','Recorded By','Category Totals','Grand Total'],
    general:['Title','Date Range','Summary Metrics','Data Table','Notes']
  };
  const d=_tpl[key]||{};
  const preview=document.getElementById(`tpl-preview-${key}`);
  if(preview) preview.innerHTML=renderDocPreview(key,labelMap[key],fieldsMap[key],d.layout||'A',d.hidden||[]);
}

document.addEventListener('change',function(e){
  if(e.target.classList.contains('tpl-field-cb')){
    const key=e.target.dataset.key;
    const field=e.target.dataset.field;
    _tpl[key]=_tpl[key]||{};
    _tpl[key].hidden=_tpl[key].hidden||[];
    if(e.target.checked){_tpl[key].hidden=_tpl[key].hidden.filter(f=>f!==field);}
    else{if(!_tpl[key].hidden.includes(field))_tpl[key].hidden.push(field);}
    updatePreview(key);
  }
});

function previewLogo(input){
  const file=input.files[0]; if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    document.getElementById('tpl-logo-preview').innerHTML=`<img src="${e.target.result}" style="height:52px;margin-top:8px;border:1px solid var(--border);border-radius:6px;padding:4px">`;
    _tpl.global._logoData=e.target.result;
  };
  reader.readAsDataURL(file);
}

function removeLogo(){
  _tpl.global.logo=null;
  _tpl.global._logoData=null;
  renderGlobalTab();
  switchTemplateTab('global',document.querySelector('#page-templates .sub-tab'));
}

async function saveTemplates(){
  const g=_tpl.global;
  g.schoolName=document.getElementById('tpl-school-name')?.value||g.schoolName;
  g.address=document.getElementById('tpl-address')?.value||g.address;
  g.phone=document.getElementById('tpl-phone')?.value||g.phone;
  g.email=document.getElementById('tpl-email')?.value||g.email;
  g.footer=document.getElementById('tpl-footer')?.value||g.footer;
  g.color=document.getElementById('tpl-color')?.value||g.color;
  g.watermark=document.getElementById('tpl-watermark')?.value||g.watermark;
  g.showStamp=document.getElementById('tpl-stamp')?.checked||false;
  if(_tpl.global._logoData) g.logo=_tpl.global._logoData;
  const payload={global:g,receipt:_tpl.receipt,invoice:_tpl.invoice,fee_statement:_tpl.feeStatement,expense_report:_tpl.expense,general_report:_tpl.general};
  try{
    if(_tplId){await api(`/rest/v1/ef_templates?id=eq.${_tplId}`,'PATCH',payload);}
    else{const [row]=await api('/rest/v1/ef_templates','POST',payload);_tplId=row.id;}
    toast('Templates saved & applied','success');
  }catch(e){toast('Failed to save: '+e.message,'error');}
}
