const vendorEl = document.getElementById('vendor');
const ddlEl = document.getElementById('ddl');
const confirmBtn = document.getElementById('confirm');
const errorBox = document.getElementById('ddl-error');
const schemaGrid = document.getElementById('schema-grid');

const parser = new Parser();

const VENDOR_MAP = {
  oracle: 'Oracle',
  postgres: 'PostgresQL',
  mysql: 'MySQL',
  mariadb: 'MariaDB',
};

let parsedSchema = null;

ddlEl.addEventListener('input', () => {
  confirmBtn.hidden = ddlEl.value.trim() === '';
  errorBox.hidden = true;
  errorBox.textContent = '';
  schemaGrid.hidden = true;
  schemaGrid.innerHTML = '';
});

confirmBtn.addEventListener('click', () => {
  errorBox.hidden = true;
  errorBox.textContent = '';
  try {
    parsedSchema = parseDDL(vendorEl.value, ddlEl.value);
    renderGrid(parsedSchema);
    document.getElementById('create-data').hidden = false;
  } catch (e) {
    errorBox.textContent = e.message;
    errorBox.hidden = false;
  }
});

function parseDDL(vendor, ddl) {
  const opt = { database: VENDOR_MAP[vendor] };
  const result = parser.astify(ddl.trim(), opt);
  const stmt = Array.isArray(result) ? result[0] : result;
  console.log(stmt)

  if (!stmt || stmt.type !== 'create' || stmt.keyword !== 'table') {
    throw new Error('No valid CREATE TABLE statement found.');
  }

  const tableName = stmt.table[0].table;

  const columns = (stmt.create_definitions || [])
    .filter(d => d.resource === 'column')
    .map(d => {
      const def = d.definition;
      let type = def.dataType;

      if (def.length != null) {
        type += `(${def.length}`;

        if (def.scale != null) type += `, ${def.scale}`;
        type += ')';
      }

      const notNull = !!(d.nullable && d.nullable.type === 'not null');
      const unique = !!(d.unique || d.unique_or_primary === 'unique');

      console.log(d.column.column.expr.value)

      return { name: d.column.column.expr.value, type, nullable: !notNull, unique };
    });

  if (columns.length === 0) throw new Error('No column definitions found.');
  return { tableName, columns };
}

function renderGrid(schema) {
  schemaGrid.innerHTML = '';

  const heading = document.createElement('h2');
  heading.className = 'grid-heading';
  heading.textContent = schema.tableName;
  schemaGrid.appendChild(heading);

  const table = document.createElement('table');
  table.className = 'schema-table';

  const thead = table.createTHead();
  const hr = thead.insertRow();
  ['Column', 'Type', 'Unique', 'Not Null', '', '', ''].forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    hr.appendChild(th);
  });

  const tbody = table.createTBody();
  for (const col of schema.columns) {
    const tr = tbody.insertRow();

    const tdName = tr.insertCell();
    tdName.textContent = col.name;

    const tdType = tr.insertCell();
    const code = document.createElement('code');
    code.textContent = col.type;
    tdType.appendChild(code);

    [col.unique, !col.nullable].forEach(checked => {
      const td = tr.insertCell();
      td.className = 'cell-check';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = checked;
      cb.disabled = true;
      td.appendChild(cb);
    });

    for (let i = 0; i < 3; i++) tr.insertCell();
  }

  schemaGrid.appendChild(table);
  schemaGrid.hidden = false;
}
