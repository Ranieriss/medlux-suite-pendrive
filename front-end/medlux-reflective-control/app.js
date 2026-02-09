import { openDB, ensureAdminUser, readAll } from '../shared/db.js';
import { clearSession, requireAuth } from '../shared/session.js';

const session = requireAuth('../index.html');

const sessionInfo = document.getElementById('sessionInfo');
const btnLogout = document.getElementById('btnLogout');
const measurementForm = document.getElementById('measurementForm');
const measurementsList = document.getElementById('measurementsList');
const toast = document.getElementById('toast');

let db;
let visibleEquipamentos = [];

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function requestAsPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function renderEquipmentOptions() {
  const select = measurementForm.equip_id;
  select.textContent = '';
  if (!visibleEquipamentos.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Nenhum equipamento disponível';
    select.appendChild(option);
    select.disabled = true;
    return;
  }

  select.disabled = false;
  visibleEquipamentos.forEach((equip) => {
    const option = document.createElement('option');
    option.value = equip.id;
    option.textContent = `${equip.id} • ${equip.modelo || 'Sem modelo'}`;
    select.appendChild(option);
  });
}

async function loadVisibleEquipamentos() {
  if (session.role === 'admin') {
    const tx = db.transaction('equipamentos', 'readonly');
    const store = tx.objectStore('equipamentos');
    visibleEquipamentos = await readAll(store);
    visibleEquipamentos.sort((a, b) => a.id.localeCompare(b.id));
    return;
  }

  const vinculoTx = db.transaction('vinculos', 'readonly');
  const vinculoStore = vinculoTx.objectStore('vinculos');
  const index = vinculoStore.index('user_id');
  const vinculos = await requestAsPromise(index.getAll(session.user_id));
  const ativos = vinculos.filter((vinculo) => vinculo.ativo);
  const equipTx = db.transaction('equipamentos', 'readonly');
  const equipStore = equipTx.objectStore('equipamentos');
  const equipamentos = await readAll(equipStore);
  const equipMap = new Map(equipamentos.map((equip) => [equip.id, equip]));

  visibleEquipamentos = ativos
    .map((vinculo) => equipMap.get(vinculo.equip_id))
    .filter(Boolean)
    .sort((a, b) => a.id.localeCompare(b.id));
}

async function loadMeasurements() {
  const tx = db.transaction('medicoes', 'readonly');
  const store = tx.objectStore('medicoes');
  const all = await readAll(store);

  const filtered = session.role === 'admin'
    ? all
    : all.filter((item) => item.user_id === session.user_id);

  filtered.sort((a, b) => b.data_hora.localeCompare(a.data_hora));
  const recent = filtered.slice(0, 10);

  measurementsList.textContent = '';
  if (!recent.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'Nenhuma medição registrada.';
    measurementsList.appendChild(empty);
    return;
  }

  recent.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'list-item';

    const title = document.createElement('strong');
    title.textContent = `${item.equip_id} • ${item.tipo_medicao}`;

    const meta = document.createElement('div');
    meta.className = 'muted';
    meta.textContent = `${item.user_id} • ${item.data_hora}`;

    const details = document.createElement('div');
    details.textContent = `Local: ${item.payload?.local || '—'} • Observação: ${item.payload?.observacao || '—'}`;

    card.append(title, meta, details);
    measurementsList.appendChild(card);
  });
}

async function saveMeasurement(event) {
  event.preventDefault();
  if (!visibleEquipamentos.length) {
    showToast('Nenhum equipamento disponível.');
    return;
  }

  const equipId = measurementForm.equip_id.value;
  const tipo = measurementForm.tipo_medicao.value;
  const local = measurementForm.local.value.trim();
  const observacao = measurementForm.observacao.value.trim();
  const rl = measurementForm.rl.value.trim();

  if (!equipId || !local) {
    showToast('Informe equipamento e local.');
    return;
  }

  const now = new Date().toISOString();

  const tx = db.transaction('medicoes', 'readwrite');
  const store = tx.objectStore('medicoes');
  store.add({
    user_id: session.user_id,
    equip_id: equipId,
    data_hora: now,
    tipo_medicao: tipo,
    payload: {
      local,
      observacao,
      rl,
    },
    aprovado: null,
    created_at: now,
  });

  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  showToast('Medição salva.');
  measurementForm.reset();
  await loadMeasurements();
}

btnLogout.addEventListener('click', () => {
  clearSession();
  window.location.href = '../index.html';
});

measurementForm.addEventListener('submit', saveMeasurement);

async function init() {
  db = await openDB();
  await ensureAdminUser(db);
  sessionInfo.textContent = `Usuário: ${session.user_id} • Perfil: ${session.role === 'admin' ? 'Admin' : 'Operador'}`;
  await loadVisibleEquipamentos();
  renderEquipmentOptions();
  await loadMeasurements();
}

init();
