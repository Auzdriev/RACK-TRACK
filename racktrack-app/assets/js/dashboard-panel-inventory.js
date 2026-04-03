(function () {
  const {
    state,
    registerEntity,
    registerPanel,
    saveData,
    calculateExpenses,
    calculateRevenue,
    calculateProfit,
    peso,
    escapeHtml,
    renderImageCell,
    renderCategoryBadge,
    productOptions,
    categoryOptions,
    findProductBySku,
    findInventoryById,
    getMovementType,
    movementClass,
    differenceClass,
    formatDifference,
    formatHistoryDate,
    formatHistoryTime,
    addStockHistoryEntry,
    addSaleRecord,
    syncInventoryFromProduct,
    openModal,
    refreshAll,
    groupRecordsByDay,
    getRecentGroupedRecords,
    toDateKey,
    getLatestDateKey
  } = window.RackTrack;

  const tablePagerState = {
    inventory: {},
    stockHistory: {},
    recentInventory: {},
    recentStockHistory: {}
  };

  function matchesDateFilter(record, dateField, selectedDate, fallbackLatestDate) {
    const recordDateKey = toDateKey(record[dateField]);

    if (selectedDate) {
      return recordDateKey === selectedDate;
    }

    if (fallbackLatestDate) {
      return recordDateKey === fallbackLatestDate;
    }

    return true;
  }

  function getInventoryActiveDateFilter() {
    const input = document.getElementById("inventoryDateFilter");
    return input ? String(input.value || "").trim() : "";
  }

  function getStockHistoryActiveDateFilter() {
    const input = document.getElementById("stockHistoryDateFilter");
    return input ? String(input.value || "").trim() : "";
  }

  function getPagerState(scope, groupKey, maxTables) {
    const current = Number(tablePagerState[scope]?.[groupKey]) || 0;
    if (current < 0) return 0;
    if (current >= maxTables) return 0;
    return current;
  }

  function setPagerState(scope, groupKey, index) {
    if (!tablePagerState[scope]) {
      tablePagerState[scope] = {};
    }
    tablePagerState[scope][groupKey] = index;
  }

  function buildPagerButtons(scope, groupKey, tableCount, activeIndex) {
    if (tableCount <= 1) {
      return "";
    }

    return `
      <div class="table-page-switcher" data-scope="${escapeHtml(scope)}" data-group-key="${escapeHtml(groupKey)}">
        ${Array.from({ length: tableCount }, (_, index) => `
          <button
            type="button"
            class="table-page-btn ${index === activeIndex ? "active" : ""}"
            data-table-page-btn="true"
            data-scope="${escapeHtml(scope)}"
            data-group-key="${escapeHtml(groupKey)}"
            data-table-index="${index}"
          >
            ${index + 1}
          </button>
        `).join("")}
      </div>
    `;
  }

  function productFormHTML(values = {}) {
    const noCategory = !state.categories.length;

    return `
      <div class="form-grid two-columns">
        <div class="form-left">
          <div class="form-field">
            <label>Product Name</label>
            <input name="productName" placeholder="Product Name" value="${escapeHtml(values.productName || "")}" required />
          </div>

          <div class="form-two">
            <div class="form-field">
              <label>SKU</label>
              <input name="sku" placeholder="SKU" value="${escapeHtml(values.sku || "")}" required />
            </div>
            <div class="form-field">
              <label>Variant</label>
              <input name="variant" placeholder="Variant" value="${escapeHtml(values.variant || "")}" />
            </div>
          </div>

          <div class="form-field">
            <label>Description</label>
            <textarea name="description" placeholder="Write product description...">${escapeHtml(values.description || "")}</textarea>
          </div>

          <div class="form-two">
            <div class="form-field">
              <label>Category</label>
              <select name="category" required ${noCategory ? "disabled" : ""}>
                ${categoryOptions(values.category || "")}
              </select>
              ${noCategory ? `<div class="field-note warning">Create a category first before adding a product.</div>` : ""}
            </div>

            <div class="form-field">
              <label>Cost</label>
              <input name="cost" type="number" min="0" step="0.01" placeholder="Cost" value="${values.cost ?? ""}" required />
            </div>
          </div>

          <div class="form-field">
            <label>SRP</label>
            <input name="srp" type="number" min="0" step="0.01" placeholder="SRP" value="${values.srp ?? ""}" required />
          </div>
        </div>

        <div class="form-right">
          <div class="image-upload-box">
            <div class="image-preview-wrap" id="imagePreviewWrap">
              ${
                values.imageData
                  ? `<img src="${values.imageData}" alt="Product Preview" id="imagePreview" />`
                  : `<div class="image-preview-empty" id="imagePreviewEmpty">No image uploaded yet</div>`
              }
            </div>

            <input type="hidden" name="imageData" id="imageDataInput" value="${values.imageData || ""}" />
            <input type="file" id="imageFileInput" class="hidden-file-input" accept="image/*" />

            <div class="upload-actions">
              <button type="button" class="upload-btn" id="chooseImageBtn">Upload Image</button>
              <button type="button" class="remove-image-btn" id="removeImageBtn">Remove Image</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function populateInventoryFieldsFromProduct(product) {
    const productNameInput = document.getElementById("inventoryProductName");
    const skuInput = document.getElementById("inventorySku");
    const variantInput = document.getElementById("inventoryVariant");
    const descriptionInput = document.getElementById("inventoryDescription");
    const categoryInput = document.getElementById("inventoryCategory");
    const costInput = document.getElementById("inventoryCost");
    const srpInput = document.getElementById("inventorySrp");
    const imageDataInput = document.getElementById("inventoryImageData");
    const imagePreviewWrap = document.getElementById("inventoryImagePreviewWrap");

    if (!product) {
      if (productNameInput) productNameInput.value = "";
      if (skuInput) skuInput.value = "";
      if (variantInput) variantInput.value = "";
      if (descriptionInput) descriptionInput.value = "";
      if (categoryInput) categoryInput.value = "";
      if (costInput) costInput.value = "";
      if (srpInput) srpInput.value = "";
      if (imageDataInput) imageDataInput.value = "";

      if (imagePreviewWrap) {
        imagePreviewWrap.innerHTML = `<div class="image-preview-empty">No image available</div>`;
      }
      return;
    }

    if (productNameInput) productNameInput.value = product.productName || "";
    if (skuInput) skuInput.value = product.sku || "";
    if (variantInput) variantInput.value = product.variant || "";
    if (descriptionInput) descriptionInput.value = product.description || "";
    if (categoryInput) categoryInput.value = product.category || "";
    if (costInput) costInput.value = product.cost ?? "";
    if (srpInput) srpInput.value = product.srp ?? "";
    if (imageDataInput) imageDataInput.value = product.imageData || "";

    if (imagePreviewWrap) {
      imagePreviewWrap.innerHTML = product.imageData
        ? `<img src="${product.imageData}" alt="Product Preview" />`
        : `<div class="image-preview-empty">No image available</div>`;
    }
  }

  function inventoryFormHTML(values = {}) {
    const selectedProduct = findProductBySku(values.sku || "");
    const hasProducts = state.products.length > 0;
    const isEditMode = Boolean(state.editId);
    const currentQty = Number(values.quantity) || 0;

    return `
      <div class="form-grid two-columns">
        <div class="form-left">
          <div class="form-field">
            <label>Select Product</label>
            <select name="sourceProductSku" id="inventoryProductSelect" required ${hasProducts ? "" : "disabled"} ${isEditMode ? "disabled" : ""}>
              ${productOptions(values.sku || "")}
            </select>

            ${
              isEditMode
                ? `<input type="hidden" name="sourceProductSku" value="${escapeHtml(values.sku || "")}" />`
                : ""
            }

            ${
              isEditMode
                ? `<div class="field-note">Product cannot be changed while editing this inventory record.</div>`
                : hasProducts
                  ? `<div class="field-note">Inventory can only use products from your Products list.</div>`
                  : `<div class="field-note warning">Add a product first before adding inventory.</div>`
            }
          </div>

          <div class="form-field">
            <label>Product Name</label>
            <input id="inventoryProductName" name="productName" value="${escapeHtml(selectedProduct?.productName || values.productName || "")}" readonly />
          </div>

          <div class="form-two">
            <div class="form-field">
              <label>SKU</label>
              <input id="inventorySku" name="sku" value="${escapeHtml(selectedProduct?.sku || values.sku || "")}" readonly />
            </div>
            <div class="form-field">
              <label>Variant</label>
              <input id="inventoryVariant" name="variant" value="${escapeHtml(selectedProduct?.variant || values.variant || "")}" readonly />
            </div>
          </div>

          <div class="form-field">
            <label>Description</label>
            <textarea id="inventoryDescription" name="description" readonly>${escapeHtml(selectedProduct?.description || values.description || "")}</textarea>
          </div>

          <div class="form-two">
            <div class="form-field">
              <label>Category</label>
              <input id="inventoryCategory" name="category" value="${escapeHtml(selectedProduct?.category || values.category || "")}" readonly />
            </div>

            ${
              isEditMode
                ? `
                  <div class="form-field">
                    <label>Current Quantity</label>
                    <input type="number" value="${currentQty}" readonly />
                  </div>
                `
                : `
                  <div class="form-field">
                    <label>Quantity</label>
                    <input name="quantity" type="number" min="0" step="1" placeholder="Quantity" value="${values.quantity ?? ""}" required />
                  </div>
                `
            }
          </div>

          ${
            isEditMode
              ? `
                <div class="form-two">
                  <div class="form-field">
                    <label>New Quantity</label>
                    <input name="quantity" type="number" min="0" step="1" placeholder="Enter new quantity" value="${values.quantity ?? ""}" required />
                  </div>

                  <div class="form-field">
                    <label>Movement Type</label>
                    <input id="inventoryMovementTypePreview" type="text" value="No Change" readonly />
                  </div>
                </div>

                <div class="form-field">
                  <label>Reason / Note</label>
                  <textarea
                    name="stockNote"
                    id="stockNote"
                    placeholder="Required if quantity changes. Example: New delivery received / Damaged items pulled out / Manual stock correction"
                  ></textarea>
                  <div class="field-note warning">
                    Note is required when quantity is increased or decreased.
                  </div>
                </div>
              `
              : ""
          }

          <div class="form-two">
            <div class="form-field">
              <label>Cost</label>
              <input id="inventoryCost" name="cost" type="number" value="${selectedProduct?.cost ?? values.cost ?? ""}" readonly />
            </div>
            <div class="form-field">
              <label>SRP</label>
              <input id="inventorySrp" name="srp" type="number" value="${selectedProduct?.srp ?? values.srp ?? ""}" readonly />
            </div>
          </div>
        </div>

        <div class="form-right">
          <div class="image-upload-box">
            <div class="image-preview-wrap" id="inventoryImagePreviewWrap">
              ${
                (selectedProduct?.imageData || values.imageData)
                  ? `<img src="${selectedProduct?.imageData || values.imageData}" alt="Product Preview" />`
                  : `<div class="image-preview-empty">No image available</div>`
              }
            </div>

            <input type="hidden" name="imageData" id="inventoryImageData" value="${selectedProduct?.imageData || values.imageData || ""}" />

            <div class="product-source-note">
              Product details here are connected to your Products list.
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function sellFormHTML(values = {}) {
    const item = findInventoryById(values.inventoryId || values.id || "");
    const availableQty = Number(item?.quantity) || 0;

    return `
      <div class="form-grid two-columns">
        <div class="form-left">
          <div class="form-field">
            <label>Product Name</label>
            <input value="${escapeHtml(item?.productName || "")}" readonly />
            <input type="hidden" name="inventoryId" value="${escapeHtml(item?.id || "")}" />
          </div>

          <div class="form-two">
            <div class="form-field">
              <label>SKU</label>
              <input value="${escapeHtml(item?.sku || "")}" readonly />
            </div>

            <div class="form-field">
              <label>Available Stock</label>
              <input value="${availableQty}" readonly />
            </div>
          </div>

          <div class="form-two">
            <div class="form-field">
              <label>Cost</label>
              <input id="sellCost" value="${Number(item?.cost) || 0}" readonly />
            </div>

            <div class="form-field">
              <label>Selling Price (SRP)</label>
              <input id="sellSrp" value="${Number(item?.srp) || 0}" readonly />
            </div>
          </div>

          <div class="form-two">
            <div class="form-field">
              <label>Quantity to Sell</label>
              <input name="quantitySold" id="sellQuantity" type="number" min="1" max="${availableQty}" value="1" required />
            </div>

            <div class="form-field">
              <label>Date Sold</label>
              <input name="soldDate" type="date" value="${new Date().toISOString().slice(0, 10)}" required />
            </div>
          </div>

          <div class="form-two">
            <div class="form-field">
              <label>Total Sale Amount</label>
              <input name="saleAmount" id="sellAmount" value="0" readonly />
            </div>

            <div class="form-field">
              <label>Total Profit</label>
              <input name="profitAmount" id="sellProfit" value="0" readonly />
            </div>
          </div>

          <div class="form-field">
            <label>Note</label>
            <textarea name="sellNote" placeholder="Optional note for this sale"></textarea>
          </div>
        </div>

        <div class="form-right">
          <div class="image-upload-box">
            <div class="image-preview-wrap">
              ${
                item?.imageData
                  ? `<img src="${item.imageData}" alt="Product Preview" />`
                  : `<div class="image-preview-empty">No image available</div>`
              }
            </div>

            <div class="product-source-note">
              Selling from Inventory will reduce stock and create sales + movement history records.
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function attachImageUploadHandlers() {
    const chooseImageBtn = document.getElementById("chooseImageBtn");
    const removeImageBtn = document.getElementById("removeImageBtn");
    const imageFileInput = document.getElementById("imageFileInput");
    const imageDataInput = document.getElementById("imageDataInput");
    const imagePreviewWrap = document.getElementById("imagePreviewWrap");

    if (chooseImageBtn && imageFileInput) {
      chooseImageBtn.addEventListener("click", () => imageFileInput.click());
    }

    if (imageFileInput && imageDataInput && imagePreviewWrap) {
      imageFileInput.addEventListener("change", event => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || "");
          imageDataInput.value = result;
          imagePreviewWrap.innerHTML = `<img src="${result}" alt="Product Preview" id="imagePreview" />`;
        };
        reader.readAsDataURL(file);
      });
    }

    if (removeImageBtn && imageDataInput && imagePreviewWrap && imageFileInput) {
      removeImageBtn.addEventListener("click", () => {
        imageDataInput.value = "";
        imageFileInput.value = "";
        imagePreviewWrap.innerHTML = `<div class="image-preview-empty" id="imagePreviewEmpty">No image uploaded yet</div>`;
      });
    }
  }

  function attachInventoryProductHandlers(initialSku = "") {
    const productSelect = document.getElementById("inventoryProductSelect");
    if (!productSelect) return;

    if (initialSku) {
      const initialProduct = findProductBySku(initialSku);
      populateInventoryFieldsFromProduct(initialProduct);
    }

    productSelect.addEventListener("change", event => {
      const selectedProduct = findProductBySku(event.target.value);
      populateInventoryFieldsFromProduct(selectedProduct);
    });
  }

  function attachInventoryQuantityNoteHandlers(initialQty = 0) {
    const quantityInput = document.querySelector('#recordForm input[name="quantity"]');
    const movementPreview = document.getElementById("inventoryMovementTypePreview");

    if (!quantityInput || !movementPreview) return;

    function updateMovementPreview() {
      const oldQty = Number(initialQty) || 0;
      const newQty = Number(quantityInput.value) || 0;
      movementPreview.value = getMovementType(oldQty, newQty);
    }

    quantityInput.addEventListener("input", updateMovementPreview);
    updateMovementPreview();
  }

  function attachSellCalculationHandlers() {
    const qtyInput = document.getElementById("sellQuantity");
    const costInput = document.getElementById("sellCost");
    const srpInput = document.getElementById("sellSrp");
    const amountInput = document.getElementById("sellAmount");
    const profitInput = document.getElementById("sellProfit");

    if (!qtyInput || !costInput || !srpInput || !amountInput || !profitInput) return;

    function update() {
      const qty = Number(qtyInput.value) || 0;
      const cost = Number(costInput.value) || 0;
      const srp = Number(srpInput.value) || 0;

      amountInput.value = calculateRevenue(srp, qty).toFixed(2);
      profitInput.value = calculateProfit(cost, srp, qty).toFixed(2);
    }

    qtyInput.addEventListener("input", update);
    update();
  }

  function buildInventoryRows(tableItems) {
    return tableItems.map(item => {
      const qty = Number(item.quantity) || 0;
      const cost = Number(item.cost) || 0;
      const srp = Number(item.srp) || 0;
      const totalExpenses = calculateExpenses(cost, qty);
      const totalRevenue = calculateRevenue(srp, qty);
      const totalProfit = calculateProfit(cost, srp, qty);
      const isLowStock = qty <= 5;
      const statusText = isLowStock ? "Low Stock" : "In Stock";
      const stockStatusClass = isLowStock ? "low-stock" : "in-stock";

      return `
        <tr>
          <td>${renderImageCell(item.imageData, item.productName)}</td>
          <td>${escapeHtml(item.productName)}</td>
          <td>${escapeHtml(item.sku)}</td>
          <td>${escapeHtml(item.variant || "-")}</td>
          <td>${renderCategoryBadge(item.category)}</td>
          <td>${peso(cost)}</td>
          <td>${peso(srp)}</td>
          <td>${qty}</td>
          <td>${peso(totalExpenses)}</td>
          <td>${peso(totalRevenue)}</td>
          <td>${peso(totalProfit)}</td>
          <td><span class="stock-status ${stockStatusClass}">${statusText}</span></td>
          <td>
            <div class="action-group">
              <button class="small-btn edit-btn" type="button" onclick="openEdit('inventory', '${item.id}')">Edit</button>
              <button class="small-btn sell-btn" type="button" onclick="window.RackTrackInventoryPanel.openSellModal('${item.id}')">Sell</button>
              <button class="small-btn delete-btn" type="button" onclick="deleteRecord('inventory', '${item.id}')">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  function buildStockHistoryRows(tableItems) {
    return tableItems.map(entry => `
      <tr>
        <td class="history-date">${formatHistoryDate(entry.createdAt)}</td>
        <td class="history-time">${formatHistoryTime(entry.createdAt)}</td>
        <td>${escapeHtml(entry.productName || "-")}</td>
        <td>${escapeHtml(entry.sku || "-")}</td>
        <td>${renderCategoryBadge(entry.category || "")}</td>
        <td>${Number(entry.oldQuantity) || 0}</td>
        <td>${Number(entry.newQuantity) || 0}</td>
        <td class="history-diff ${differenceClass(entry.difference)}">${formatDifference(entry.difference)}</td>
        <td>
          <span class="movement-pill ${movementClass(entry.movementType)}">
            ${escapeHtml(entry.movementType || "No Change")}
          </span>
        </td>
        <td class="sale-amount-cell">${Number(entry.saleAmount) ? peso(entry.saleAmount) : "-"}</td>
        <td class="profit-amount-cell">${Number(entry.profitAmount) ? peso(entry.profitAmount) : "-"}</td>
        <td class="note-cell">${escapeHtml(entry.note || "-")}</td>
      </tr>
    `).join("");
  }

  function renderGroupedInventoryTables(groups) {
    return groups.map(group => {
      const groupKey = `inventory-${group.dateKey}`;
      const activeIndex = getPagerState("inventory", groupKey, group.tables.length);
      const activeTable = group.tables[activeIndex] || group.tables[0] || [];

      return `
        <tr>
          <td colspan="13" class="grouped-table-wrapper-cell">
            <div class="daily-group-block">
              <div class="daily-group-header daily-group-header-with-pages">
                <h3>${escapeHtml(group.date)}</h3>
                ${buildPagerButtons("inventory", groupKey, group.tables.length, activeIndex)}
              </div>

              <div class="grouped-table-card">
                <div class="grouped-table-title">Table ${activeIndex + 1}</div>
                <div class="table-responsive">
                  <table class="data-table generated-subtable">
                    <thead>
                      <tr>
                        <th>Image</th>
                        <th>Product Name</th>
                        <th>SKU</th>
                        <th>Variant</th>
                        <th>Category</th>
                        <th>Cost</th>
                        <th>SRP</th>
                        <th>Qty</th>
                        <th>Total Expenses</th>
                        <th>Total Revenue</th>
                        <th>Total Profit</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${buildInventoryRows(activeTable)}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  function renderGroupedStockHistoryTables(groups) {
    return groups.map(group => {
      const groupKey = `stockHistory-${group.dateKey}`;
      const activeIndex = getPagerState("stockHistory", groupKey, group.tables.length);
      const activeTable = group.tables[activeIndex] || group.tables[0] || [];

      return `
        <tr>
          <td colspan="12" class="grouped-table-wrapper-cell">
            <div class="daily-group-block">
              <div class="daily-group-header daily-group-header-with-pages">
                <h3>${escapeHtml(group.date)}</h3>
                ${buildPagerButtons("stockHistory", groupKey, group.tables.length, activeIndex)}
              </div>

              <div class="grouped-table-card">
                <div class="grouped-table-title">Table ${activeIndex + 1}</div>
                <div class="table-responsive">
                  <table class="data-table generated-subtable">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Product Name</th>
                        <th>SKU</th>
                        <th>Category</th>
                        <th>Old Qty</th>
                        <th>New Qty</th>
                        <th>Difference</th>
                        <th>Movement</th>
                        <th>Sale Amount</th>
                        <th>Profit Amount</th>
                        <th>Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${buildStockHistoryRows(activeTable)}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  function renderInventoryTable(filter = "") {
    const tbody = document.getElementById("inventoryTableBody");
    if (!tbody) return;

    const term = String(filter || "").trim().toLowerCase();
    const selectedDate = getInventoryActiveDateFilter();
    const latestDate = getLatestDateKey(state.inventory, "createdAt");

    const items = state.inventory.filter(item => {
      const haystack = [
        item.productName,
        item.sku,
        item.variant,
        item.description,
        item.category
      ].join(" ").toLowerCase();

      const matchesSearch = haystack.includes(term);
      const matchesDate = matchesDateFilter(item, "createdAt", selectedDate, latestDate);

      return matchesSearch && matchesDate;
    });

    if (!items.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="13" class="empty-state">
            No inventory records found for ${selectedDate || latestDate || "the selected date"}.
          </td>
        </tr>
      `;
      return;
    }

    const grouped = groupRecordsByDay(items, "createdAt", 10);
    tbody.innerHTML = renderGroupedInventoryTables(grouped);
  }

  function renderProductsTable(filter = "") {
    const tbody = document.getElementById("productsTableBody");
    if (!tbody) return;

    const term = String(filter || "").trim().toLowerCase();

    const items = state.products.filter(item => {
      const haystack = [
        item.productName,
        item.sku,
        item.variant,
        item.description,
        item.category
      ].join(" ").toLowerCase();

      return haystack.includes(term);
    });

    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty-state">No products found.</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(item => `
      <tr>
        <td>${renderImageCell(item.imageData, item.productName)}</td>
        <td>${escapeHtml(item.productName)}</td>
        <td>${escapeHtml(item.sku)}</td>
        <td>${escapeHtml(item.variant || "-")}</td>
        <td class="description-cell">${escapeHtml(item.description || "-")}</td>
        <td>${renderCategoryBadge(item.category)}</td>
        <td>${peso(item.cost)}</td>
        <td>${peso(item.srp)}</td>
        <td>
          <div class="action-group">
            <button class="small-btn edit-btn" type="button" onclick="openEdit('products', '${item.id}')">Edit</button>
            <button class="small-btn delete-btn" type="button" onclick="deleteRecord('products', '${item.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join("");
  }

  function renderStockHistoryTable(filter = "") {
    const tbody = document.getElementById("stockHistoryTableBody");
    if (!tbody) return;

    const term = String(filter || "").trim().toLowerCase();
    const selectedDate = getStockHistoryActiveDateFilter();
    const latestDate = getLatestDateKey(state.stockHistory, "createdAt");

    const items = state.stockHistory.filter(entry => {
      const haystack = [
        entry.productName,
        entry.sku,
        entry.category,
        entry.note,
        entry.movementType
      ].join(" ").toLowerCase();

      const matchesSearch = haystack.includes(term);
      const matchesDate = matchesDateFilter(entry, "createdAt", selectedDate, latestDate);

      return matchesSearch && matchesDate;
    });

    if (!items.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="12" class="empty-state">
            No stock movement history found for ${selectedDate || latestDate || "the selected date"}.
          </td>
        </tr>
      `;
      return;
    }

    const grouped = groupRecordsByDay(items, "createdAt", 10);
    tbody.innerHTML = renderGroupedStockHistoryTables(grouped);
  }

  function renderRecentInventoryDashboard(containerId = "recentInventoryDashboard") {
    const container = document.getElementById(containerId);
    if (!container) return;

    const grouped = getRecentGroupedRecords(state.inventory, {
      dateField: "createdAt",
      chunkSize: 10,
      maxGroups: 2,
      maxRowsPerGroup: 5
    });

    if (!grouped.length) {
      container.innerHTML = `<div class="empty-state">No recent inventory records.</div>`;
      return;
    }

    container.innerHTML = grouped.map(group => {
      const groupKey = `recentInventory-${group.dateKey}`;
      const activeIndex = getPagerState("recentInventory", groupKey, group.tables.length);
      const activeTable = group.tables[activeIndex] || group.tables[0] || [];

      return `
        <div class="daily-group-block">
          <div class="daily-group-header daily-group-header-with-pages">
            <h3>${escapeHtml(group.date)}</h3>
            ${buildPagerButtons("recentInventory", groupKey, group.tables.length, activeIndex)}
          </div>

          <div class="grouped-table-card">
            <div class="grouped-table-title">Recent Table ${activeIndex + 1}</div>
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Product Name</th>
                    <th>SKU</th>
                    <th>Qty</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${activeTable.map(item => {
                    const qty = Number(item.quantity) || 0;
                    const isLowStock = qty <= 5;
                    const statusText = isLowStock ? "Low Stock" : "In Stock";
                    const stockStatusClass = isLowStock ? "low-stock" : "in-stock";

                    return `
                      <tr>
                        <td>${renderImageCell(item.imageData, item.productName)}</td>
                        <td>${escapeHtml(item.productName)}</td>
                        <td>${escapeHtml(item.sku)}</td>
                        <td>${qty}</td>
                        <td><span class="stock-status ${stockStatusClass}">${statusText}</span></td>
                      </tr>
                    `;
                  }).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  function renderRecentStockHistoryDashboard(containerId = "recentStockHistoryDashboard") {
    const container = document.getElementById(containerId);
    if (!container) return;

    const grouped = getRecentGroupedRecords(state.stockHistory, {
      dateField: "createdAt",
      chunkSize: 10,
      maxGroups: 2,
      maxRowsPerGroup: 5
    });

    if (!grouped.length) {
      container.innerHTML = `<div class="empty-state">No recent stock history.</div>`;
      return;
    }

    container.innerHTML = grouped.map(group => {
      const groupKey = `recentStockHistory-${group.dateKey}`;
      const activeIndex = getPagerState("recentStockHistory", groupKey, group.tables.length);
      const activeTable = group.tables[activeIndex] || group.tables[0] || [];

      return `
        <div class="daily-group-block">
          <div class="daily-group-header daily-group-header-with-pages">
            <h3>${escapeHtml(group.date)}</h3>
            ${buildPagerButtons("recentStockHistory", groupKey, group.tables.length, activeIndex)}
          </div>

          <div class="grouped-table-card">
            <div class="grouped-table-title">Recent Table ${activeIndex + 1}</div>
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Difference</th>
                    <th>Movement</th>
                  </tr>
                </thead>
                <tbody>
                  ${activeTable.map(entry => `
                    <tr>
                      <td>${formatHistoryTime(entry.createdAt)}</td>
                      <td>${escapeHtml(entry.productName || "-")}</td>
                      <td>${escapeHtml(entry.sku || "-")}</td>
                      <td class="history-diff ${differenceClass(entry.difference)}">${formatDifference(entry.difference)}</td>
                      <td>
                        <span class="movement-pill ${movementClass(entry.movementType)}">
                          ${escapeHtml(entry.movementType || "No Change")}
                        </span>
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  function renderCategoryList() {
    const list = document.getElementById("categoryList");
    if (!list) return;

    if (!state.categories.length) {
      list.innerHTML = `<div class="empty-state">No categories yet.</div>`;
      return;
    }

    list.innerHTML = state.categories.map(category => `
      <div class="category-item">
        <div class="category-item-left">
          ${renderCategoryBadge(category.name)}
          <small>${escapeHtml(category.color || "")}</small>
        </div>
        <button
          type="button"
          class="small-btn delete-btn"
          onclick="window.RackTrackInventoryPanel.deleteCategory('${category.id}')"
        >
          Delete
        </button>
      </div>
    `).join("");
  }

  function switchInventoryTab(tabName) {
    state.currentInventoryTab = tabName;

    document.querySelectorAll(".inventory-top-tab").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.inventoryTab === tabName);
    });

    const itemsView = document.getElementById("inventory-items-view");
    const productsView = document.getElementById("inventory-products-view");
    const mainActionBtn = document.getElementById("inventoryMainActionBtn");

    if (itemsView) itemsView.classList.toggle("active", tabName === "items");
    if (productsView) productsView.classList.toggle("active", tabName === "products");

    if (mainActionBtn) {
      mainActionBtn.textContent = tabName === "products" ? "+ Add Product" : "+ Add Item";
    }
  }

  function openSellModal(id) {
    const item = findInventoryById(id);
    if (!item) return;

    window.RackTrack.state.editId = null;
    window.RackTrack.buildForm("sell", { id: item.id, inventoryId: item.id });
    const modal = document.getElementById("formModal");
    if (modal) modal.classList.add("show");
  }

  function handleCategorySubmit(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    const name = String(formData.get("categoryName") || "").trim();
    const color = String(formData.get("categoryColor") || "#f2b14c");

    if (!name) {
      alert("Category name is required.");
      return;
    }

    const existing = state.categories.find(item =>
      String(item.name || "").trim().toLowerCase() === name.toLowerCase()
    );

    if (existing) {
      alert("Category already exists.");
      return;
    }

    state.categories.unshift({
      id: crypto.randomUUID(),
      name,
      color
    });

    saveData("categories");
    form.reset();

    const colorInput = document.getElementById("categoryColor");
    if (colorInput) colorInput.value = "#f2b14c";

    renderCategoryList();
    refreshAll();
  }

  function deleteCategory(id) {
    const category = state.categories.find(item => item.id === id);
    if (!category) return;

    const usedInProducts = state.products.some(product =>
      String(product.category || "").trim().toLowerCase() === String(category.name || "").trim().toLowerCase()
    );

    const usedInInventory = state.inventory.some(item =>
      String(item.category || "").trim().toLowerCase() === String(category.name || "").trim().toLowerCase()
    );

    if (usedInProducts || usedInInventory) {
      alert("This category is already used by products or inventory. Remove those first before deleting the category.");
      return;
    }

    const approved = confirm(`Delete category "${category.name}"?`);
    if (!approved) return;

    state.categories = state.categories.filter(item => item.id !== id);
    saveData("categories");
    renderCategoryList();
    refreshAll();
  }

  registerEntity("products", {
    label: "Product",
    isWide: true,
    formHTML: productFormHTML,
    afterBuild() {
      attachImageUploadHandlers();
    },
    onSubmit(payload) {
      if (!payload.category) {
        alert("Please select a category.");
        return false;
      }

      payload.cost = Number(payload.cost) || 0;
      payload.srp = Number(payload.srp) || 0;

      const existingDuplicate = state.products.find(item => {
        if (state.editId && item.id === state.editId) return false;

        return String(item.sku || "").trim().toLowerCase() === String(payload.sku || "").trim().toLowerCase();
      });

      if (existingDuplicate) {
        alert("SKU already exists. Please use a unique SKU.");
        return false;
      }

      if (state.editId) {
        const oldRecord = state.products.find(item => item.id === state.editId);

        state.products = state.products.map(item =>
          item.id === state.editId ? { ...item, ...payload } : item
        );

        saveData("products");
        syncInventoryFromProduct(payload, oldRecord?.sku || payload.sku);
      } else {
        state.products.unshift({
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          ...payload
        });

        saveData("products");
      }
    },
    afterDelete(record) {
      if (record?.sku) {
        state.inventory = state.inventory.filter(item =>
          String(item.sku || "").trim().toLowerCase() !== String(record.sku || "").trim().toLowerCase()
        );
        saveData("inventory");
      }
    }
  });

  registerEntity("inventory", {
    label: "Inventory Item",
    isWide: true,
    formHTML: inventoryFormHTML,
    afterBuild(values) {
      attachInventoryProductHandlers(values.sku || "");

      if (state.editId) {
        attachInventoryQuantityNoteHandlers(Number(values.quantity) || 0);
      }
    },
    onSubmit(payload) {
      const existingRecord = state.editId
        ? state.inventory.find(item => item.id === state.editId)
        : null;

      const selectedSku = String(
        payload.sourceProductSku ||
        existingRecord?.sku ||
        payload.sku ||
        ""
      ).trim();

      const sourceProduct = findProductBySku(selectedSku);

      if (!sourceProduct) {
        alert("Please select a valid product from the Products list.");
        return false;
      }

      const newQuantity = Number(payload.quantity) || 0;

      if (state.editId) {
        const oldQuantity = Number(existingRecord?.quantity) || 0;
        const movementType = getMovementType(oldQuantity, newQuantity);
        const stockNote = String(payload.stockNote || "").trim();

        if (movementType !== "No Change" && !stockNote) {
          alert("Reason / Note is required when quantity changes.");
          return false;
        }

        const inventoryPayload = {
          productName: sourceProduct.productName,
          sku: sourceProduct.sku,
          variant: sourceProduct.variant,
          description: sourceProduct.description,
          category: sourceProduct.category,
          cost: Number(sourceProduct.cost) || 0,
          srp: Number(sourceProduct.srp) || 0,
          quantity: newQuantity,
          imageData: sourceProduct.imageData || ""
        };

        state.inventory = state.inventory.map(item =>
          item.id === state.editId ? { ...item, ...inventoryPayload } : item
        );

        if (movementType !== "No Change") {
          addStockHistoryEntry({
            itemId: existingRecord?.id || state.editId,
            productName: sourceProduct.productName,
            sku: sourceProduct.sku,
            category: sourceProduct.category,
            oldQuantity,
            newQuantity,
            movementType,
            note: stockNote
          });
        }
      } else {
        const inventoryPayload = {
          productName: sourceProduct.productName,
          sku: sourceProduct.sku,
          variant: sourceProduct.variant,
          description: sourceProduct.description,
          category: sourceProduct.category,
          cost: Number(sourceProduct.cost) || 0,
          srp: Number(sourceProduct.srp) || 0,
          quantity: newQuantity,
          imageData: sourceProduct.imageData || "",
          createdAt: new Date().toISOString()
        };

        const existingIndex = state.inventory.findIndex(item =>
          String(item.sku || "").trim().toLowerCase() === String(sourceProduct.sku || "").trim().toLowerCase()
        );

        if (existingIndex >= 0) {
          const oldQuantity = Number(state.inventory[existingIndex].quantity) || 0;

          state.inventory[existingIndex] = {
            ...state.inventory[existingIndex],
            ...inventoryPayload
          };

          addStockHistoryEntry({
            itemId: state.inventory[existingIndex].id,
            productName: sourceProduct.productName,
            sku: sourceProduct.sku,
            category: sourceProduct.category,
            oldQuantity,
            newQuantity,
            movementType: getMovementType(oldQuantity, newQuantity),
            note: "Inventory item updated from add item form"
          });
        } else {
          const newItem = {
            id: crypto.randomUUID(),
            ...inventoryPayload
          };

          state.inventory.unshift(newItem);

          addStockHistoryEntry({
            itemId: newItem.id,
            productName: sourceProduct.productName,
            sku: sourceProduct.sku,
            category: sourceProduct.category,
            oldQuantity: 0,
            newQuantity,
            movementType: "Stock In",
            note: "Initial inventory entry"
          });
        }
      }

      saveData("inventory");
    }
  });

  registerEntity("sell", {
    label: "Sell Item",
    isWide: true,
    submitLabel: "Confirm Sale",
    formHTML: sellFormHTML,
    afterBuild() {
      attachSellCalculationHandlers();
    },
    onSubmit(payload) {
      const item = findInventoryById(payload.inventoryId);
      if (!item) {
        alert("Inventory item not found.");
        return false;
      }

      const oldQuantity = Number(item.quantity) || 0;
      const quantitySold = Number(payload.quantitySold) || 0;

      if (quantitySold <= 0) {
        alert("Quantity to sell must be greater than 0.");
        return false;
      }

      if (quantitySold > oldQuantity) {
        alert("Quantity to sell cannot be greater than available stock.");
        return false;
      }

      const saleAmount = calculateRevenue(item.srp, quantitySold);
      const profitAmount = calculateProfit(item.cost, item.srp, quantitySold);
      const newQuantity = oldQuantity - quantitySold;

      state.inventory = state.inventory.map(inventoryItem => {
        if (String(inventoryItem.id) === String(item.id)) {
          return {
            ...inventoryItem,
            quantity: newQuantity
          };
        }

        return inventoryItem;
      });

      addSaleRecord({
        inventoryId: item.id,
        productName: item.productName,
        sku: item.sku,
        category: item.category,
        quantitySold,
        cost: Number(item.cost) || 0,
        srp: Number(item.srp) || 0,
        saleAmount,
        profitAmount,
        soldAt: payload.soldDate ? `${payload.soldDate}T00:00:00` : new Date().toISOString(),
        note: payload.sellNote || "Sold from Inventory panel"
      });

      addStockHistoryEntry({
        itemId: item.id,
        productName: item.productName,
        sku: item.sku,
        category: item.category,
        oldQuantity,
        newQuantity,
        movementType: "Sold",
        note: payload.sellNote || `Sold ${quantitySold} item(s)`,
        saleAmount,
        profitAmount
      });

      saveData("inventory");
    }
  });

  registerPanel({
    name: "inventory",
    render() {
      const inventorySearch = document.getElementById("inventorySearch");
      const productsSearch = document.getElementById("productsSearch");
      const stockHistorySearch = document.getElementById("stockHistorySearch");

      renderInventoryTable(inventorySearch ? inventorySearch.value : "");
      renderProductsTable(productsSearch ? productsSearch.value : "");
      renderStockHistoryTable(stockHistorySearch ? stockHistorySearch.value : "");
      renderCategoryList();
      renderRecentInventoryDashboard("recentInventoryDashboard");
      renderRecentStockHistoryDashboard("recentStockHistoryDashboard");
    }
  });

  function handleTablePagerClick(event) {
    const button = event.target.closest("[data-table-page-btn]");
    if (!button) return;

    const scope = String(button.dataset.scope || "");
    const groupKey = String(button.dataset.groupKey || "");
    const tableIndex = Number(button.dataset.tableIndex);

    if (!scope || !groupKey || Number.isNaN(tableIndex)) return;

    setPagerState(scope, groupKey, tableIndex);

    const inventorySearch = document.getElementById("inventorySearch");
    const productsSearch = document.getElementById("productsSearch");
    const stockHistorySearch = document.getElementById("stockHistorySearch");

    if (scope === "inventory") {
      renderInventoryTable(inventorySearch ? inventorySearch.value : "");
      return;
    }

    if (scope === "stockHistory") {
      renderStockHistoryTable(stockHistorySearch ? stockHistorySearch.value : "");
      return;
    }

    if (scope === "recentInventory") {
      renderRecentInventoryDashboard("recentInventoryDashboard");
      return;
    }

    if (scope === "recentStockHistory") {
      renderRecentStockHistoryDashboard("recentStockHistoryDashboard");
    }
  }

  function setupInventoryEvents() {
    const inventorySearch = document.getElementById("inventorySearch");
    if (inventorySearch) {
      inventorySearch.addEventListener("input", event => {
        renderInventoryTable(event.target.value);
      });
    }

    const productsSearch = document.getElementById("productsSearch");
    if (productsSearch) {
      productsSearch.addEventListener("input", event => {
        renderProductsTable(event.target.value);
      });
    }

    const stockHistorySearch = document.getElementById("stockHistorySearch");
    if (stockHistorySearch) {
      stockHistorySearch.addEventListener("input", event => {
        renderStockHistoryTable(event.target.value);
      });
    }

    const inventoryDateFilter = document.getElementById("inventoryDateFilter");
    if (inventoryDateFilter) {
      inventoryDateFilter.addEventListener("change", () => {
        renderInventoryTable(inventorySearch ? inventorySearch.value : "");
      });
    }

    const stockHistoryDateFilter = document.getElementById("stockHistoryDateFilter");
    if (stockHistoryDateFilter) {
      stockHistoryDateFilter.addEventListener("change", () => {
        renderStockHistoryTable(stockHistorySearch ? stockHistorySearch.value : "");
      });
    }

    const inventoryLatestBtn = document.getElementById("inventoryLatestBtn");
    if (inventoryLatestBtn) {
      inventoryLatestBtn.addEventListener("click", () => {
        if (inventoryDateFilter) inventoryDateFilter.value = "";
        renderInventoryTable(inventorySearch ? inventorySearch.value : "");
      });
    }

    const stockHistoryLatestBtn = document.getElementById("stockHistoryLatestBtn");
    if (stockHistoryLatestBtn) {
      stockHistoryLatestBtn.addEventListener("click", () => {
        if (stockHistoryDateFilter) stockHistoryDateFilter.value = "";
        renderStockHistoryTable(stockHistorySearch ? stockHistorySearch.value : "");
      });
    }

    const inventoryClearDateBtn = document.getElementById("inventoryClearDateBtn");
    if (inventoryClearDateBtn) {
      inventoryClearDateBtn.addEventListener("click", () => {
        if (inventoryDateFilter) inventoryDateFilter.value = "";
        if (inventorySearch) inventorySearch.value = "";
        renderInventoryTable("");
      });
    }

    const stockHistoryClearDateBtn = document.getElementById("stockHistoryClearDateBtn");
    if (stockHistoryClearDateBtn) {
      stockHistoryClearDateBtn.addEventListener("click", () => {
        if (stockHistoryDateFilter) stockHistoryDateFilter.value = "";
        if (stockHistorySearch) stockHistorySearch.value = "";
        renderStockHistoryTable("");
      });
    }

    const globalSearch = document.getElementById("globalSearch");
    if (globalSearch) {
      globalSearch.addEventListener("input", event => {
        const term = event.target.value.trim().toLowerCase();

        if (!term) {
          refreshAll();
          return;
        }

        renderInventoryTable(term);
        renderProductsTable(term);
        renderStockHistoryTable(term);
      });
    }

    document.querySelectorAll(".inventory-top-tab").forEach(btn => {
      btn.addEventListener("click", () => {
        switchInventoryTab(btn.dataset.inventoryTab);
      });
    });

    const inventoryMainActionBtn = document.getElementById("inventoryMainActionBtn");
    if (inventoryMainActionBtn) {
      inventoryMainActionBtn.addEventListener("click", () => {
        if (state.currentInventoryTab === "products") {
          openModal("products");
        } else {
          openModal("inventory");
        }
      });
    }

    const categoryForm = document.getElementById("categoryForm");
    if (categoryForm) {
      categoryForm.addEventListener("submit", handleCategorySubmit);
    }

    document.addEventListener("click", handleTablePagerClick);
  }

  window.RackTrackInventoryPanel = {
    renderInventoryTable,
    renderProductsTable,
    renderStockHistoryTable,
    renderRecentInventoryDashboard,
    renderRecentStockHistoryDashboard,
    renderCategoryList,
    switchInventoryTab,
    setupInventoryEvents,
    openSellModal,
    deleteCategory
  };
})();