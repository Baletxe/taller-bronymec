#!/usr/bin/env python3
"""Taller de cada pieza: qué hay que escribir en el panel CAF con lo que decidió el taller en la app.

La app guarda en el repo privado Baletxe/taller-plan un tipos.json en claro:
  {"v":1, "tipo": {"caf|130000508383": {"t":"torno", "ts": 1760700000000}, ...}, "reglas": [{"w":"CASQUILLO","t":"torno"}, ...]}
El panel guarda lo mismo en su colección `taller` (un documento por pieza: id = emp + '.' + clave saneada,
{emp, key, t, ts, por, src, desc}) y las reglas en el documento `_reglas` {reglas:[...], ts}.

Uso: python3 -I sincronizar_talleres.py tipos.json DB_DIR/taller salida.json
  DB_DIR/taller: <id>.json de la colección taller del panel (ArtifactData list ... out_dir DB_DIR).
Salida: lista de escrituras pendientes para ArtifactData, en orden:
  [{"collection":"taller","doc_id":"caf.130000508383","existe":true,"data":{...}}, ...]
  - existe=false → ArtifactData set sin if_version.
  - existe=true  → ArtifactData get (para la version) y set con if_version = esa version.
Regla: gana la marca de tiempo (ts) más reciente; si el panel tiene un ts igual o mayor, no se toca.
Solo se escriben claves con forma emp|clave (emp = caf o talgo) y taller fresa / torno / secc (seccionadora) / sub / adit (aditiva).
"""
import sys, os, json, re

tipos_path, dbdir, out = sys.argv[1:4]
T = json.load(open(tipos_path, encoding='utf-8'))
assert isinstance(T, dict) and isinstance(T.get('tipo'), dict), 'tipos.json no tiene la forma esperada'
OK_T = {"fresa", "torno", "secc", "sub", "adit"}
safe = lambda s: re.sub(r'[^A-Za-z0-9_\-.~:@+]', '~', str(s))

panel = {}
if os.path.isdir(dbdir):
    for f in os.listdir(dbdir):
        if f.endswith('.json'):
            try:
                d = json.load(open(os.path.join(dbdir, f), encoding='utf-8'))
            except Exception:
                continue
            if isinstance(d, dict) and 'data' in d and isinstance(d['data'], dict):
                d = d['data']
            panel[f[:-5]] = d if isinstance(d, dict) else {}

writes = []
for k, v in T['tipo'].items():
    if not isinstance(k, str) or not isinstance(v, dict):
        continue
    m = re.fullmatch(r'(caf|talgo)\|([^|]{1,120})', k)
    if not m or v.get('t') not in OK_T:
        continue
    emp, key = m.group(1), m.group(2)
    try:
        ts = int(v.get('ts') or 0)
    except Exception:
        ts = 0
    doc_id = emp + '.' + safe(key)
    cur = panel.get(doc_id)
    if cur and cur.get('t') == v['t']:
        continue
    if cur:
        try:
            cts = int(cur.get('ts') or 0)
        except Exception:
            cts = 0
        if cts >= ts:
            continue
    writes.append({'collection': 'taller', 'doc_id': doc_id, 'existe': bool(cur),
                   'data': {'emp': emp, 'key': key, 't': v['t'], 'ts': ts, 'por': '', 'src': 'taller',
                            'desc': (cur or {}).get('desc', '')}})

reglas = [{'w': str(g['w'])[:40], 't': g['t']} for g in (T.get('reglas') or [])
          if isinstance(g, dict) and g.get('w') and g.get('t') in OK_T][:200]
cur = panel.get('_reglas') or {}
if (cur.get('reglas') or []) != reglas:
    writes.append({'collection': 'taller', 'doc_id': '_reglas', 'existe': bool(cur),
                   'data': {'reglas': reglas, 'src': 'taller'}})

json.dump(writes, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps({'en_tipos': len(T['tipo']), 'en_panel': len([k for k in panel if k != '_reglas']),
                  'escrituras': len(writes), 'reglas': len(reglas)}))
