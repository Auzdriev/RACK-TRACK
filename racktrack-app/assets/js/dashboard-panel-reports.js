(function () {
  const {
    state,
    registerPanel,
    setText,
    getMetrics,
    getDailyReportGroups,
    formatHistoryDate,
    formatHistoryTime,
    renderCategoryBadge,
    escapeHtml,
    peso,
    removeDailyRecord,
    requestSensitiveDeleteApproval,
    refreshAll
  } = window.RackTrack;

  function getTypeBadge(type) {
    if (type === "inventory-added") {
      return `<span class="report-type-pill added">Added to Inventory</span>`;
    }

    if (type === "sold") {
      return `<span class="report-type-pill sold">Sold</span>`;
    }

    return `<span class="report-type-pill order">Order</span>`;
  }

  function renderSummaryCards() {
    const metrics = getMetrics();

    setText("reportInventoryCount", metrics.inventoryTotal);
    setText("reportOrderCount", metrics.ordersTotal);
    setText("reportCustomerCount", metrics.customersTotal);
    setText("reportLowStockCount", metrics.lowStockTotal);
  }

  function deleteDailyRecord(recordId) {
    const approved = requestSensitiveDeleteApproval("daily report record");
    if (!approved) return;

    removeDailyRecord(recordId);
    refreshAll();
  }

  function renderDailyReports() {
    const wrap = document.getElementById("dailyReportsWrap");
    if (!wrap) return;

    const groups = getDailyReportGroups();

    if (!groups.length) {
      wrap.innerHTML = `
        <div class="crud-card">
          <div class="empty-state">No daily report records yet.</div>
        </div>
      `;
      return;
    }

    wrap.innerHTML = groups.map(group => `
      <div class="daily-report-group">
        <div class="daily-report-head">
          <h3>Daily Activity Report</h3>
          <div class="daily-report-meta">
            <span class="daily-report-date">${formatHistoryDate(group.date)}</span>
          </div>
        </div>

        <div class="table-wrap">
          <table class="report-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Type</th>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Sale Amount</th>
                <th>Profit</th>
                <th>Note</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              ${group.entries.map(entry => `
                <tr>
                  <td>${formatHistoryTime(entry.occurredAt)}</td>
                  <td>${getTypeBadge(entry.sourceType)}</td>
                  <td>${escapeHtml(entry.productName || "-")}</td>
                  <td>${escapeHtml(entry.sku || "-")}</td>
                  <td>${renderCategoryBadge(entry.category || "")}</td>
                  <td>${Number(entry.quantity) || 0}</td>
                  <td class="report-money">${entry.saleAmount ? peso(entry.saleAmount) : "-"}</td>
                  <td class="report-money">${entry.profitAmount ? peso(entry.profitAmount) : "-"}</td>
                  <td>${escapeHtml(entry.note || "-")}</td>
                  <td>
                    <button
                      type="button"
                      class="report-delete-row-btn"
                      onclick="window.RackTrackReportsPanel.deleteDailyRecord('${entry.id}')"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `).join("");
  }

  function render() {
    renderSummaryCards();
    renderDailyReports();
  }

  registerPanel({
    name: "reports",
    render
  });

  window.RackTrackReportsPanel = {
    render,
    deleteDailyRecord
  };
})();