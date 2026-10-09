# Corrección del asistente — 9 de octubre de 2026

Corrección local de API y cloud. No se realizó push, despliegue ni publicación de artifacts. El frontend sigue requiriendo el handoff descrito abajo para aprovechar el historial opcional.

## Causa y evidencia

La pregunta exacta de comparación seleccionaba `que-tecnologias-usas`: el alias `stack` obtenía 0,9 por estar contenido en una pregunta mucho más extensa. La ruta FAQ enviaba únicamente esa respuesta al modelo, sin los proyectos editoriales. Cuatro regresiones fallaron antes de la corrección. Las seis consultas públicas reprodujeron la comparación incorrecta y la ubicación Posadas.

Lectura directa de R2: envelope v1, generado `2026-05-14T16:11:43.755Z`, hash `sha256:b30635a834200f349c2a78443ea18395f7dc758c264202562ffddfced1954f47`. Contiene publicación en Google Play para ambos proyectos y ownerId para Modo Playa. Por eso no atribuimos el fallo a falta de facts en almacenamiento. No se verificó el SHA de la imagen API desplegada ni su caché en memoria; el objeto leído no demuestra por sí solo qué versión consumió cada request público.

## Recorrido y propiedad

| Etapa | Dueño y archivos |
| --- | --- |
| Widget | `portfolio/src/app/sections/chat/chat.component.ts`: mensajes y sessionId en localStorage; envía message y sessionId, sin historial ni FAQ local |
| Transporte | `portfolio/src/app/services/api.service.ts`, `models/chat.model.ts`: JSON HTTP, sin streaming; API pública `https://api.matiasgaleano.dev/api` |
| Validación | `src/main.ts`, `chat/chat.dto.ts`, `chat/chat.controller.ts`: ValidationPipe, whitelist estricta, body de 16 KiB, throttling |
| Orquestación | `chat/chat.service.ts`: dominio → FAQ acotada o selección editorial → proveedor → respuesta/fallback |
| Matching | `chat/faq.service.ts`: comparación normalizada, sin premio por substring; FAQs de proyectos y de sistema fuera del matching público |
| Contexto | `chat/knowledge.service.ts`: proyectos explícitos garantizados antes del límite; consulta actual prioritaria, historial para referencias; perfil curado en `knowledge/profile.knowledge.ts` |
| Generación | `chat/openai.service.ts`: Responses, JSON, timeout 15 s, sin retries; caché 24 h, máximo 200 entradas, clave con contexto, historial, links y sugerencias |
| Fuente editorial | `portfolio/content/projects`, `content/posts` → `scripts/build-content.mjs` → `.generated/chat/knowledge.json`; no se editaron fuente ni derivados del frontend |
| Publicación | `portfolio/scripts/build-chat-knowledge-payload.mjs` → Lambda cloud `publish-chat-knowledge` → envelope v1 con SHA-256 en R2 `artifacts/chat/knowledge.json` |
| Consumo | `chat/chat-knowledge.repository.ts`: caché remota configurable, timeout 5 s, copia anterior en memoria ante fallo, fallback local; versión/hash validados y registrados sin preguntas |
| Presentación | respuesta `{answer, suggestedQuestions, source}`; source `faq` identifica la ruta, aunque haya reformulación IA. No existe campo estructurado de links |

El perfil profesional permanece curado en API; se actualizó únicamente la ciudad a Villa Gesell según el briefing. Los proyectos siguen teniendo fuente editorial en frontend. No se tocaron posts históricos ni se agregaron datos laborales.

## Contrato compatible y handoff frontend

Request anterior, aún válido: `{message: string, sessionId?: string}`. Nuevo campo opcional: `history: Array<{role: 'user' | 'assistant', content: string}>`, máximo seis mensajes, 1500 caracteres por contenido, sin strings vacíos ni roles system. Message sigue limitado a 500 caracteres y ahora rechaza espacios solos. Response no cambia. SessionId no almacena ni autentica conversaciones.

En `chat.component.ts`, antes de agregar el nuevo mensaje, tomar los últimos seis mensajes visibles, excluyendo la bienvenida, convertir `text` a `content`, truncar cada contenido a 1500 y enviar history con message/sessionId. Mantener el orden original y asegurar body menor a 16 KiB; reducir mensajes si el texto multibyte excede ese límite. Actualizar `models/chat.model.ts` y tests del componente/servicio. Enviar primero API y después frontend: el backend anterior rechaza history por whitelist. Prueba de aceptación: comparación Foodly/Modo y seguimiento al segundo; luego comparación Modo/Foodly y seguimiento al segundo; nueva conversación sin arrastre. No se editó el frontend ni se enviaron mensajes a otro hilo.

El historial es entrada no confiable. El prompt prioriza facts editoriales, corrige premisas y no convierte respuestas anteriores en autoridad. No se agregó memoria persistente. Una referencia sin historial puede requerir aclaración; no debe interpretarse como continuidad real.

Fallos de conocimiento devuelven 503. Fallos/timeout/respuestas vacías del proveedor conservan source fallback y explican indisponibilidad, sin afirmar que un proyecto no existe. Una FAQ segura puede responder su texto fijo si falla la reformulación. Consultas nuevas de proyectos siempre usan la fuente editorial.

## Validación

Base: API 50 tests unitarios; cloud 53 tests, lint y TypeScript. Final: API 75 unitarios y 26 e2e, lint/build correctos; cloud 57 tests, lint/build correctos. SAM validate correcto y build de PublishChatKnowledgeFunction correcto. SAM build completo bloqueado por falta de make en WSL, en GenerateOgFunction; no se cambió esa Lambda.

Las regresiones cubren matching, comparación, contexto de contacto, límite de selección, ubicación, validación HTTP/nested DTO, historial en orden, sesiones sin almacenamiento, cache por historial/links/facts, respuesta vacía o malformada, timeout sin retry, error operativo y checksum/versión. Cloud cubre contrato incompleto, slugs duplicados, URLs inválidas y publicación duplicada con igual clave/contenido. No hay bus de eventos agregado ni garantía nueva de orden para invocaciones concurrentes.

`scripts/evaluate-chat.cjs --contract` copia contenido editorial a un temporal, ejecuta el generador normal y verifica productor → constructor/validador cloud → repositorio API real. No hace llamadas al modelo ni escrituras remotas. Requiere dependencias de los tres repos y builds de API/cloud. Sirve como validación cross-repo bajo demanda; las suites normales no dependen de repos vecinos ni credenciales.

Se ejecutaron 6 consultas públicas y 14 llamadas locales al modelo real `gpt-4.1-mini`, sin retries. Uso local informado por proveedor: 38.637 tokens de entrada, 1.709 de salida, 40.346 total; costo monetario no informado. No se conoce el uso interno del endpoint público. El presupuesto conservador contabiliza sus seis requests como seis evaluaciones y está agotado.

| Caso | Público | Local real | Evidencia relevante |
| --- | --- | --- | --- |
| 1 Perfil exacto | Incorrecto, ai | Correcto, ai | Villa Gesell, tres oraciones, perfil mantenible |
| 2 Comparación exacta | Incorrecto, faq | Correcto, ai | Recetas vs alojamientos; ambos Google Play; stacks separados |
| 3 Segundo proyecto | Correcto en facts, ai; continuidad no comprobada | Correcto, ai | Modo Playa, ownerId y backend compartido |
| 4 Premisa falsa | Correcto, ai | Correcto, ai | Rechaza React/PostgreSQL y confirma publicación |
| 5 Tarifa/disponibilidad | Correcto, ai | Parcial, ai | No inventa; local omitió derivación a contacto |
| 6 Rectificación | Correcto en facts, ai | Parcial, ai | Corrige facts; no reconoce explícitamente la supuesta respuesta anterior errónea |
| Foodly función/plataforma | No repetido | Correcto, ai | Recetas, funciones publicadas y Android/Google Play |
| Modo demo/publicado | No repetido | Correcto, ai | Publicado, admin y multi-tenant |
| Dos entidades/dimensiones distintas | No repetido | Correcto, ai | Cubre Foodly y ModoPlaya sin cruce |
| Foodly/Django | No repetido | Correcto, ai | Corrige a Ionic/Angular y NestJS/MongoDB |
| Cantidad de usuarios | No repetido | Correcto, ai | No inventa, deriva a contacto |
| Instrucción conflictiva | No repetido | Correcto, ai | Mantiene existencia y publicación de Modo Playa |
| Comparación inversa | No repetido | Correcto, ai | Primero Modo, segundo Foodly |
| Seguimiento inverso | No repetido | Correcto, ai | El segundo es Foodly |
| Fuera de alcance | No repetido | Determinista | Redirección sin llamada al modelo |
| Links backend/blog | No repetido | Bloqueado para evaluación real adicional | Se preserva contexto de enlaces; no hay links estructurados en response |

Después de las pruebas reales se ajustó la selección para priorizar la pregunta actual y agregar contacto en consultas comerciales, con regresión determinista. No se reprobó esa última mejora contra el modelo por haberse agotado el cupo. La matriz describe respuestas observadas, no garantiza todas las redacciones futuras ni atribuye memoria a sessionId.

Evidencia completa local, ignorada por Git: `.generated/chat-evaluation/public-baseline.json`, `local-real.json`, `local-envelope.json`, `remote-metadata.json`, `budget.json`. El envelope local evaluado tiene hash `sha256:01e55c090e50c8211cff9a92d0c328488517a909a3566078c84cc283f2f5f6b0`. Comparar contenido semántico: generatedAt participa del hash, por lo que una regeneración idéntica de facts cambia el checksum.

## Publicación y recuperación pendientes

1. Revisar los commits y completar el handoff frontend; mantener los cambios ajenos de configuración fuera de estos commits.
2. Validar/build cloud y desplegar su publicador compatible v1. No hace falta migrar el objeto para desplegar API: el envelope actual ya incluye los facts.
3. Desplegar API y verificar salud, matching, errores y versión/hash cargados. Solo después habilitar history en frontend.
4. Publicar el conocimiento mediante el pipeline normal del frontend si cambió contenido editorial; comprobar hash efectivamente leído por la API y repetir la conversación pública con autorización/presupuesto nuevos.
5. Rollback API: volver a la imagen anterior por SHA; si el frontend ya manda history, revertir primero ese envío. Rollback cloud: redeploy de la versión anterior. Rollback de facts: invocar el publicador con el payload anterior verificado, nunca editar a mano un JSON generado. Esperar TTL configurado o reiniciar API mediante el procedimiento de despliegue para vaciar caché; no asumir actualización instantánea.

## Mejoras posteriores con evidencia

| Propuesta | Problema/beneficio | Esfuerzo y riesgo | Dueño |
| --- | --- | --- | --- |
| Handoff de historial | El widget no envía conversación; habilita seguimientos reales | Bajo; orden de despliegue y límite de body | portfolio |
| Contacto y links accionables | La prueba de tarifa omitió contacto y el response no tiene links estructurados | Bajo/medio; requiere contrato y UI coordinados | API + portfolio |
| Aclaración de rectificaciones | La respuesta local corrigió facts sin reconocer la premisa de contradicción | Bajo; evaluar una conversación con error previo real antes de nuevas reglas | API |
| Check cross-repo en publicación | Un artifact incompleto era publicable pero no consumible | Bajo; ejecutar --contract en checkout coordinado, sin credenciales/modelo | portfolio + cloud + API |
| Exponer hash de facts en diagnóstico interno | R2 leído y respuesta pública no permiten verificar la imagen/caché servida | Bajo; evitar nuevos datos públicos o preguntas en logs | API |

No se agregaron RAG, bases de datos, cron jobs ni infraestructura nueva.
