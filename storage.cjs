'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value, max, required = true) => typeof value === 'string' && value.length <= max && (!required || (value.length > 0 && value === value.trim()));
const iso = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const date = value => { if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const [year, month, day] = value.split('-').map(Number), parsed = new Date(Date.UTC(year, month - 1, day)); return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day; };
const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
class ValidationError extends Error {}

function createSeed() {
  const profileId = '11000000-0000-4000-8000-000000000001';
  const o = [1, 2, 3].map(n => `22000000-0000-4000-8000-${String(n).padStart(12, '0')}`);
  const c = [1, 2].map(n => `33000000-0000-4000-8000-${String(n).padStart(12, '0')}`);
  const e = [1, 2, 3].map(n => `44000000-0000-4000-8000-${String(n).padStart(12, '0')}`);
  return {
    version: 1,
    perfiles: [{ id: profileId, nombre: 'Búsqueda equilibrada', objetivoHoraCent: 1200, maxMinutosEfectivosSemana: 2700, maxDesplazamientoDia: 60, pesos: { economia: 35, tiempo: 25, estabilidad: 15, flexibilidad: 10, accesibilidad: 15 }, createdAt: '2026-09-18T09:00:00.000Z', updatedAt: '2026-09-18T09:00:00.000Z' }],
    ofertas: [
      { id: o[0], perfilId: profileId, empresa: 'Nexo Cercano', puesto: 'Soporte híbrido', ubicacion: 'Madrid', modalidad: 'hibrida', tipoRemuneracion: 'anual', importeCent: 2400000, pagasAnuales: 12, minutosPagadosSemana: 2400, minutosNoRemuneradosSemana: 150, diasPresenciales: 3, minutosDesplazamientoDia: 50, costeDesplazamientoDiaCent: 450, costesFijosMensualesCent: 0, estabilidad: 4, flexibilidad: 4, accesibilidad: 4, fechaLimite: '2026-10-05', estado: 'activa', notas: 'Equipo estable y dos días remotos.', createdAt: '2026-09-18T09:30:00.000Z', updatedAt: '2026-09-18T09:30:00.000Z' },
      { id: o[1], perfilId: profileId, empresa: 'Atiende Barrio', puesto: 'Atención presencial', ubicacion: 'Getafe', modalidad: 'presencial', tipoRemuneracion: 'anual', importeCent: 2700000, pagasAnuales: 14, minutosPagadosSemana: 2400, minutosNoRemuneradosSemana: 300, diasPresenciales: 5, minutosDesplazamientoDia: 95, costeDesplazamientoDiaCent: 650, costesFijosMensualesCent: 3500, estabilidad: 5, flexibilidad: 1, accesibilidad: 3, fechaLimite: '2026-09-30', estado: 'activa', notas: 'Contrato estable, desplazamiento largo.', createdAt: '2026-09-18T10:00:00.000Z', updatedAt: '2026-09-18T10:00:00.000Z' },
      { id: o[2], perfilId: profileId, empresa: 'Lumen Social', puesto: 'Diseño remoto parcial', ubicacion: 'Remoto', modalidad: 'remota', tipoRemuneracion: 'hora', importeCent: 1400, pagasAnuales: 12, minutosPagadosSemana: 1200, minutosNoRemuneradosSemana: 240, diasPresenciales: 0, minutosDesplazamientoDia: 0, costeDesplazamientoDiaCent: 0, costesFijosMensualesCent: 12000, estabilidad: 2, flexibilidad: 5, accesibilidad: 5, fechaLimite: null, estado: 'activa', notas: 'Proyecto parcial con horario flexible.', createdAt: '2026-09-18T10:30:00.000Z', updatedAt: '2026-09-18T10:30:00.000Z' }
    ],
    candidaturas: [
      { id: c[0], ofertaId: o[0], estado: 'enviada', proximaAccion: 'Revisar respuesta', proximaAccionFecha: '2026-09-25', createdAt: '2026-09-19T09:00:00.000Z', updatedAt: '2026-09-20T09:00:00.000Z' },
      { id: c[1], ofertaId: o[2], estado: 'entrevista', proximaAccion: 'Preparar portfolio', proximaAccionFecha: '2026-09-24', createdAt: '2026-09-19T10:00:00.000Z', updatedAt: '2026-09-22T10:00:00.000Z' }
    ],
    eventos: [
      { id: e[0], candidaturaId: c[0], tipo: 'envio', fecha: '2026-09-20', nota: 'Candidatura enviada desde el portal.', createdAt: '2026-09-20T09:00:00.000Z' },
      { id: e[1], candidaturaId: c[1], tipo: 'envio', fecha: '2026-09-19', nota: 'Portfolio y carta enviados.', createdAt: '2026-09-19T10:00:00.000Z' },
      { id: e[2], candidaturaId: c[1], tipo: 'entrevista', fecha: '2026-09-22', nota: 'Primera conversación con el equipo.', createdAt: '2026-09-22T10:00:00.000Z' }
    ],
    historial: [{ id: '55000000-0000-4000-8000-000000000001', entidad: 'sistema', entidadId: profileId, accion: 'seed_creado', detalle: 'Escenario inicial de comparación creado.', at: '2026-09-18T09:00:00.000Z' }]
  };
}

function unique(items) { const ids = new Set(); for (const item of items) { if (!plain(item) || !UUID.test(item.id) || ids.has(item.id)) return null; ids.add(item.id); } return ids; }
function validProfile(p) { const weights = p.pesos; return text(p.nombre, 80) && integer(p.objetivoHoraCent, 1, 1000000) && integer(p.maxMinutosEfectivosSemana, 1, 10080) && integer(p.maxDesplazamientoDia, 0, 1440) && plain(weights) && ['economia', 'tiempo', 'estabilidad', 'flexibilidad', 'accesibilidad'].every(k => integer(weights[k], 0, 100)) && Object.keys(weights).length === 5 && Object.values(weights).reduce((a, b) => a + b, 0) === 100 && iso(p.createdAt) && iso(p.updatedAt); }
function validState(s) {
  if (!plain(s) || s.version !== 1 || !Array.isArray(s.perfiles) || !Array.isArray(s.ofertas) || !Array.isArray(s.candidaturas) || !Array.isArray(s.eventos) || !Array.isArray(s.historial)) return false;
  const pids = unique(s.perfiles), oids = unique(s.ofertas), cids = unique(s.candidaturas), eids = unique(s.eventos), hids = unique(s.historial); if (!pids || !oids || !cids || !eids || !hids) return false;
  for (const p of s.perfiles) if (!validProfile(p)) return false;
  for (const o of s.ofertas) if (!pids.has(o.perfilId) || !text(o.empresa, 100) || !text(o.puesto, 100) || !text(o.ubicacion, 100) || !['presencial', 'hibrida', 'remota'].includes(o.modalidad) || !['anual', 'mensual', 'hora'].includes(o.tipoRemuneracion) || !integer(o.importeCent, 0, 1000000000) || !integer(o.pagasAnuales, 1, 24) || !integer(o.minutosPagadosSemana, 1, 10080) || !integer(o.minutosNoRemuneradosSemana, 0, 10080) || !integer(o.diasPresenciales, 0, 7) || !integer(o.minutosDesplazamientoDia, 0, 1440) || !integer(o.costeDesplazamientoDiaCent, 0, 10000000) || !integer(o.costesFijosMensualesCent, 0, 100000000) || !['estabilidad', 'flexibilidad', 'accesibilidad'].every(k => integer(o[k], 0, 5)) || (o.fechaLimite !== null && !date(o.fechaLimite)) || !['activa', 'archivada'].includes(o.estado) || !text(o.notas || '', 1000, false) || !iso(o.createdAt) || !iso(o.updatedAt)) return false;
  for (const c of s.candidaturas) if (!oids.has(c.ofertaId) || !['borrador', 'enviada', 'entrevista', 'oferta_recibida', 'aceptada', 'rechazada', 'retirada'].includes(c.estado) || !text(c.proximaAccion || '', 200, false) || (c.proximaAccionFecha !== null && !date(c.proximaAccionFecha)) || !iso(c.createdAt) || !iso(c.updatedAt)) return false;
  for (const e of s.eventos) if (!cids.has(e.candidaturaId) || !['envio', 'contacto', 'entrevista', 'prueba', 'oferta', 'nota', 'otro'].includes(e.tipo) || !date(e.fecha) || !text(e.nota, 500) || !iso(e.createdAt)) return false;
  for (const h of s.historial) if (!text(h.entidad, 30) || !UUID.test(h.entidadId) || !text(h.accion, 50) || !text(h.detalle || '', 300, false) || !iso(h.at)) return false;
  return true;
}
function atomicWrite(file, state) { const temp = `${file}.${randomUUID()}.tmp`; let fd; try { fd = fs.openSync(temp, 'wx', 0o600); fs.writeFileSync(fd, `${JSON.stringify(state, null, 2)}\n`, 'utf8'); fs.fsyncSync(fd); fs.closeSync(fd); fd = undefined; fs.renameSync(temp, file); try { const dirFd = fs.openSync(path.dirname(file), 'r'); fs.fsyncSync(dirFd); fs.closeSync(dirFd); } catch { /* Windows puede impedir fsync de carpeta. */ } } finally { if (fd !== undefined) fs.closeSync(fd); if (fs.existsSync(temp)) fs.unlinkSync(temp); } }
function readValid(file) { if (!fs.existsSync(file)) return { missing: true }; try { const state = JSON.parse(fs.readFileSync(file, 'utf8')); return validState(state) ? { state } : { invalid: true }; } catch (error) { if (error instanceof SyntaxError) return { invalid: true }; throw error; } }
function createStore(dataDir, { seed = createSeed() } = {}) {
  fs.mkdirSync(dataDir, { recursive: true }); const file = path.join(dataDir, 'ofertajusta.json'), backup = path.join(dataDir, 'ofertajusta.backup.json'); const primary = readValid(file); let state, recovered = false;
  if (primary.state) state = primary.state; else { const previous = readValid(backup); if (previous.state) { if (!primary.missing) fs.copyFileSync(file, `${file}.corrupt-${Date.now()}`); atomicWrite(file, previous.state); state = previous.state; recovered = true; } else if (primary.missing && previous.missing && validState(seed)) { state = structuredClone(seed); atomicWrite(backup, state); atomicWrite(file, state); } else throw new Error('Datos ilegibles: principal y respaldo se conservan para revisión manual.'); }
  return { recovered, paths: { file, backup }, read: () => structuredClone(state), update(mutator) { const next = structuredClone(state), result = mutator(next); if (!validState(next)) throw new Error('La actualización produciría datos no válidos.'); atomicWrite(backup, state); atomicWrite(file, next); state = next; return structuredClone(result); } };
}
module.exports = { createStore, createSeed, validState, atomicWrite, ValidationError };
