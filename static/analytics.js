document.addEventListener('DOMContentLoaded', function() {
  // 1. Initialize Line Chart (Customer Growth)
  if (typeof initialLabels !== 'undefined' && typeof initialData !== 'undefined') {
      initializeGrowthChart({ labels: initialLabels, customers: initialData });
  } else {
      fetchGrowthData();
  }

  // 2. Initialize Pie Chart (Platform Activity)
  initializeActivityPieChart();
});

async function fetchGrowthData() {
  try {
      const response = await fetch('/api/analytics-data');
      const data = await response.json();
      initializeGrowthChart(data);
  } catch (error) {
      console.error('Error loading growth chart:', error);
  }
}

function initializeGrowthChart(apiData) {
  const ctx = document.getElementById('customerGrowthChart');
  if (!ctx) return;

  new Chart(ctx, {
      type: 'line',
      data: {
          labels: apiData.labels,
          datasets: [{
              label: 'Registered Customers',
              data: apiData.customers,
              borderColor: '#2b6cff',
              backgroundColor: 'rgba(43, 108, 255, 0.1)',
              borderWidth: 3,
              fill: true,
              tension: 0.4,
              pointRadius: 5
          }]
      },
      options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
              y: { beginAtZero: true, ticks: { precision: 0 } }
          }
      }
  });
}

function initializeActivityPieChart() {
  const ctx = document.getElementById('activityPieChart');
  if (!ctx) return;

  // Pulling totals from the globally available Jinja variables in HTML
  const orders = parseInt(document.getElementById('totalOrdersVal').value) || 0;
  const repairs = parseInt(document.getElementById('totalRepairsVal').value) || 0;
  const sells = parseInt(document.getElementById('totalSellsVal').value) || 0;

  new Chart(ctx, {
      type: 'pie',
      data: {
          labels: ['Orders', 'Repairs', 'Sells'],
          datasets: [{
              data: [orders, repairs, sells],
              backgroundColor: ['#2b6cff', '#f43f5e', '#a855f7'],
              hoverOffset: 4,
              borderWidth: 0
          }]
      },
      options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
              legend: { position: 'bottom' }
          }
      }
  });
}