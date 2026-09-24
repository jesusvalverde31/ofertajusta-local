'use strict';
(function expose(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OfertaEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function build() {
  const DAY = 86_400_000;
  const TERMINAL = new Set(['aceptada', 'rechazada', 'retirada']);
  const TRANSITIONS = {
    borrador: new Set(['enviada', 'retirada']),
    enviada: new Set(['entrevista', 'rechazada', 'retirada']),
    entrevista: new Set(['entrevista', 'oferta_recibida', 'rechazada', 'retirada']),
    oferta_recibida: new Set(['aceptada', 'rechazada', 'retirada']),
    aceptada: new Set(), rechazada: new Set(), retirada: new Set()
  };
  const roundHalfUp = value => Math.floor(Number(value) + 0.5);
  const clamp = value => Math.max(0, Math.min(100, value));

  function calculateOffer(profile, offer) {
    let monthlyGrossCent = 0;
    if (offer.tipoRemuneracion === 'anual') monthlyGrossCent = roundHalfUp(offer.importeCent / 12);
    if (offer.tipoRemuneracion === 'mensual') monthlyGrossCent = roundHalfUp(offer.importeCent * offer.pagasAnuales / 12);
    if (offer.tipoRemuneracion === 'hora') monthlyGrossCent = roundHalfUp(offer.importeCent * offer.minutosPagadosSemana * 52 / (60 * 12));
    const variableCostCent = roundHalfUp(offer.costeDesplazamientoDiaCent * offer.diasPresenciales * 52 / 12);
    const totalCostCent = variableCostCent + offer.costesFijosMensualesCent;
    const availableCent = monthlyGrossCent - totalCostCent;
    const effectiveMinutesWeek = offer.minutosPagadosSemana + offer.minutosNoRemuneradosSemana + offer.diasPresenciales * offer.minutosDesplazamientoDia;
    const effectiveHourValueCent = availableCent <= 0 || effectiveMinutesWeek <= 0 ? 0 : roundHalfUp(availableCent * 60 * 12 / (effectiveMinutesWeek * 52));
    const dimensions = {
      economia: clamp(profile.objetivoHoraCent > 0 ? effectiveHourValueCent / profile.objetivoHoraCent * 100 : 0),
      tiempo: clamp(effectiveMinutesWeek <= profile.maxMinutosEfectivosSemana ? 100 : profile.maxMinutosEfectivosSemana / effectiveMinutesWeek * 100),
      estabilidad: offer.estabilidad * 20,
      flexibilidad: offer.flexibilidad * 20,
      accesibilidad: offer.accesibilidad * 20
    };
    const totalScore = roundHalfUp(Object.keys(dimensions).reduce((sum, key) => sum + dimensions[key] * profile.pesos[key], 0) / 100);
    return {
      monthlyGrossCent, variableCostCent, fixedCostCent: offer.costesFijosMensualesCent, totalCostCent,
      availableCent, effectiveMinutesWeek, effectiveHourValueCent,
      dimensions: Object.fromEntries(Object.entries(dimensions).map(([key, value]) => [key, roundHalfUp(value)])),
      totalScore: clamp(totalScore)
    };
  }

  function canTransition(from, to) { return Boolean(TRANSITIONS[from]?.has(to)); }
  function validateComparableOffers(offers) {
    if (!Array.isArray(offers)) return { ok: false, reason: 'La selección de ofertas no es válida.' };
    const profileIds = [...new Set(offers.map(offer => offer && offer.perfilId).filter(Boolean))];
    if (offers.some(offer => !offer || !offer.perfilId)) return { ok: false, reason: 'Todas las ofertas deben tener un perfil válido.' };
    if (profileIds.length > 1) return { ok: false, reason: 'Solo puedes comparar ofertas del mismo perfil.' };
    return { ok: true, profileId: profileIds[0] || null };
  }
  function alert(id, level, code, message, offerId, candidatureId = null) { return { id: `${id}-${code}`, level, code, message, offerId, candidatureId }; }
  function buildAlerts(state, now = new Date()) {
    const current = new Date(now).getTime(), result = [];
    for (const offer of state.ofertas) {
      const profile = state.perfiles.find(p => p.id === offer.perfilId); if (!profile) continue;
      const calc = calculateOffer(profile, offer);
      const candidates = state.candidaturas.filter(c => c.ofertaId === offer.id);
      const nonTerminal = candidates.filter(c => !TERMINAL.has(c.estado));
      const costsCritical = calc.totalCostCent >= calc.monthlyGrossCent;
      const timeCritical = calc.effectiveMinutesWeek > 4200;
      const commuteHigh = offer.minutosDesplazamientoDia > profile.maxDesplazamientoDia * 2;
      if (costsCritical) result.push(alert(offer.id, 'critica', 'costes_superan', 'Los costes igualan o superan el ingreso mensual calculado.', offer.id));
      if (timeCritical) result.push(alert(offer.id, 'critica', 'mas_70h', 'El tiempo efectivo supera 70 horas semanales.', offer.id));
      if (!costsCritical && calc.effectiveHourValueCent < profile.objetivoHoraCent * 0.75) result.push(alert(offer.id, 'alta', 'valor_75', 'El valor efectivo por hora queda por debajo del 75% del objetivo.', offer.id));
      if (commuteHigh) result.push(alert(offer.id, 'alta', 'desplazamiento_doble', 'El desplazamiento supera el doble del máximo indicado.', offer.id));
      const deadline = offer.fechaLimite ? new Date(`${offer.fechaLimite}T23:59:59Z`).getTime() : null;
      if (deadline !== null && deadline < current && (nonTerminal.length || !candidates.length)) result.push(alert(offer.id, 'alta', 'limite_vencido', 'La fecha límite venció y no hay resultado terminal.', offer.id));
      if (!costsCritical && calc.effectiveHourValueCent >= profile.objetivoHoraCent * 0.75 && calc.effectiveHourValueCent < profile.objetivoHoraCent) result.push(alert(offer.id, 'media', 'valor_objetivo', 'El valor efectivo por hora queda bajo el objetivo.', offer.id));
      if (!timeCritical && calc.effectiveMinutesWeek > profile.maxMinutosEfectivosSemana) result.push(alert(offer.id, 'media', 'tiempo_maximo', 'El tiempo efectivo supera el máximo semanal.', offer.id));
      if (!commuteHigh && offer.minutosDesplazamientoDia > profile.maxDesplazamientoDia) result.push(alert(offer.id, 'media', 'desplazamiento_maximo', 'El desplazamiento supera el máximo diario.', offer.id));
      if (offer.estado === 'activa' && !candidates.length) result.push(alert(offer.id, 'info', 'sin_candidatura', 'Oferta activa todavía sin candidatura.', offer.id));
      if (deadline !== null && deadline >= current && deadline <= current + 3 * DAY) result.push(alert(offer.id, 'info', 'limite_3d', 'La fecha límite llega en tres días o menos.', offer.id));
      for (const candidate of nonTerminal) {
        if (candidate.proximaAccionFecha) { const next = new Date(`${candidate.proximaAccionFecha}T23:59:59Z`).getTime(); if (next < current) result.push(alert(candidate.id, 'media', 'accion_vencida', 'La próxima acción está vencida.', offer.id, candidate.id)); else if (next <= current + 2 * DAY) result.push(alert(candidate.id, 'media', 'accion_48h', 'La próxima acción vence en 48 horas o menos.', offer.id, candidate.id)); }
        const activity = [new Date(candidate.updatedAt).getTime(), ...state.eventos.filter(e => e.candidaturaId === candidate.id).map(e => new Date(e.createdAt).getTime())];
        if (Math.max(...activity) <= current - 14 * DAY) result.push(alert(candidate.id, 'info', 'sin_actualizar_14d', 'La candidatura lleva 14 días sin actividad real.', offer.id, candidate.id));
      }
      const eventTimes = state.eventos.filter(e => candidates.some(c => c.id === e.candidaturaId)).map(e => new Date(`${e.fecha}T23:59:59Z`).getTime());
      if (eventTimes.length && new Date(offer.updatedAt).getTime() > Math.max(...eventTimes)) result.push(alert(offer.id, 'info', 'editada_tras_evento', 'La oferta se editó después del último evento.', offer.id));
    }
    const order = { critica: 0, alta: 1, media: 2, info: 3 };
    return result.sort((a, b) => order[a.level] - order[b.level] || a.id.localeCompare(b.id));
  }

  function filterOffers(state, filters = {}) {
    const q = String(filters.q || '').trim().toLocaleLowerCase('es');
    return state.ofertas.filter(offer => {
      const candidateStates = state.candidaturas.filter(c => c.ofertaId === offer.id).map(c => c.estado);
      const haystack = `${offer.empresa} ${offer.puesto} ${offer.ubicacion} ${offer.notas}`.toLocaleLowerCase('es');
      return (!q || haystack.includes(q)) && (!filters.modalidad || offer.modalidad === filters.modalidad) && (!filters.estado || offer.estado === filters.estado) && (!filters.candidaturaEstado || candidateStates.includes(filters.candidaturaEstado));
    });
  }

  function analytics(state, filters = {}, now = new Date()) {
    const calculations = state.ofertas.map(offer => ({ ofertaId: offer.id, ...calculateOffer(state.perfiles.find(p => p.id === offer.perfilId), offer) }));
    const alerts = buildAlerts(state, now), filtered = filterOffers(state, filters);
    const values = calculations.map(x => x.effectiveHourValueCent);
    return { calculations, alerts, filteredIds: filtered.map(x => x.id), kpis: { ofertasActivas: state.ofertas.filter(x => x.estado === 'activa').length, candidaturas: state.candidaturas.length, alertasPrioritarias: alerts.filter(x => x.level === 'critica' || x.level === 'alta').length, valorHoraMedioCent: values.length ? roundHalfUp(values.reduce((a, b) => a + b, 0) / values.length) : 0 } };
  }
  return { TERMINAL, TRANSITIONS, roundHalfUp, calculateOffer, canTransition, validateComparableOffers, buildAlerts, filterOffers, analytics };
});
