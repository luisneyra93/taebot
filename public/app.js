const botsPanel = document.getElementById('bots-panel');
const txBody = document.getElementById('tx-body');
const txError = document.getElementById('tx-error');
const txMeta = document.getElementById('tx-meta');
const btnRefresh = document.getElementById('btn-refresh');
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

function estatusLabel(estatus) {
  if (estatus === 1 || estatus === '1') return 'Exitosa';
  if (estatus === 0 || estatus === '0') return 'Fallida';
  if (estatus == null || estatus === '') return '—';
  return String(estatus);
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

/** Actualiza estado visual sin destruir el input de rate (no resetea tx/min). */
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
        row.externalId ||
        (row.payload && row.payload.idExterna) ||
        '—';
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
  await loadTransactions();
})();
