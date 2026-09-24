# OfertaJusta Local

OfertaJusta revela el coste temporal y económico que suele esconder una cifra salarial. Normaliza ofertas anuales, mensuales y por hora, calcula un valor efectivo explicable, compara opciones y acompaña cada candidatura sin enviar datos fuera del equipo.

> El resultado no es salario neto, asesoramiento laboral ni una recomendación de aceptar o rechazar.

## Qué demuestra

- Backend Node.js sin dependencias con REST estricta, referencias protegidas, transiciones e historial inmutable.
- Motor compartido de fórmulas, scoring ponderado y alertas recalculadas.
- JSON validado integralmente, escritura temporal + `fsync` + renombrado, backup anterior y recuperación conservadora.
- Frontend vanilla con KPIs, filtros combinados, tarjetas, comparador 2–5, scatter canvas, tabla equivalente, tablero por estados y CRUD.
- CSP estricta, cabeceras defensivas y servicio limitado a `127.0.0.1`.

## Abrir

Requiere Node.js 24 o superior. Ejecuta `node iniciar.cjs` dentro de esta carpeta. La dirección es `http://127.0.0.1:4327`; `Ctrl+C` detiene la instancia. No requiere `npm install`.

## Arquitectura

```text
engine.js           fórmulas, scoring, transiciones, alertas y estadísticas
storage.cjs         esquema, seed canónico, atomicidad y recuperación
server.cjs          HTTP local, API estricta y archivos estáticos
public/             interfaz y copia exacta del motor compartido
data/               JSON local de uso habitual
test/               10 casos con datos confinados en test/.tmp
```

## Fórmulas

La mensualización aplica redondeo half-up: anual ÷ 12; mensual × pagas ÷ 12; o tarifa por hora × minutos pagados × 52 ÷ 720. El coste variable mensual es coste diario × días presenciales × 52 ÷ 12. El tiempo efectivo suma minutos pagados, no remunerados y desplazamientos. El valor efectivo por hora reparte el mensual calculado menos costes sobre ese tiempo; vale cero si la cantidad disponible no es positiva.

Economía compara el valor/hora con el objetivo, tiempo compara el total con el máximo, y estabilidad, flexibilidad y accesibilidad convierten niveles 0–5 a 0–100. Los cinco pesos suman 100. El total es un score explicable de 0–100, no una recomendación.

## Reglas de integridad y alertas

- Solo se comparan ofertas del mismo perfil, por lo que las líneas de objetivo y tiempo máximo siempre pertenecen a un único criterio.
- La oferta de una candidatura y la candidatura de un evento son vínculos históricos inmutables. Para reasignarlos hay que crear un registro nuevo.
- Las fechas pasan una validación real de calendario, incluidos años bisiestos.
- Las alertas son jerárquicas: costes críticos suprimen avisos de valor; por debajo del 75% aparece solo la alerta alta y entre 75% y el objetivo solo la media. Tiempo crítico y desplazamiento superior al doble también suprimen su aviso inferior equivalente.
- Una acción vencida se distingue de otra que vence en las próximas 48 horas. La inactividad usa la última actividad real entre la actualización y los eventos registrados, no la fecha futura de una cita.
- Los errores de formulario aparecen dentro del diálogo activo con `role="alert"` y foco gestionado.

## API

- `GET /api/state` y `GET /api/ofertas/:id/calculo`.
- CRUD `/api/perfiles`, `/api/ofertas`, `/api/candidaturas`, `/api/eventos`.
- `POST /api/candidaturas/:id/transicion`.
- Historial disponible solo dentro del estado; no tiene endpoints de modificación.

## Privacidad y límites reales

No hay cuentas, nube, telemetría ni conexiones externas. Quien acceda al pendrive puede leer el JSON. Los importes no incluyen impuestos ni beneficios, el calendario no envía recordatorios y las alertas dependen de datos manuales. La interfaz no reemplaza contratos, nóminas ni asesoramiento profesional.

## Verificación

Ejecuta los seis `node --check` descritos en el proyecto y `node --test --test-isolation=none test/server.test.cjs`. En la entrega se observaron 10/10 pruebas, filtros, comparador, escritorio, 360 px sin desbordamiento y persistencia tras reinicio. No se realizó una auditoría exhaustiva con lector de pantalla.

## English portfolio description

OfertaJusta is a privacy-first local job offer analyzer. It converts salary, unpaid time, commuting and recurring costs into an explainable effective hourly value, weighted score, proactive alerts and an auditable application journey—built with vanilla JS and zero dependencies.

## Guion de vídeo — 60 segundos

- **0–8 s:** portada, privacidad local y KPIs.
- **8–20 s:** tres tarjetas con mensual calculado, tiempo y valor efectivo.
- **20–34 s:** seleccionar ofertas y mostrar scatter, líneas de objetivo/máximo y tabla.
- **34–44 s:** editar desplazamiento y enseñar cálculos y alertas recalculados.
- **44–53 s:** mover una candidatura de enviada a entrevista y registrar evento.
- **53–60 s:** vista móvil, historial y cierre: “contexto para decidir, no una recomendación”.
