(function () {
  const {
    state,
    registerEntity,
    registerPanel,
    saveData,
    escapeHtml
  } = window.RackTrack;

  function customersFormHTML(values = {}) {
    return `
      <div class="form-grid">
        <input name="name" placeholder="Full name" value="${escapeHtml(values.name || "")}" required />
        <input name="email" type="email" placeholder="Email" value="${escapeHtml(values.email || "")}" required />
        <input name="phone" placeholder="Phone number" value="${escapeHtml(values.phone || "")}" required />
        <input name="address" placeholder="Address" value="${escapeHtml(values.address || "")}" required />
      </div>
    `;
  }

  function renderCustomersTable() {
    const tbody = document.getElementById("customersTableBody");
    if (!tbody) return;

    if (!state.customers.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No customers found.</td></tr>`;
      return;
    }

    tbody.innerHTML = state.customers.map(customer => `
      <tr>
        <td>${escapeHtml(customer.name)}</td>
        <td>${escapeHtml(customer.email)}</td>
        <td>${escapeHtml(customer.phone)}</td>
        <td>${escapeHtml(customer.address)}</td>
        <td>
          <div class="action-group">
            <button class="small-btn edit-btn" type="button" onclick="openEdit('customers', '${customer.id}')">Edit</button>
            <button class="small-btn delete-btn" type="button" onclick="deleteRecord('customers', '${customer.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join("");
  }

  registerEntity("customers", {
    label: "Customer",
    isWide: false,
    formHTML: customersFormHTML,
    onSubmit(payload) {
      if (state.editId) {
        state.customers = state.customers.map(item =>
          item.id === state.editId ? { ...item, ...payload } : item
        );
      } else {
        state.customers.unshift({
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          ...payload
        });
      }

      saveData("customers");
    }
  });

  registerPanel({
    name: "customers",
    render: renderCustomersTable
  });
})();