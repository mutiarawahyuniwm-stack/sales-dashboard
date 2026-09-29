// ============================================================
// Sales Dashboard — Main Logic
// ============================================================

const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const MONTH_NUMS = ['01','02','03','04','05','06','07','08','09','10','11','12'];

let allData = [];
let charts = {};

// ── Color palette ────────────────────────────────────────────
const COLORS = {
  blue:   '#3b82f6',
  green:  '#10b981',
  purple: '#8b5cf6',
  orange: '#f59e0b',
  red:    '#ef4444',
  indigo: '#6366f1',
  teal:   '#14b8a6',
  pink:   '#ec4899',
};
const PALETTE = Object.values(COLORS);

// ── Format helpers ───────────────────────────────────────────
function formatRupiah(value) {
  if (value >= 1_000_000_000) return 'Rp ' + (value / 1_000_000_000).toFixed(1) + ' M';
  if (value >= 1_000_000)     return 'Rp ' + (value / 1_000_000).toFixed(1) + ' jt';
  return 'Rp ' + value.toLocaleString('id-ID');
}

function formatPercent(value) {
  return value.toFixed(1) + '%';
}

// ── Filter state ─────────────────────────────────────────────
function getFilters() {
  return {
    month:    document.getElementById('filter-month').value,
    category: document.getElementById('filter-category').value,
    region:   document.getElementById('filter-region').value,
  };
}

function applyFilters(data) {
  const { month, category, region } = getFilters();
  return data.filter(d => {
    const m = d.date.slice(5, 7);
    return (
      (month    === 'all' || m === month) &&
      (category === 'all' || d.category === category) &&
      (region   === 'all' || d.region   === region)
    );
  });
}

// ── KPI calculation ──────────────────────────────────────────
function calcKPIs(data) {
  const totalRevenue  = data.reduce((s, d) => s + d.revenue,  0);
  const totalCost     = data.reduce((s, d) => s + d.cost,     0);
  const totalProfit   = totalRevenue - totalCost;
  const totalQty      = data.reduce((s, d) => s + d.quantity, 0);
  const transactions  = data.length;
  const avgOrderValue = transactions ? totalRevenue / transactions : 0;
  const profitMargin  = totalRevenue ? (totalProfit / totalRevenue) * 100 : 0;
  return { totalRevenue, totalCost, totalProfit, totalQty, transactions, avgOrderValue, profitMargin };
}

// ── Aggregate helpers ────────────────────────────────────────
function groupBy(data, key, valueKey) {
  const map = {};
  data.forEach(d => {
    map[d[key]] = (map[d[key]] || 0) + d[valueKey];
  });
  return map;
}

function groupByMonth(data, valueKey) {
  const map = {};
  MONTH_NUMS.forEach(m => { map[m] = 0; });
  data.forEach(d => {
    const m = d.date.slice(5, 7);
    map[m] = (map[m] || 0) + d[valueKey];
  });
  return MONTH_NUMS.map(m => map[m]);
}

// ── Render KPI cards ─────────────────────────────────────────
function renderKPIs(kpis) {
  document.getElementById('kpi-revenue').textContent    = formatRupiah(kpis.totalRevenue);
  document.getElementById('kpi-profit').textContent     = formatRupiah(kpis.totalProfit);
  document.getElementById('kpi-qty').textContent        = kpis.totalQty.toLocaleString('id-ID');
  document.getElementById('kpi-transactions').textContent = kpis.transactions.toLocaleString('id-ID');
  document.getElementById('kpi-avg-order').textContent  = formatRupiah(kpis.avgOrderValue);
  document.getElementById('kpi-margin').textContent     = formatPercent(kpis.profitMargin);
}

// ── Chart: Monthly Revenue vs Profit (Bar + Line) ────────────
function renderRevenueChart(data) {
  const revenueArr = groupByMonth(data, 'revenue');
  const costArr    = groupByMonth(data, 'cost');
  const profitArr  = revenueArr.map((r, i) => r - costArr[i]);

  const ctx = document.getElementById('chart-revenue').getContext('2d');
  if (charts.revenue) charts.revenue.destroy();
  charts.revenue = new Chart(ctx, {
    data: {
      labels: MONTHS,
      datasets: [
        {
          type: 'bar',
          label: 'Revenue',
          data: revenueArr,
          backgroundColor: COLORS.blue + 'cc',
          borderColor: COLORS.blue,
          borderWidth: 1,
          yAxisID: 'y',
        },
        {
          type: 'bar',
          label: 'Cost',
          data: costArr,
          backgroundColor: COLORS.red + 'aa',
          borderColor: COLORS.red,
          borderWidth: 1,
          yAxisID: 'y',
        },
        {
          type: 'line',
          label: 'Profit',
          data: profitArr,
          borderColor: COLORS.green,
          backgroundColor: COLORS.green + '22',
          borderWidth: 2.5,
          pointRadius: 4,
          tension: 0.4,
          fill: true,
          yAxisID: 'y',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: ctx => ' ' + ctx.dataset.label + ': ' + formatRupiah(ctx.parsed.y),
          },
        },
      },
      scales: {
        y: {
          ticks: { callback: v => formatRupiah(v) },
          grid: { color: '#e5e7eb' },
        },
        x: { grid: { display: false } },
      },
    },
  });
}

// ── Chart: Category Doughnut ─────────────────────────────────
function renderCategoryChart(data) {
  const map = groupBy(data, 'category', 'revenue');
  const labels = Object.keys(map);
  const values = labels.map(k => map[k]);

  const ctx = document.getElementById('chart-category').getContext('2d');
  if (charts.category) charts.category.destroy();
  charts.category = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: PALETTE.slice(0, labels.length),
        borderWidth: 2,
        borderColor: '#ffffff',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right' },
        tooltip: {
          callbacks: {
            label: ctx => ' ' + ctx.label + ': ' + formatRupiah(ctx.parsed),
          },
        },
      },
      cutout: '62%',
    },
  });
}

// ── Chart: Region Bar (horizontal) ───────────────────────────
function renderRegionChart(data) {
  const map = groupBy(data, 'region', 'revenue');
  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
  const labels = sorted.map(e => e[0]);
  const values = sorted.map(e => e[1]);

  const ctx = document.getElementById('chart-region').getContext('2d');
  if (charts.region) charts.region.destroy();
  charts.region = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Revenue',
        data: values,
        backgroundColor: PALETTE.slice(0, labels.length),
        borderRadius: 6,
        borderWidth: 0,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ' Revenue: ' + formatRupiah(ctx.parsed.x),
          },
        },
      },
      scales: {
        x: {
          ticks: { callback: v => formatRupiah(v) },
          grid: { color: '#e5e7eb' },
        },
        y: { grid: { display: false } },
      },
    },
  });
}

// ── Chart: Top Products Bar ───────────────────────────────────
function renderProductChart(data) {
  const map = groupBy(data, 'product', 'revenue');
  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const labels = sorted.map(e => e[0]);
  const values = sorted.map(e => e[1]);

  const ctx = document.getElementById('chart-product').getContext('2d');
  if (charts.product) charts.product.destroy();
  charts.product = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Revenue',
        data: values,
        backgroundColor: COLORS.indigo + 'cc',
        borderColor: COLORS.indigo,
        borderWidth: 1,
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ' Revenue: ' + formatRupiah(ctx.parsed.y),
          },
        },
      },
      scales: {
        y: {
          ticks: { callback: v => formatRupiah(v) },
          grid: { color: '#e5e7eb' },
        },
        x: { grid: { display: false }, ticks: { maxRotation: 30 } },
      },
    },
  });
}

// ── Transactions table ────────────────────────────────────────
function renderTable(data) {
  const tbody = document.getElementById('table-body');
  const top10 = data.slice(0, 10);
  tbody.innerHTML = top10.map(d => {
    const profit = d.revenue - d.cost;
    const margin = d.revenue ? ((profit / d.revenue) * 100).toFixed(1) : 0;
    const marginColor = profit >= 0 ? 'text-emerald-600' : 'text-red-500';
    return `
      <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
        <td class="px-4 py-2.5 text-xs text-gray-500 font-mono">${d.id}</td>
        <td class="px-4 py-2.5 text-xs text-gray-600">${d.date}</td>
        <td class="px-4 py-2.5 text-sm font-medium text-gray-800">${d.product}</td>
        <td class="px-4 py-2.5">
          <span class="inline-block px-2 py-0.5 text-xs rounded-full font-medium
            ${d.category === 'Electronics' ? 'bg-blue-100 text-blue-700' :
              d.category === 'Furniture'   ? 'bg-amber-100 text-amber-700' :
                                             'bg-purple-100 text-purple-700'}">
            ${d.category}
          </span>
        </td>
        <td class="px-4 py-2.5 text-sm text-gray-600">${d.region}</td>
        <td class="px-4 py-2.5 text-sm text-right text-gray-700">${d.quantity}</td>
        <td class="px-4 py-2.5 text-sm text-right font-medium text-gray-800">${formatRupiah(d.revenue)}</td>
        <td class="px-4 py-2.5 text-sm text-right font-semibold ${marginColor}">${margin}%</td>
      </tr>`;
  }).join('');
  document.getElementById('table-count').textContent = `Menampilkan ${top10.length} dari ${data.length} transaksi`;
}

// ── Master render ─────────────────────────────────────────────
function render() {
  const filtered = applyFilters(allData);
  const kpis = calcKPIs(filtered);
  renderKPIs(kpis);
  renderRevenueChart(filtered);
  renderCategoryChart(filtered);
  renderRegionChart(filtered);
  renderProductChart(filtered);
  renderTable(filtered);
}

// ── Bootstrap ─────────────────────────────────────────────────
async function init() {
  try {
    const res = await fetch('./data/sales.json');
    const json = await res.json();
    allData = json.transactions;

    // Wire up filter events
    ['filter-month', 'filter-category', 'filter-region'].forEach(id => {
      document.getElementById(id).addEventListener('change', render);
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
      document.getElementById('filter-month').value    = 'all';
      document.getElementById('filter-category').value = 'all';
      document.getElementById('filter-region').value   = 'all';
      render();
    });

    render();
  } catch (err) {
    console.error('Gagal memuat data:', err);
    document.getElementById('loading-error').classList.remove('hidden');
  }
}

document.addEventListener('DOMContentLoaded', init);
