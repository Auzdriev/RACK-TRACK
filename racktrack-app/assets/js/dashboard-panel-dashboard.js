(function () {
  const {
    state,
    peso,
    escapeHtml,
    formatDisplayDate,
    statusClass,
    setText,
    changePercent,
    previousMetrics,
    saveMetricsSnapshot,
    getMetrics,
    calculateProfit,
    setActiveSection,
    registerPanel
  } = window.RackTrack;

  const graphState = {
    revenueGraph: [],
    expenseGraph: [],
    customerGraph: [],
    orderGraph: []
  };

  function drawGraph(id, data) {
    const svg = document.getElementById(id);
    if (!svg) return;

    const poly = svg.querySelector("polyline");
    if (!poly || !data.length) return;

    const w = 120;
    const h = 40;
    const pad = 5;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const step = data.length > 1 ? (w - pad * 2) / (data.length - 1) : 0;

    const points = data.map((v, i) => {
      const x = pad + i * step;
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return `${x},${y}`;
    });

    poly.setAttribute("points", points.join(" "));
  }

  function animateGraph(id, fromData, toData, duration = 700) {
    const start = performance.now();
    const maxLen = Math.max(fromData.length, toData.length);

    const safeFrom = [...fromData];
    const safeTo = [...toData];

    while (safeFrom.length < maxLen) safeFrom.unshift(safeFrom[0] ?? 0);
    while (safeTo.length < maxLen) safeTo.unshift(safeTo[0] ?? 0);

    function frame(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      const current = safeTo.map((target, index) => {
        const begin = safeFrom[index] ?? 0;
        return begin + (target - begin) * eased;
      });

      drawGraph(id, current);

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        graphState[id] = [...safeTo];
      }
    }

    requestAnimationFrame(frame);
  }

  function generateTrend(value) {
    const base = Number(value) || 0;

    if (base <= 0) {
      return [2, 3, 2, 4, 3, 5, 4];
    }

    return [
      base * 0.45,
      base * 0.62,
      base * 0.58,
      base * 0.76,
      base * 0.70,
      base * 0.88,
      base
    ].map(num => Number(num.toFixed(2)));
  }

  function updateSingleGraph(id, value) {
    const newTrend = generateTrend(value);
    const oldTrend = graphState[id]?.length
      ? graphState[id]
      : newTrend.map(v => Number((v * 0.7).toFixed(2)));

    animateGraph(id, oldTrend, newTrend, 800);
  }

  function updateGraphs() {
    const metrics = getMetrics();
    updateSingleGraph("revenueGraph", metrics.profitValue);
    updateSingleGraph("expenseGraph", metrics.inventoryValue);
    updateSingleGraph("customerGraph", metrics.customersTotal);
    updateSingleGraph("orderGraph", metrics.ordersTotal);
  }

  function renderLowStock() {
    const list = document.getElementById("lowStockList");
    if (!list) return;

    const lowItems = state.inventory.filter(item => (Number(item.quantity) || 0) <= 5);

    if (!lowItems.length) {
      list.innerHTML = `<div class="empty-state">No low stock items.</div>`;
      return;
    }

    list.innerHTML = lowItems.slice(0, 3).map(item => `
      <div class="low-stock-item">
        <strong>${escapeHtml(item.productName)}</strong>
        <div class="low-stock-meta">
          <span>Available: ${Number(item.quantity) || 0}</span>
          <button class="order-link" type="button" data-jump="inventory-section">Restock</button>
        </div>
      </div>
    `).join("");

    document.querySelectorAll(".order-link").forEach(btn => {
      btn.addEventListener("click", () => {
        setActiveSection("inventory-section");
        if (window.RackTrackInventoryPanel && typeof window.RackTrackInventoryPanel.switchInventoryTab === "function") {
          window.RackTrackInventoryPanel.switchInventoryTab("items");
        }
      });
    });
  }

  function renderRecentOrders() {
    const list = document.getElementById("recentOrdersList");
    if (!list) return;

    if (!state.orders.length) {
      list.innerHTML = `<div class="empty-state">No recent orders.</div>`;
      return;
    }

    list.innerHTML = state.orders.slice(0, 3).map(order => `
      <div class="recent-item">
        <div class="recent-left">
          <img src="../assets/images/package.png" alt="Order item" />
          <div class="recent-main">
            <strong>${escapeHtml(order.item)}</strong>
            <em>Order id: ${escapeHtml(order.orderId)}</em>
          </div>
        </div>
        <div class="recent-right">
          <time>${formatDisplayDate(order.date)}</time>
          <span class="status-pill ${statusClass(order.status)}">${escapeHtml(order.status)}</span>
        </div>
      </div>
    `).join("");
  }

  function renderTopSelling() {
    const tbody = document.getElementById("topSellingBody");
    if (!tbody) return;

    if (!state.salesHistory.length) {
      tbody.innerHTML = `<tr><td colspan="3" class="empty-state">No sales data yet.</td></tr>`;
      return;
    }

    const salesMap = {};

    state.salesHistory.forEach(sale => {
      const itemName = String(sale.productName || "").trim() || "Unnamed Product";

      if (!salesMap[itemName]) {
        salesMap[itemName] = {
          name: itemName,
          sold: 0,
          total: 0
        };
      }

      salesMap[itemName].sold += Number(sale.quantitySold) || 0;
      salesMap[itemName].total += Number(sale.saleAmount) || 0;
    });

    const ranked = Object.values(salesMap)
      .sort((a, b) => b.sold - a.sold || b.total - a.total)
      .slice(0, 5);

    tbody.innerHTML = ranked.map(item => `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${item.sold}</td>
        <td>${peso(item.total)}</td>
      </tr>
    `).join("");
  }

  function renderDashboardStats() {
    const metrics = getMetrics();

    setText("packedCount", metrics.pendingOrders);
    setText("shippedCount", metrics.processingOrders);
    setText("deliveredCount", metrics.doneOrders);
    setText("invoicedCount", metrics.ordersTotal);

    setText("inventorySummaryInStock", metrics.inventoryTotal - metrics.lowStockTotal);
    setText("inventorySummaryRestock", metrics.lowStockTotal);

    setText("dashboardRevenue", peso(metrics.profitValue));
    setText("dashboardExpenses", peso(metrics.inventoryValue));
    setText("dashboardCustomersCount", metrics.customersTotal);
    setText("dashboardOrdersCount", metrics.ordersTotal);

    setText("dashboardRevenuePercent", `${changePercent(previousMetrics.profitValue, metrics.profitValue).toFixed(1)}%`);
    setText("dashboardExpensesPercent", `${changePercent(previousMetrics.inventoryValue, metrics.inventoryValue).toFixed(1)}%`);
    setText("dashboardCustomersPercent", `${changePercent(previousMetrics.customersTotal, metrics.customersTotal).toFixed(1)}%`);
    setText("dashboardOrdersPercent", `${changePercent(previousMetrics.ordersTotal, metrics.ordersTotal).toFixed(1)}%`);
    setText("lowStockItemsCount", `${metrics.lowStockTotal} items`);

    previousMetrics.inventoryTotal = metrics.inventoryTotal;
    previousMetrics.ordersTotal = metrics.ordersTotal;
    previousMetrics.customersTotal = metrics.customersTotal;
    previousMetrics.lowStockTotal = metrics.lowStockTotal;
    previousMetrics.inventoryValue = metrics.inventoryValue;
    previousMetrics.revenueValue = metrics.revenueValue;
    previousMetrics.profitValue = metrics.profitValue;
    previousMetrics.doneOrders = metrics.doneOrders;
    previousMetrics.pendingOrders = metrics.pendingOrders;
    previousMetrics.processingOrders = metrics.processingOrders;

    saveMetricsSnapshot(previousMetrics);
  }

  function render() {
    renderLowStock();
    renderRecentOrders();
    renderTopSelling();
    renderDashboardStats();
    updateGraphs();
  }

  registerPanel({ name: "dashboard", render });

  window.RackTrackDashboardPanel = {
    render
  };
})();