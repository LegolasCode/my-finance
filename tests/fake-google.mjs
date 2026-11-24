// Google Sheets + Drive tiruan (in-memory), per akun (token). Meniru routing nyata secara ketat.
const colIdx = (s) => [...s].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
const idxCol = (i) => { let s = ''; for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };

function parseRange(a1) {
  const m = /^([^!]+)!([A-Z]+)(\d*)(?::([A-Z]+)(\d*))?$/.exec(a1);
  if (!m) throw new Error(`range tidak valid: ${a1}`);
  const [, tab, c0, r0, c1, r1] = m;
  return { tab, c0: colIdx(c0), c1: c1 ? colIdx(c1) : colIdx(c0), r0: r0 ? Number(r0) : 1, r1: r1 ? Number(r1) : (r0 && !c1 ? Number(r0) : Infinity) };
}
const empty = (v) => v === undefined || v === '';

export function createFakeGoogle() {
  const state = {
    tokens: { 'tok-A': 'A', 'tok-B': 'B' }, // token -> akun
    drives: { A: new Map(), B: new Map() },
    log: [], failNext: [], dropResponseAfter: null, calls: 0, seq: 0,
  };
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const err = (status, message) => json({ error: { code: status, message } }, status);

  const lastRow = (sh) => { for (let i = sh.rows.length - 1; i >= 0; i--) if ((sh.rows[i] || []).some((v) => !empty(v))) return i + 1; return 0; };
  const getValues = (sh, rg) => {
    const end = Math.min(rg.r1, lastRow(sh));
    const out = [];
    for (let r = rg.r0; r <= end; r++) {
      const row = [];
      for (let c = rg.c0; c <= rg.c1; c++) row.push((sh.rows[r - 1] || [])[c]);
      while (row.length && empty(row[row.length - 1])) row.pop();
      out.push(row);
    }
    while (out.length && out[out.length - 1].length === 0) out.pop();
    return out.length ? out : undefined;
  };
  const writeValues = (sh, r0, c0, values, input) => {
    values.forEach((row, i) => row.forEach((v, j) => {
      (sh.rows[r0 - 1 + i] ||= [])[c0 + j] = v;
      if (input === 'USER_ENTERED') (sh.entered ||= new Set()).add(`${r0 + i},${c0 + j}`);
    }));
  };
  const sheetOf = (file, tab) => file.sheets.find((s) => s.title === tab);

  async function handler(url, opts = {}) {
    const u = new URL(url);
    const method = opts.method || 'GET';
    const body = opts.body ? JSON.parse(opts.body) : undefined;
    state.calls += 1;
    state.log.push({ method, path: u.pathname + u.search, body });

    const auth = /^Bearer (.+)$/.exec(opts.headers?.Authorization || '');
    const account = auth && state.tokens[auth[1]];
    if (!account) return err(401, 'Invalid Credentials');

    const fi = state.failNext.findIndex((f) => f.match.test(`${method} ${u.pathname}`));
    if (fi >= 0) { const [f] = state.failNext.splice(fi, 1); return err(f.status, 'boom'); }

    const drive = state.drives[account];
    const result = route(u, method, body, drive, account);
    if (state.dropResponseAfter && state.dropResponseAfter.test(`${method} ${u.pathname}`)) {
      state.dropResponseAfter = null;
      throw new TypeError('network down');
    }
    return result;
  }

  function route(u, method, body, drive) {
    const p = u.pathname;
    if (p === '/drive/v3/files' && method === 'GET') {
      const q = u.searchParams.get('q') || '';
      const m = /appProperties has \{ key='([^']+)' and value='([^']+)' \}/.exec(q);
      let files = [...drive.values()].filter((f) => !f.trashed && (!m || f.appProperties?.[m[1]] === m[2]));
      files = files.sort((a, b) => a.createdTime.localeCompare(b.createdTime));
      return json({ files: files.map((f) => ({ id: f.id, name: f.name, createdTime: f.createdTime })) });
    }
    if (p === '/drive/v3/files' && method === 'POST') {
      const id = `sheet_${++state.seq}_${Math.random().toString(36).slice(2, 8)}`;
      state.drives; // eslint-disable-line no-unused-expressions
      const f = { id, name: body.name, trashed: false, appProperties: body.appProperties, createdTime: new Date(1700000000000 + state.seq * 1000).toISOString(), locale: 'id_ID', sheets: [{ sheetId: 0, title: 'Sheet1', rows: [] }], nextSheetId: 1 };
      drive.set(id, f);
      return json({ id });
    }
    let m = /^\/drive\/v3\/files\/([^/]+)$/.exec(p);
    if (m && method === 'GET') {
      const f = drive.get(m[1]);
      return f ? json({ id: f.id, trashed: f.trashed }) : err(404, 'File not found');
    }

    m = /^\/v4\/spreadsheets\/([^/:]+)(.*)$/.exec(p);
    if (!m) return err(404, `route tidak dikenal: ${p}`);
    const file = drive.get(m[1]);
    if (!file) return err(404, 'Requested entity was not found.');
    const rest = m[2];

    if (rest === '' && method === 'GET') {
      return json({ properties: { title: file.name, locale: file.locale }, spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${file.id}/edit`, sheets: file.sheets.map((s) => ({ properties: { sheetId: s.sheetId, title: s.title } })) });
    }
    if (rest === ':batchUpdate' && method === 'POST') {
      const replies = [];
      for (const r of body.requests) {
        if (r.addSheet) {
          if (sheetOf(file, r.addSheet.properties.title)) return err(400, 'sheet sudah ada');
          const s = { sheetId: file.nextSheetId++, title: r.addSheet.properties.title, rows: [] };
          file.sheets.push(s);
          replies.push({ addSheet: { properties: { sheetId: s.sheetId, title: s.title } } });
        } else if (r.updateSheetProperties?.properties?.title) {
          const s = file.sheets.find((x) => x.sheetId === r.updateSheetProperties.properties.sheetId);
          if (!s) return err(400, 'sheetId tidak ada');
          s.title = r.updateSheetProperties.properties.title; replies.push({});
        } else if (r.updateSpreadsheetProperties) {
          file.locale = r.updateSpreadsheetProperties.properties.locale; replies.push({});
        } else if (r.deleteDimension) {
          const { sheetId, dimension, startIndex, endIndex } = r.deleteDimension.range;
          const s = file.sheets.find((x) => x.sheetId === sheetId);
          if (!s || dimension !== 'ROWS') return err(400, 'deleteDimension tidak valid');
          s.rows.splice(startIndex, endIndex - startIndex); replies.push({});
        } else {
          (file.formatting ||= []).push(Object.keys(r)[0]); replies.push({});
        }
      }
      return json({ spreadsheetId: file.id, replies });
    }
    if (rest === '/values:batchGet' && method === 'GET') {
      const ranges = u.searchParams.getAll('ranges');
      return json({ valueRanges: ranges.map((a1) => { const rg = parseRange(a1); const sh = sheetOf(file, rg.tab); if (!sh) throw new Error(`tab ${rg.tab} tidak ada`); return { range: a1, values: getValues(sh, rg) }; }) });
    }
    if (rest === '/values:batchUpdate' && method === 'POST') {
      for (const d of body.data) { const rg = parseRange(d.range); writeValues(sheetOf(file, rg.tab), rg.r0, rg.c0, d.values, body.valueInputOption); }
      return json({ totalUpdatedRows: body.data.length });
    }
    // /values/{range} , /values/{range}:append  — verb harus literal, bukan %3A
    const vm = /^\/values\/(.+)$/.exec(rest);
    if (vm) {
      let rawRange = vm[1];
      let append = false;
      if (rawRange.endsWith(':append')) { append = true; rawRange = rawRange.slice(0, -':append'.length); }
      if (/%3Aappend$/i.test(vm[1])) return err(404, 'verb :append ter-encode');
      const rg = parseRange(decodeURIComponent(rawRange));
      const sh = sheetOf(file, rg.tab);
      if (!sh) return err(400, `Unable to parse range: ${rg.tab}`);
      const input = u.searchParams.get('valueInputOption');
      if (append && method === 'POST') {
        if (!input) return err(400, 'valueInputOption wajib');
        const first = lastRow(sh) + 1;
        writeValues(sh, first, rg.c0, body.values, input);
        const width = Math.max(...body.values.map((r) => r.length));
        return json({ updates: { updatedRange: `${rg.tab}!${idxCol(rg.c0)}${first}:${idxCol(rg.c0 + width - 1)}${first + body.values.length - 1}`, updatedRows: body.values.length } });
      }
      if (method === 'PUT') {
        if (!input) return err(400, 'valueInputOption wajib');
        writeValues(sh, rg.r0, rg.c0, body.values, input);
        return json({ updatedRange: decodeURIComponent(rawRange) });
      }
      if (method === 'GET') return json({ range: decodeURIComponent(rawRange), values: getValues(sh, rg) });
    }
    return err(404, `route tidak dikenal: ${method} ${p}`);
  }

  const fetchImpl = async (url, opts) => handler(url, opts);
  return { state, fetch: fetchImpl, file: (account, id) => state.drives[account].get(id), files: (account) => [...state.drives[account].values()] };
}
