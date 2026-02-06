const DEFAULT_CRITERIA = [
  {
    id: 'horizontal-white',
    norm: 'NBR 14723',
    type: 'Horizontal',
    color: 'Branco',
    min: 250,
  },
  {
    id: 'horizontal-yellow',
    norm: 'NBR 14723',
    type: 'Horizontal',
    color: 'Amarelo',
    min: 200,
  },
  {
    id: 'vertical-white',
    norm: 'NBR 14644',
    type: 'Vertical',
    color: 'Branco',
    min: 100,
  },
  {
    id: 'tachas-white',
    norm: 'NBR 14636',
    type: 'Tachas',
    color: 'Branco',
    min: 80,
  },
];

const normalizeCriteria = (criteria) => criteria.map((item, index) => ({
  id: item.id || `${item.type}-${item.color}-${index}`,
  norm: item.norm || '',
  type: item.type || '',
  color: item.color || '',
  min: Number(item.min) || 0,
}));

const ensureDefaultCriteria = async () => {
  const existing = await getAllCriteria();
  if (existing.length) {
    return normalizeCriteria(existing);
  }
  await saveCriteria(DEFAULT_CRITERIA);
  return DEFAULT_CRITERIA;
};

const renderCriteria = (criteria) => {
  const root = document.getElementById('criteriaRoot');
  if (!root) return;

  root.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'criteria-list';

  criteria.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'criteria-row';

    row.innerHTML = `
      <label>
        Norma
        <input type="text" value="${item.norm}" data-field="norm" />
      </label>
      <label>
        Tipo
        <input type="text" value="${item.type}" data-field="type" />
      </label>
      <label>
        Cor
        <input type="text" value="${item.color}" data-field="color" />
      </label>
      <label>
        Mínimo
        <input type="number" value="${item.min}" data-field="min" />
      </label>
    `;

    row.dataset.id = item.id;
    list.appendChild(row);
  });

  const actions = document.createElement('div');
  actions.className = 'criteria-actions';
  actions.innerHTML = `
    <button class="btn" id="btnAddCriteria">Adicionar</button>
    <button class="btn" id="btnSaveCriteria">Salvar</button>
  `;

  root.appendChild(list);
  root.appendChild(actions);

  const addButton = document.getElementById('btnAddCriteria');
  const saveButton = document.getElementById('btnSaveCriteria');

  addButton.addEventListener('click', () => {
    const newItem = {
      id: `criteria-${Date.now()}`,
      norm: '',
      type: '',
      color: '',
      min: 0,
    };
    renderCriteria([...criteria, newItem]);
  });

  saveButton.addEventListener('click', async () => {
    const rows = Array.from(list.querySelectorAll('.criteria-row'));
    const updated = rows.map((row) => {
      const data = {
        id: row.dataset.id,
      };
      row.querySelectorAll('input').forEach((input) => {
        data[input.dataset.field] = input.type === 'number'
          ? Number(input.value)
          : input.value.trim();
      });
      return data;
    });
    await saveCriteria(normalizeCriteria(updated));
    renderCriteria(updated);
  });
};

const initCriteria = async () => {
  const criteria = await ensureDefaultCriteria();
  renderCriteria(criteria);
};

document.addEventListener('DOMContentLoaded', () => {
  const criteriaView = document.getElementById('criteriaView');
  if (criteriaView) {
    initCriteria();
  }
});

window.initCriteria = initCriteria;
