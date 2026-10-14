const botsPanel = document.getElementById('bots-panel');
const saldosPanel = document.getElementById('saldos-panel');
const switcherPanel = document.getElementById('switcher-panel');
const txBody = document.getElementById('tx-body');
const txError = document.getElementById('tx-error');
const txMeta = document.getElementById('tx-meta');
const btnRefresh = document.getElementById('btn-refresh');
const btnSaldoStart = document.getElementById('btn-saldo-start');
const btnSaldoStop = document.getElementById('btn-saldo-stop');
const btnSwitcherStart = document.getElementById('btn-switcher-start');
const btnSwitcherStop = document.getElementById('btn-switcher-stop');
const fechaInicio = document.getElementById('fecha-inicio');
const fechaFin = document.getElementById('fecha-fin');
const pageInput = document.getElementById('page');
const limitInput = document.getElementById('limit');

fechaFin.value = new Date().toISOString().slice(0, 10);

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg =
      (data && (data.message || data.error)) ||
      (typeof data === 'string' ? data : res.statusText);
    throw new Error(Array.isArray(msg) ? msg.join(', ') : String(msg));
  }
  return data;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('es-MX');
}

function renderBots(bots) {
  botsPanel.innerHTML = bots
    .map(
      (bot) => `
    <article class="bot" data-id="${escapeHtml(bot.id)}">
      <div class="bot-head">
        <p class="bot-name">${escapeHtml(bot.name)}</p>
        <span class="badge ${bot.running ? 'on' : 'off'}">${
          bot.running ? 'ACTIVO' : 'DETENIDO'
        }</span>
      </div>
      <div class="bot-meta">
        <div>Enviadas: <strong data-field="sentCount">${bot.sentCount}</strong></div>
        <div>Última: <strong data-field="lastSentAt">${escapeHtml(
          bot.lastSentAt || '—',
        )}</strong></div>
        <div>Error: <strong data-field="lastError">${escapeHtml(
          bot.lastError || '—',
        )}</strong></div>
        <div class="payload">Payload: <pre data-field="lastPayload">${escapeHtml(
          bot.lastPayload ? JSON.stringify(bot.lastPayload, null, 2) : '—',
        )}</pre></div>
      </div>
      <div class="bot-actions">
        <label>
          Tx / min
          <input type="number" min="1" class="rate-input" value="${bot.ratePerMinute}" />
        </label>
        <button type="button" class="btn" data-action="rate">Aplicar rate</button>
        <button type="button" class="btn ok" data-action="start">Iniciar</button>
        <button type="button" class="btn stop" data-action="stop">Detener</button>
      </div>
    </article>`,
    )
    .join('');
}

function patchBots(bots) {
  for (const bot of bots) {
    const article = botsPanel.querySelector(`.bot[data-id="${bot.id}"]`);
    if (!article) {
      renderBots(bots);
      return;
    }

    const badge = article.querySelector('.badge');
    badge.className = `badge ${bot.running ? 'on' : 'off'}`;
    badge.textContent = bot.running ? 'ACTIVO' : 'DETENIDO';

    article.querySelector('[data-field="sentCount"]').textContent = String(
      bot.sentCount,
    );
    article.querySelector('[data-field="lastSentAt"]').textContent =
      bot.lastSentAt || '—';
    article.querySelector('[data-field="lastError"]').textContent =
      bot.lastError || '—';
    article.querySelector('[data-field="lastPayload"]').textContent =
      bot.lastPayload ? JSON.stringify(bot.lastPayload, null, 2) : '—';
  }
}

function renderSwitcher(item) {
  const executed = !!item.lastExecutedAt;
  const pulseClass =
    executed && !item.lastError
      ? 'pulse-ok'
      : item.lastError
        ? 'pulse-err'
        : '';
  switcherPanel.innerHTML = `
    <article class="bot saldo-card ${pulseClass}" data-id="switcher">
      <div class="bot-head">
        <p class="bot-name">${escapeHtml(item.activeLabel)}</p>
        <span class="badge ${item.running ? 'on' : 'off'}">${
          item.running ? 'ACTIVO' : 'DETENIDO'
        }</span>
      </div>
      <div class="saldo-indicator ${executed ? (item.lastError ? 'err' : 'ok') : ''}">
        ${
          executed
            ? item.lastError
              ? 'Último switch con error'
              : 'Se ejecutó switch de proveedores'
            : 'Esperando primer switch'
        }
      </div>
      <div class="bot-meta">
        <div>TAE activo: <strong data-field="taeActiveId">${escapeHtml(
          item.taeActiveId,
        )}</strong></div>
        <div>Servicios activo: <strong data-field="serviciosActiveId">${escapeHtml(
          item.serviciosActiveId,
        )}</strong></div>
        <div>Switches: <strong data-field="switchCount">${item.switchCount}</strong></div>
        <div>Ejecutado: <strong data-field="lastExecutedAt">${escapeHtml(
          formatDate(item.lastExecutedAt),
        )}</strong></div>
        <div>Próximo: <strong data-field="nextRunAt">${escapeHtml(
          formatDate(item.nextRunAt),
        )}</strong></div>
        <div>Error: <strong data-field="lastError">${escapeHtml(
          item.lastError || '—',
        )}</strong></div>
        <div class="payload">Últimos PUT: <pre data-field="lastPayloads">${escapeHtml(
          item.lastPayloads?.length
            ? JSON.stringify(item.lastPayloads, null, 2)
            : '—',
        )}</pre></div>
      </div>
    </article>`;
}

function patchSwitcher(item) {
  const article = switcherPanel.querySelector('.bot[data-id="switcher"]');
  if (!article) {
    renderSwitcher(item);
    return;
  }

  article.querySelector('.bot-name').textContent = item.activeLabel;
  const badge = article.querySelector('.badge');
  badge.className = `badge ${item.running ? 'on' : 'off'}`;
  badge.textContent = item.running ? 'ACTIVO' : 'DETENIDO';

  const executed = !!item.lastExecutedAt;
  const indicator = article.querySelector('.saldo-indicator');
  indicator.className = `saldo-indicator ${
    executed ? (item.lastError ? 'err' : 'ok') : ''
  }`;
  indicator.textContent = executed
    ? item.lastError
      ? 'Último switch con error'
      : 'Se ejecutó switch de proveedores'
    : 'Esperando primer switch';

  article.classList.remove('pulse-ok', 'pulse-err');
  if (executed && !item.lastError) article.classList.add('pulse-ok');
  if (item.lastError) article.classList.add('pulse-err');

  article.querySelector('[data-field="taeActiveId"]').textContent = String(
    item.taeActiveId,
  );
  article.querySelector('[data-field="serviciosActiveId"]').textContent =
    String(item.serviciosActiveId);
  article.querySelector('[data-field="switchCount"]').textContent = String(
    item.switchCount,
  );
  article.querySelector('[data-field="lastExecutedAt"]').textContent =
    formatDate(item.lastExecutedAt);
  article.querySelector('[data-field="nextRunAt"]').textContent = formatDate(
    item.nextRunAt,
  );
  article.querySelector('[data-field="lastError"]').textContent =
    item.lastError || '—';
  article.querySelector('[data-field="lastPayloads"]').textContent =
    item.lastPayloads?.length
      ? JSON.stringify(item.lastPayloads, null, 2)
      : '—';
}

function renderSaldos(items) {
  saldosPanel.innerHTML = items
    .map((item) => {
      const executed = !!item.lastExecutedAt;
      const ok = executed && !item.lastError;
      const pulseClass = ok ? 'pulse-ok' : item.lastError ? 'pulse-err' : '';
      return `
    <article class="bot saldo-card ${pulseClass}" data-id="${escapeHtml(item.id)}">
      <div class="bot-head">
        <p class="bot-name">${escapeHtml(item.name)} (idCliente ${item.idCliente})</p>
        <span class="badge ${item.running ? 'on' : 'off'}">${
          item.running ? 'ACTIVO' : 'DETENIDO'
        }</span>
      </div>
      <div class="saldo-indicator ${executed ? (item.lastError ? 'err' : 'ok') : ''}">
        ${
          executed
            ? item.lastError
              ? 'Última ejecución con error'
              : 'Se ejecutó asignación'
            : 'Aún sin ejecuciones'
        }
      </div>
      <div class="bot-meta">
        <div>Ejecuciones: <strong data-field="sentCount">${item.sentCount}</strong></div>
        <div>Último monto: <strong data-field="lastMonto">${escapeHtml(
          item.lastMonto != null ? item.lastMonto : '—',
        )}</strong></div>
        <div>Ejecutado: <strong data-field="lastExecutedAt">${escapeHtml(
          formatDate(item.lastExecutedAt),
        )}</strong></div>
        <div>Próxima: <strong data-field="nextRunAt">${escapeHtml(
          formatDate(item.nextRunAt),
        )}</strong></div>
        <div>Error: <strong data-field="lastError">${escapeHtml(
          item.lastError || '—',
        )}</strong></div>
        <div class="payload">Payload: <pre data-field="lastPayload">${escapeHtml(
          item.lastPayload ? JSON.stringify(item.lastPayload, null, 2) : '—',
        )}</pre></div>
      </div>
    </article>`;
    })
    .join('');
}

function patchSaldos(items) {
  for (const item of items) {
    const article = saldosPanel.querySelector(`.bot[data-id="${item.id}"]`);
    if (!article) {
      renderSaldos(items);
      return;
    }

    const badge = article.querySelector('.badge');
    badge.className = `badge ${item.running ? 'on' : 'off'}`;
    badge.textContent = item.running ? 'ACTIVO' : 'DETENIDO';

    const executed = !!item.lastExecutedAt;
    const indicator = article.querySelector('.saldo-indicator');
    indicator.className = `saldo-indicator ${
      executed ? (item.lastError ? 'err' : 'ok') : ''
    }`;
    indicator.textContent = executed
      ? item.lastError
        ? 'Última ejecución con error'
        : 'Se ejecutó asignación'
      : 'Aún sin ejecuciones';

    article.classList.remove('pulse-ok', 'pulse-err');
    if (executed && !item.lastError) article.classList.add('pulse-ok');
    if (item.lastError) article.classList.add('pulse-err');

    article.querySelector('[data-field="sentCount"]').textContent = String(
      item.sentCount,
    );
    article.querySelector('[data-field="lastMonto"]').textContent =
      item.lastMonto != null ? String(item.lastMonto) : '—';
    article.querySelector('[data-field="lastExecutedAt"]').textContent =
      formatDate(item.lastExecutedAt);
    article.querySelector('[data-field="nextRunAt"]').textContent = formatDate(
      item.nextRunAt,
    );
    article.querySelector('[data-field="lastError"]').textContent =
      item.lastError || '—';
    article.querySelector('[data-field="lastPayload"]').textContent =
      item.lastPayload ? JSON.stringify(item.lastPayload, null, 2) : '—';
  }
}

function normalizeRows(data) {
  if (Array.isArray(data)) return { rows: data, total: data.length };
  if (!data || typeof data !== 'object') return { rows: [], total: 0 };
  if (Array.isArray(data.data)) {
    return { rows: data.data, total: data.total ?? data.data.length };
  }
  if (Array.isArray(data.transacciones)) {
    return {
      rows: data.transacciones,
      total: data.total ?? data.transacciones.length,
    };
  }
  return { rows: [], total: 0 };
}

function resolveSku(row) {
  if (typeof row.sku === 'string' && row.sku) return row.sku;
  if (row.sku && typeof row.sku === 'object' && row.sku.sku) return row.sku.sku;
  if (row.payload && row.payload.sku) return row.payload.sku;
  if (row.respuestaSaleRequest && row.respuestaSaleRequest.sku) {
    return row.respuestaSaleRequest.sku;
  }
  return '—';
}

function resolveMonto(row) {
  if (row.unidadesTAE != null && row.unidadesTAE !== '') return row.unidadesTAE;
  if (row.sku && typeof row.sku === 'object' && row.sku.monto != null) {
    return row.sku.monto;
  }
  if (row.payload && row.payload.monto != null) return row.payload.monto;
  if (row.respuestaSaleRequest && row.respuestaSaleRequest.monto != null) {
    return row.respuestaSaleRequest.monto;
  }
  return '—';
}

function resolveMarca(row) {
  return (
    (row.sku &&
      row.sku.categoria &&
      row.sku.categoria.marca &&
      row.sku.categoria.marca.descripcion) ||
    '—'
  );
}

function renderTransactions(data) {
  const { rows, total } = normalizeRows(data);
  txMeta.hidden = false;
  txMeta.textContent = `Mostrando ${rows.length} de ${total} transacciones`;

  if (!rows.length) {
    txBody.innerHTML =
      '<tr><td colspan="10" class="muted">Sin transacciones en el rango.</td></tr>';
    return;
  }

  txBody.innerHTML = rows
    .map((row) => {
      const fecha = formatDate(row.fhRegistro);
      const caja = (row.caja && row.caja.nombre) || '—';
      const referencia = row.referencia || '—';
      const skuCode = resolveSku(row);
      const marca = resolveMarca(row);
      const monto = resolveMonto(row);
      const externalId =
        row.externalId || (row.payload && row.payload.idExterna) || '—';
      const trn =
        row.trn ||
        (row.respuestaSaleRequest && row.respuestaSaleRequest.trn) ||
        '—';
      const estatus = row.codigo || '—';
      const error = row.mensajeError || '—';
      const estatusClass =
        row.estatus === 1 || row.estatus === '1' ? 'ok-text' : 'err-text';

      return `<tr>
        <td>${escapeHtml(fecha)}</td>
        <td>${escapeHtml(caja)}</td>
        <td>${escapeHtml(referencia)}</td>
        <td>${escapeHtml(skuCode)}</td>
        <td>${escapeHtml(marca)}</td>
        <td>${escapeHtml(monto)}</td>
        <td>${escapeHtml(externalId)}</td>
        <td>${escapeHtml(trn)}</td>
        <td class="${estatusClass}">${escapeHtml(estatus)}</td>
        <td>${escapeHtml(error)}</td>
      </tr>`;
    })
    .join('');
}

async function loadBots({ patch = false } = {}) {
  const bots = await api('/api/bots');
  if (patch && botsPanel.children.length) {
    patchBots(bots);
  } else {
    renderBots(bots);
  }
}

async function loadSwitcher({ patch = false } = {}) {
  const item = await api('/api/switcher');
  if (patch && switcherPanel.children.length) {
    patchSwitcher(item);
  } else {
    renderSwitcher(item);
  }
}

async function loadSaldos({ patch = false } = {}) {
  const items = await api('/api/saldos');
  if (patch && saldosPanel.children.length) {
    patchSaldos(items);
  } else {
    renderSaldos(items);
  }
}

async function loadTransactions() {
  txError.hidden = true;
  try {
    const data = await api('/api/transacciones', {
      method: 'POST',
      body: JSON.stringify({
        fechaInicio: fechaInicio.value,
        fechaFin: fechaFin.value,
        page: Number(pageInput.value) || 1,
        limit: Number(limitInput.value) || 20,
      }),
    });
    renderTransactions(data);
  } catch (error) {
    txError.hidden = false;
    txError.textContent = error.message || String(error);
    txBody.innerHTML =
      '<tr><td colspan="10" class="muted">No se pudo cargar el listado.</td></tr>';
  }
}

botsPanel.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const article = button.closest('.bot');
  const id = article?.dataset.id;
  if (!id) return;

  const action = button.dataset.action;
  button.disabled = true;
  try {
    if (action === 'start') {
      await api(`/api/bots/${id}/start`, { method: 'POST' });
    } else if (action === 'stop') {
      await api(`/api/bots/${id}/stop`, { method: 'POST' });
    } else if (action === 'rate') {
      const rate = Number(article.querySelector('.rate-input').value);
      await api(`/api/bots/${id}/rate`, {
        method: 'PUT',
        body: JSON.stringify({ ratePerMinute: rate }),
      });
    }
    await loadBots({ patch: true });
  } catch (error) {
    alert(error.message || String(error));
  } finally {
    button.disabled = false;
  }
});

btnSwitcherStart.addEventListener('click', async () => {
  btnSwitcherStart.disabled = true;
  try {
    await api('/api/switcher/start', { method: 'POST' });
    await loadSwitcher({ patch: true });
  } catch (error) {
    alert(error.message || String(error));
  } finally {
    btnSwitcherStart.disabled = false;
  }
});

btnSwitcherStop.addEventListener('click', async () => {
  btnSwitcherStop.disabled = true;
  try {
    await api('/api/switcher/stop', { method: 'POST' });
    await loadSwitcher({ patch: true });
  } catch (error) {
    alert(error.message || String(error));
  } finally {
    btnSwitcherStop.disabled = false;
  }
});

btnSaldoStart.addEventListener('click', async () => {
  btnSaldoStart.disabled = true;
  try {
    await api('/api/saldos/start', { method: 'POST' });
    await loadSaldos({ patch: true });
  } catch (error) {
    alert(error.message || String(error));
  } finally {
    btnSaldoStart.disabled = false;
  }
});

btnSaldoStop.addEventListener('click', async () => {
  btnSaldoStop.disabled = true;
  try {
    await api('/api/saldos/stop', { method: 'POST' });
    await loadSaldos({ patch: true });
  } catch (error) {
    alert(error.message || String(error));
  } finally {
    btnSaldoStop.disabled = false;
  }
});

btnRefresh.addEventListener('click', async () => {
  btnRefresh.disabled = true;
  try {
    await loadTransactions();
  } finally {
    btnRefresh.disabled = false;
  }
});

void (async () => {
  await loadBots();
  await loadSwitcher();
  await loadSaldos();
  await loadTransactions();
  setInterval(() => {
    void loadSaldos({ patch: true });
    void loadSwitcher({ patch: true });
  }, 5000);
})();
