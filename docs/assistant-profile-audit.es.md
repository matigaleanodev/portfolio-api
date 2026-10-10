# Auditoría del perfil y las respuestas del asistente

Revisión local del 9 de octubre de 2026, posterior a la auditoría editorial registrada en `chat-audit.es.md`. Ramas: API `feature/assistant-profile-consistency` y frontend `feature/assistant-conversation`. Cambios sin commit, push ni despliegue. Cloud permanece sin cambios.

## Hallazgos y correcciones

| Hallazgo | Corrección |
| --- | --- |
| El ranking dependía de substrings: «trabajás» no recuperaba de forma fiable la experiencia laboral; publicaciones competidoras podían desplazarla. | Selección prioritaria por intención laboral y variantes normalizadas, antes del límite de cuatro elementos. |
| La presentación «Boreal IT para Comafi» no distinguía empleador contractual y trabajo cotidiano. | Comafi aparece primero; Boreal IT se identifica como consultora empleadora, sin ocultarla. Área: Fondos Comunes de Inversión. |
| FAQ y contexto duplicaban biografía y stack; el prompt imponía otra lista incompleta. | `knowledge/professional-profile.ts` concentra los textos profesionales compartidos por FAQ y contexto. Se elimina la lista fija del prompt. |
| Faltaban conocimientos confirmados y se confundía AWS profesional con las Lambdas del portfolio. | Contextos de bases de datos y AWS: SQL Server, PostgreSQL en RDS y Aurora compatible con PostgreSQL, DynamoDB, SQS, Lambda y CDK. Las consultas exclusivamente profesionales recuperan perfil, sin publicaciones ni arquitectura editorial. |
| Riesgo de atribuir todo el stack a Comafi o a un proyecto. | El trabajo confirmado en Comafi se describe con Angular, NestJS, microservicios AWS, infraestructura CDK, Lambda y PostgreSQL. El conocimiento amplio de otros servicios no implica su uso en cada sistema. Las consultas sobre proyectos nombrados no incorporan conocimientos personales ajenos. |
| Tono variable entre FAQ en primera persona y respuestas distantes; sugerencias sobre «ese proyecto» en consultas laborales. | Primera persona coherente con las FAQ, voseo, respuesta directa y normalmente 2–4 oraciones. Sugerencias según el contexto profesional recuperado. |
| Falta de un dato en la selección podía convertirse en «el portfolio no especifica». | El prompt y el fallback expresan falta de confirmación, sin concluir ausencia global. Se mantiene separado el error técnico del desconocimiento. |
| Idiomas y preferencias solo estaban disponibles mediante FAQ exactas. | Se comparten esos textos existentes con el contexto profesional. Las preferencias no habilitan promesas de disponibilidad inmediata. |
| El contexto cloud omitía una Lambda y la fachada de suscripciones. | Se incorpora `publish-chat-knowledge`, verificada en `portfolio-cloud/template.yaml`, y se describe la fachada HTTP de API. El título de Lambdas identifica explícitamente el portfolio. |

AWS CDK se describe como infraestructura como código, no como entorno de ejecución. No se publicaron correo interno, detalles de pago ni reuniones privadas. Se conservan los hechos anteriores sobre Ingertec, MySQL, MongoDB, idiomas y preferencias; no se inventan responsabilidades, métricas ni certificaciones. La estimación «cerca de cuatro años» sigue siendo aproximada y debe revisarse cuando se actualice el perfil.

## Respuesta laboral de referencia

> Trabajo en Banco Comafi a través de Boreal IT, la consultora que me emplea. Mi día a día está dentro del equipo de Comafi, en el área de Fondos Comunes de Inversión.

El detalle técnico se amplía cuando corresponde. La FAQ laboral también conserva una respuesta canónica si falla la reformulación del proveedor.

## Evidencia y validación

- Baseline: 75 pruebas unitarias y 26 de integración aprobadas. Diez regresiones nuevas fallaron antes de corregir selección y datos.
- Validación final: lint y build en API y frontend; 107 pruebas unitarias y 31 de integración API, y 91 pruebas frontend aprobadas. `git diff --check` sin errores.
- Regresiones: preguntas laborales con/sin tildes, Comafi/Boreal, consultas de bases de datos y AWS, referencia «¿qué hacés ahí?» con historial, idiomas/contacto, aislamiento del stack de Foodly y sugerencias laborales.
- Integración HTTP: se inspecciona el contexto enviado al proveedor y el fallback laboral con proveedor caído. Las respuestas del proveedor son simuladas: estas pruebas no demuestran calidad lingüística de una generación real.
- Comprobación adicional sin red con el artifact local de `portfolio/.generated/chat/knowledge.json`: tres proyectos y once publicaciones. Se verificaron selección laboral, bases de datos, AWS, aislamiento de Foodly y arquitectura del portfolio.
- Evaluación real con `gpt-4.1-mini`: ocho casos sintéticos iniciales y dos repeticiones de tres casos, catorce llamadas en total, todas HTTP 200. Se mantuvo intacto el presupuesto histórico de la auditoría anterior. La tanda nueva tiene ledger persistente propio y no permite reinicios automáticos.
- Casos: empleo, seguimiento laboral, bases de datos, SQS/Lambda/CDK, premisa laboral falsa con historial incorrecto, comparación de proyectos, aislamiento del segundo proyecto y Redis no confirmado. Los controles automáticos pasaron, pero la revisión manual detectó un «sí» ambiguo y una generalización sobre toda la infraestructura CDK. Se ajustaron las reglas y se separaron los hechos verificados del mensaje del visitante, llevándolos al mensaje de sistema. La comprobación final eliminó la ambigüedad y la generalización; persiste una frase rígida sobre Redis («No tengo confirmado que tenga…») que conserva correctamente la incertidumbre.
- Consumo total: 22.135 tokens de entrada y 1.445 de salida. Latencia del proveedor: 1.254–3.273 ms, promedio 1.908 ms. Muestra pequeña, sin estimación monetaria ni extrapolación a producción. Se repitieron los tres casos afectados, no toda la matriz con el último prompt.
- Script: `scripts/evaluate-assistant-profile.cjs`; resultados, uso, hashes del prompt y presupuestos en `.generated/assistant-profile-evaluation/` (ignorado por Git). Son conversaciones sintéticas para evaluación, no registros de visitantes. La revisión sigue la [guía oficial de evaluaciones](https://developers.openai.com/api/docs/guides/evaluation-best-practices); la separación de roles sigue la [documentación de generación de texto](https://developers.openai.com/api/docs/guides/text).

## Historial y disponibilidad

El contrato HTTP, proveedor, modelo, TTL de caché, timeouts y almacenamiento editorial permanecen vigentes. Las consultas exclusivamente profesionales conocidas (empleo, presentación, stack, bases de datos, AWS, idiomas, contacto y consultas comerciales) evitan por completo el repositorio editorial. Un fallo de R2 no bloquea esos hechos locales. Las consultas sobre proyectos, posts o mezclas con información editorial mantienen el 503 cuando no hay fuente válida; no reciben proyectos inventados como fallback.

El widget envía `history` con hasta seis turnos previos, en orden y sin incluir la pregunta actual, bienvenida ni mensajes fallback. Cada contenido se limita a 1500 unidades UTF-16 sin cortar pares de sustitutos; el JSON completo se mantiene en 15 KiB para respetar los 16 KiB de API, descartando primero turnos antiguos. El sessionId se limita a 100 caracteres. Los mensajes restaurados desde localStorage pasan por los mismos límites. No se agrega memoria persistente de conversaciones en API; el almacenamiento local preexistente del widget se conserva.

## Métricas y privacidad

`ChatMetrics` emite eventos JSON mediante el logger existente, sin servidor de métricas ni dependencias nuevas:

| Evento | Valores y uso |
| --- | --- |
| `chat_reply` | `faq`, `ai`, `fallback`, `out_of_scope`, `error`; duración total. Permite contar respuestas, fallbacks y fallos sin confundir rechazo de dominio con fallo del proveedor. |
| `chat_knowledge` | `curated`, `editorial`, `error`; duración de selección. |
| `chat_provider` | `success`, `cache_hit`, `disabled`, `empty_context`, `http_error`, `invalid_response`, `timeout`, `network_error`; duración y consumos de tokens cuando el proveedor los informa. |

En los logs existentes se pueden agrupar eventos por resultado, calcular percentiles sobre `durationMs`, contar `cache_hit` y sumar `inputTokens`, `outputTokens` y `cachedInputTokens`. Los hits de caché local no vuelven a sumar tokens; los tokens cacheados del proveedor son una parte de los tokens de entrada. Un consumo ausente queda ausente, no se registra como cero. Son métricas operativas, no una medida automática de corrección de respuestas.

Los eventos usan campos permitidos: no incluyen pregunta, respuesta, historial, sessionId, identidad ni credenciales. Los errores del proveedor ya no imprimen textos arbitrarios de excepciones. Las claves de la caché en memoria son SHA-256 en lugar de contener preguntas/historial en claro; las respuestas cacheadas mantienen el TTL existente de 24 h. Analytics del widget registra longitud de sugerencias, no su texto. La retención y visualización corresponden al sistema de logs existente; esta tarea no despliega dashboards ni modifica la política de datos del proveedor externo.

## Publicación prevista

Revisar ambos diffs y desplegar primero API y después frontend. El backend ya admite el historial opcional, pero mantener ese orden evita incompatibilidad ante instalaciones anteriores. No hace falta republicar el artifact editorial para actualizar los hechos profesionales locales. Una instancia nueva carga perfil/prompt con caché vacía. Después del despliegue, verificar empleo, seguimiento «ahí», comparación y «segundo», y eventos sin texto. No se ejecutaron estos despliegues ni el smoke público.
