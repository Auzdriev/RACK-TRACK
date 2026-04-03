(function () {
  const {
    state,
    registerEntity,
    registerPanel,
    saveData,
    inventoryOrderOptions,
    findInventoryById,
    calculateExpenses,
    calculateRevenue,
    calculateProfit,
    peso,
    escapeHtml,
    formatDisplayDate,
    statusClass
  } = window.RackTrack;

  function ordersFormHTML(values = {}) {
    const selectedInventory = findInventoryById(values.inventoryId || "");

    return `
      <div class="form-grid two-columns">
        <div class="form-left">
          <div class="form-two">
            <div class="form-field">
              <label>Order ID</label>
              <input name="orderId" placeholder="Order ID" value="${escapeHtml(values.orderId || "")}" required />
            </div>

            <div class="form-field">
              <label>Date</label>
              <input name="date" type="date" value="${values.date || ""}" required />
            </div>
          </div>

          <div class="form-field">
            <label>Customer</label>
            <input name="customer" placeholder="Customer name" value="${escapeHtml(values.customer || "")}" required />
          </div>

          <div class="form-field">
            <label>Select Inventory Item</label>
            <select name="inventoryId" id="orderInventorySelect" required>
              ${inventoryOrderOptions(values.inventoryId || "")}
            </select>
          </div>

          <div class="form-two">
            <div class="form-field">
              <label>Item</label>
              <input name="item" id="orderItem" value="${escapeHtml(selectedInventory?.productName || values.item || "")}" readonly />
            </div>

            <div class="form-field">
              <label>Status</label>
              <select name="status" required>
                <option value="Pending" ${values.status === "Pending" ? "selected" : ""}>Pending</option>
                <option value="Processing" ${values.status === "Processing" ? "selected" : ""}>Processing</option>
                <option value="Done" ${values.status === "Done" ? "selected" : ""}>Done</option>
              </select>
            </div>
          </div>

          <div class="form-two">
            <div class="form-field">
              <label>SKU</label>
              <input name="sku" id="orderSku" value="${escapeHtml(selectedInventory?.sku || values.sku || "")}" readonly />
            </div>

            <div class="form-field">
              <label>Available Stock</label>
              <input type="number" id="orderAvailableStock" value="${Number(selectedInventory?.quantity) || 0}" readonly />
            </div>
          </div>

          <div class="form-two">
            <div class="form-field">
              <label>Quantity</label>
              <input name="quantity" id="orderQuantity" type="number" min="1" step="1" value="${values.quantity ?? 1}" required />
            </div>

            <div class="form-field">
              <label>Cost</label>
              <input name="cost" id="orderCost" type="number" value="${selectedInventory?.cost ?? values.cost ?? ""}" readonly />
            </div>
          </div>

          <div class="form-two">
            <div class="form-field">
              <label>SRP</label>
              <input name="srp" id="orderSrp" type="number" value="${selectedInventory?.srp ?? values.srp ?? ""}" readonly />
            </div>

            <div class="form-field">
              <label>Total Expenses</label>
              <input name="totalExpenses" id="orderTotalExpenses" type="number" value="${values.totalExpenses ?? ""}" readonly />
            </div>
          </div>

          <div class="form-two">
            <div class="form-field">
              <label>Total Revenue</label>
              <input name="totalRevenue" id="orderTotalRevenue" type="number" value="${values.totalRevenue ?? values.total ?? ""}" readonly />
            </div>

            <div class="form-field">
              <label>Total Profit</label>
              <input name="totalProfit" id="orderTotalProfit" type="number" value="${values.totalProfit ?? ""}" readonly />
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function attachOrderCalculationHandlers() {
    const inventorySelect = document.getElementById("orderInventorySelect");
    const itemInput = document.getElementById("orderItem");
    const skuInput = document.getElementById("orderSku");
    const availableStockInput = document.getElementById("orderAvailableStock");
    const quantityInput = document.getElementById("orderQuantity");
    const costInput = document.getElementById("orderCost");
    const srpInput = document.getElementById("orderSrp");
    const totalExpensesInput = document.getElementById("orderTotalExpenses");
    const totalRevenueInput = document.getElementById("orderTotalRevenue");
    const totalProfitInput = document.getElementById("orderTotalProfit");

    if (
      !inventorySelect ||
      !itemInput ||
      !skuInput ||
      !availableStockInput ||
      !quantityInput ||
      !costInput ||
      !srpInput ||
      !totalExpensesInput ||
      !totalRevenueInput ||
      !totalProfitInput
    ) {
      return;
    }

    function updateOrderTotals() {
      const selectedInventory = findInventoryById(inventorySelect.value);
      const availableStock = Number(selectedInventory?.quantity) || 0;
      let quantity = Number(quantityInput.value) || 0;
      const cost = Number(costInput.value) || 0;
      const srp = Number(srpInput.value) || 0;

      if (quantity > availableStock && availableStock > 0) {
        quantity = availableStock;
        quantityInput.value = availableStock;
      }

      const totalExpenses = calculateExpenses(cost, quantity);
      const totalRevenue = calculateRevenue(srp, quantity);
      const totalProfit = calculateProfit(cost, srp, quantity);

      totalExpensesInput.value = totalExpenses.toFixed(2);
      totalRevenueInput.value = totalRevenue.toFixed(2);
      totalProfitInput.value = totalProfit.toFixed(2);
    }

    function fillOrderItemDetails() {
      const selectedInventory = findInventoryById(inventorySelect.value);

      if (!selectedInventory) {
        itemInput.value = "";
        skuInput.value = "";
        availableStockInput.value = 0;
        costInput.value = "";
        srpInput.value = "";
        totalExpensesInput.value = "";
        totalRevenueInput.value = "";
        totalProfitInput.value = "";
        return;
      }

      itemInput.value = selectedInventory.productName || "";
      skuInput.value = selectedInventory.sku || "";
      availableStockInput.value = Number(selectedInventory.quantity) || 0;
      costInput.value = Number(selectedInventory.cost) || 0;
      srpInput.value = Number(selectedInventory.srp) || 0;

      updateOrderTotals();
    }

    inventorySelect.addEventListener("change", fillOrderItemDetails);
    quantityInput.addEventListener("input", updateOrderTotals);

    fillOrderItemDetails();
  }

  function renderOrdersTable() {
    const tbody = document.getElementById("ordersTableBody");
    if (!tbody) return;

    if (!state.orders.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No orders found.</td></tr>`;
      return;
    }

    tbody.innerHTML = state.orders.map(order => `
      <tr>
        <td>${escapeHtml(order.orderId)}</td>
        <td>${escapeHtml(order.customer)}</td>
        <td>${escapeHtml(order.item)}</td>
        <td>${formatDisplayDate(order.date)}</td>
        <td><span class="status-pill ${statusClass(order.status)}">${escapeHtml(order.status)}</span></td>
        <td>${peso(Number(order.totalProfit) || 0)}</td>
        <td>
          <div class="action-group">
            <button class="small-btn edit-btn" type="button" onclick="openEdit('orders', '${order.id}')">Edit</button>
            <button class="small-btn delete-btn" type="button" onclick="deleteRecord('orders', '${order.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join("");
  }

  registerEntity("orders", {
    label: "Order",
    isWide: false,
    formHTML: ordersFormHTML,
    afterBuild() {
      attachOrderCalculationHandlers();
    },
    onSubmit(payload) {
      const selectedInventory = findInventoryById(payload.inventoryId);

      if (!selectedInventory) {
        alert("Please select a valid inventory item.");
        return false;
      }

      payload.item = selectedInventory.productName || "";
      payload.sku = selectedInventory.sku || "";
      payload.quantity = Number(payload.quantity) || 0;
      payload.cost = Number(selectedInventory.cost) || 0;
      payload.srp = Number(selectedInventory.srp) || 0;

      const availableStock = Number(selectedInventory.quantity) || 0;

      if (payload.quantity <= 0) {
        alert("Quantity must be greater than 0.");
        return false;
      }

      if (state.editId) {
        const existingOrder = state.orders.find(item => item.id === state.editId);
        const oldInventoryId = existingOrder?.inventoryId;
        const oldQuantity = Number(existingOrder?.quantity) || 0;

        let effectiveAvailableStock = availableStock;

        if (String(oldInventoryId) === String(selectedInventory.id)) {
          effectiveAvailableStock = availableStock + oldQuantity;
        }

        if (payload.quantity > effectiveAvailableStock) {
          alert("Order quantity cannot be greater than available stock.");
          return false;
        }

        if (oldInventoryId && String(oldInventoryId) !== String(selectedInventory.id)) {
          state.inventory = state.inventory.map(item => {
            if (String(item.id) === String(oldInventoryId)) {
              return {
                ...item,
                quantity: (Number(item.quantity) || 0) + oldQuantity
              };
            }
            return item;
          });
        }

        state.inventory = state.inventory.map(item => {
          if (String(item.id) === String(selectedInventory.id)) {
            const restoredStock = String(oldInventoryId) === String(selectedInventory.id)
              ? (Number(item.quantity) || 0) + oldQuantity
              : (Number(item.quantity) || 0);

            return {
              ...item,
              quantity: restoredStock - payload.quantity
            };
          }
          return item;
        });

        payload.totalExpenses = calculateExpenses(payload.cost, payload.quantity);
        payload.totalRevenue = calculateRevenue(payload.srp, payload.quantity);
        payload.totalProfit = calculateProfit(payload.cost, payload.srp, payload.quantity);

        state.orders = state.orders.map(item =>
          item.id === state.editId ? { ...item, ...payload } : item
        );
      } else {
        if (payload.quantity > availableStock) {
          alert("Order quantity cannot be greater than available stock.");
          return false;
        }

        payload.totalExpenses = calculateExpenses(payload.cost, payload.quantity);
        payload.totalRevenue = calculateRevenue(payload.srp, payload.quantity);
        payload.totalProfit = calculateProfit(payload.cost, payload.srp, payload.quantity);

        state.inventory = state.inventory.map(item => {
          if (String(item.id) === String(selectedInventory.id)) {
            return {
              ...item,
              quantity: availableStock - payload.quantity
            };
          }
          return item;
        });

        state.orders.unshift({
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          ...payload
        });
      }

      saveData("inventory");
      saveData("orders");
    },
    beforeDelete(record) {
      if (record?.inventoryId) {
        state.inventory = state.inventory.map(item => {
          if (String(item.id) === String(record.inventoryId)) {
            return {
              ...item,
              quantity: (Number(item.quantity) || 0) + (Number(record.quantity) || 0)
            };
          }
          return item;
        });

        saveData("inventory");
      }

      return true;
    }
  });

  registerPanel({
    name: "orders",
    render: renderOrdersTable
  });
})();