# Portfolio API

API backend del portfolio personal con:

- formulario de contacto
- chatbot híbrido (FAQ + conocimiento curado local + artifacts editoriales + OpenAI)

Contrato público actual:

- `GET /api/health`
- `POST /api/contact`
- `POST /api/subscriptions`
- `DELETE /api/subscriptions`
- `GET /api/chat/starters`
- `POST /api/chat`

## ✨ Features

- Endpoint público de contacto
- Fachada pública mínima para suscripciones del blog
- Chatbot híbrido con sugerencias de preguntas
- Starters del chat (`GET /api/chat/starters`)
- FAQs versionadas en código para respuestas y sugerencias del chatbot
- Conocimiento curado versionado para perfil y arquitectura cloud
- Artifact editorial para proyectos y blog generado desde `portfolio`
- Validaciones con `class-validator`
- Anti-spam con **honeypot** y **rate limiting**
- Envío de emails vía **Resend**
- Tests unitarios + e2e (Jest)

## 🧩 Tech stack

- NestJS
- TypeScript
- Resend
- OpenAI Responses API
- Jest

## 🚀 Endpoints

### `GET /api/health`

Healthcheck básico.

Respuesta:

```json
{ "status": "ok" }
```

### Contacto

`POST /api/contact`

Body:

```json
{
  "name": "string",
  "email": "string",
  "message": "string"
}
```

Respuesta esperada:

- `204 No Content` si el request es válido
- `400 Bad Request` si falla la validación
- `429 Too Many Requests` si supera el rate limit

### Suscripciones

`POST /api/subscriptions`

Body:

```json
{
  "email": "reader@example.com"
}
```

Respuesta esperada:

```json
{
  "message": "Subscribed successfully",
  "email": "reader@example.com"
}
```

`DELETE /api/subscriptions`

Body:

```json
{
  "email": "reader@example.com"
}
```

Respuesta esperada:

```json
{
  "message": "Unsubscribed successfully",
  "email": "reader@example.com"
}
```

Notas:

- `portfolio-api` no persiste suscriptores ni implementa dominio editorial
- la API delega hacia `portfolio-cloud`
- `portfolio-cloud` sigue siendo el owner del dominio de suscriptores
- ambos endpoints tienen validacion DTO y rate limit de `10` requests por hora por IP

## 🤖 Chatbot

El chatbot usa una arquitectura híbrida:

- `FAQ -> conocimiento curado local + artifact editorial -> OpenAI -> fallback`
- Responde con `answer` + `suggestedQuestions`
- Incluye preguntas sugeridas iniciales para arrancar la conversación
- Puede responder sobre proyectos, blog, stack y arquitectura reciente del ecosistema `portfolio`

### `GET /api/chat/starters`

Devuelve 2 preguntas sugeridas iniciales.

Ejemplo:

```json
{
  "suggestedQuestions": [
    "¿Quién sos y a qué te dedicás?",
    "¿Qué tecnologías usás?"
  ]
}
```

### `POST /api/chat`

Body:

```json
{
  "message": "publicaste alguna app en play store?",
  "sessionId": "local-dev-session"
}
```

Respuesta:

```json
{
  "answer": "Sí, Foodly Notes está publicada en Play Store.",
  "suggestedQuestions": [
    "¿Qué tecnologías usaste en Foodly Notes?",
    "¿Qué proyecto destacás?"
  ],
  "source": "ai"
}
```

`source` puede ser: `faq`, `ai` o `fallback`.

## 🛡️ Protecciones

- **Honeypot**: campo oculto (`company`). Si viene con valor, se ignora el envío (respuesta igual OK).
- **Rate limit global liviano**: 60 requests por minuto por IP para endpoints públicos.
- **Rate limit de contacto**: 5 requests por hora por IP en `POST /api/contact`.
- **Rate limit de chat**: 20 requests por minuto por IP para `GET /api/chat/starters` y `POST /api/chat`.
- **Límites de payload**: parser JSON y urlencoded limitados a `16kb`.
- **Headers básicos**: `X-Content-Type-Options`, `X-Frame-Options` y `Referrer-Policy`.
- **DTO validation estricta**: whitelist activa, rechazo de propiedades no permitidas y corte en el primer error.

Estado actual frente a abuso y ataques comunes:

- Bien cubierto frente a abuso trivial por payloads inválidos, bodies grandes y ráfagas simples por IP.
- Aceptable para un portfolio público chico detrás de reverse proxy.
- Todavía pendiente de endurecer frente a ataques más serios o distribuidos: WAF/CDN, reputación IP, CAPTCHA o anti-bot dedicado, observabilidad centralizada y políticas de bloqueo más finas.

## ⚙️ Variables de entorno

Crear un archivo `.env` basado en `.env.example`:

- `RESEND_API_KEY`: API key de Resend
- `CONTACT_FROM_EMAIL`: email “from” (dominio verificado)
- `CONTACT_TO_EMAIL`: email destino (tu inbox)
- `CORS_ORIGIN`: origen permitido (ej: `https://matiasgaleano.dev`)
- `TRUST_PROXY`: cantidad de proxies confiables delante de Express (ej: `1` detrás de Traefik o Nginx)
- `PORTFOLIO_CLOUD_API_URL`: base URL pública de `portfolio-cloud` para delegar suscripciones
- `R2_ENDPOINT`: endpoint S3-compatible de Cloudflare R2
- `R2_REGION`: región del cliente S3-compatible (default: `auto`)
- `R2_BUCKET`: bucket donde `portfolio-cloud` publica el artifact canónico del chat
- `R2_ACCESS_KEY_ID`: credencial de acceso a R2
- `R2_SECRET_ACCESS_KEY`: secreto de acceso a R2
- `CHAT_KNOWLEDGE_OBJECT_KEY`: key del objeto del knowledge del chat en R2 (opcional, default: `artifacts/chat/knowledge.json`)
- `CHAT_KNOWLEDGE_CACHE_TTL_MS`: TTL en milisegundos del cache en memoria del knowledge remoto (opcional, default: `300000`)
- `OPENAI_API_KEY`: API key de OpenAI (para el chatbot)
- `OPENAI_CHAT_MODEL`: modelo de chat (default: `gpt-4.1-mini`)
- `PORT`: puerto de la API (default: `3000`)

## 📚 Fuente de conocimiento del chatbot

Las FAQs del chatbot viven versionadas en `src/chat/content/chat-faq.data.ts`.
El conocimiento curado del chatbot vive versionado en `src/chat/knowledge/`.
El conocimiento editorial de proyectos y blog se genera desde el repo `portfolio`.
La copia canónica cloud la publica `portfolio-cloud` en R2 como un envelope que contiene `knowledge`.
En runtime, `portfolio-api` resuelve primero ese envelope directo desde R2 usando un cliente S3-compatible, extrae `knowledge` y lo cachea en memoria por TTL.
Si R2 falla y existe cache previo, reutiliza el ultimo snapshot en memoria.
Si no hay cache remoto disponible, mantiene un fallback local a `.generated/chat/knowledge.json` en el repo actual o en `../portfolio/.generated/chat/knowledge.json` para desarrollo y contingencia.
La configuracion remota usa `R2_ENDPOINT`, `R2_REGION`, `R2_BUCKET`, `R2_ACCESS_KEY_ID` y `R2_SECRET_ACCESS_KEY`.

## 🖥️ Run locally

```bash
npm install
npm run start:dev
```

La API corre por defecto en:

- `http://localhost:3000`
- con prefijo global: `/api`

## 🧪 Tests

```bash
npm test
```

E2E:

```bash
npm run test:e2e
```

Lint:

```bash
npm run lint
```

## Deploy

El deploy productivo de `portfolio-api` debe cumplir dos condiciones antes de iniciar la app:

- `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, `CONTACT_TO_EMAIL` y `PORTFOLIO_CLOUD_API_URL` deben existir
- debe existir configuracion valida de R2 para el knowledge del chat o, como contingencia, `.generated/chat/knowledge.json` en el directorio operativo del backend

Si falta tanto R2 como el artifact local de contingencia, el arranque en `NODE_ENV=production` debe fallar para evitar un runtime degradado silenciosamente.

El workflow de deploy ya no sincroniza `.generated/chat/knowledge.json` hacia EC2 como paso operativo.
En el esquema actual, el runtime productivo debe resolver el knowledge del chat directamente desde R2.
El fallback local a filesystem queda solo como contingencia tecnica y soporte de desarrollo, no como parte del handoff normal de release.
