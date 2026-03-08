# Portfolio API

API backend del portfolio personal con:

- formulario de contacto
- chatbot híbrido (FAQ + conocimiento curado local + artifacts editoriales + OpenAI)

Contrato público actual:

- `GET /api/health`
- `POST /api/contact`
- `GET /api/chat/starters`
- `POST /api/chat`

## ✨ Features

- Endpoint público de contacto
- Chatbot híbrido con sugerencias de preguntas
- Starters del chat (`GET /api/chat/starters`)
- FAQ seedable en MongoDB
- Conocimiento curado versionado para perfil y arquitectura cloud
- Artifact editorial para proyectos y blog generado desde `portfolio`
- Validaciones con `class-validator`
- Anti-spam con **honeypot** y **rate limiting**
- Envío de emails vía **Resend**
- Tests unitarios + e2e (Jest)

## 🧩 Tech stack

- NestJS
- TypeScript
- MongoDB + Mongoose
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

- `MONGO_URI`: `mongodb+srv://<USER>:<PASSWORD>@portfolio-cluster.mongodb.net/portfolio`

- `RESEND_API_KEY`: API key de Resend
- `CONTACT_FROM_EMAIL`: email “from” (dominio verificado)
- `CONTACT_TO_EMAIL`: email destino (tu inbox)
- `CORS_ORIGIN`: origen permitido (ej: `https://matiasgaleano.dev`)
- `TRUST_PROXY`: cantidad de proxies confiables delante de Express (ej: `1` detrás de Traefik o Nginx)
- `OPENAI_API_KEY`: API key de OpenAI (para el chatbot)
- `OPENAI_CHAT_MODEL`: modelo de chat (default: `gpt-4.1-mini`)
- `CHAT_EDITORIAL_KNOWLEDGE_PATH`: ruta opcional al artifact generado por `portfolio` en `.generated/chat/knowledge.json`
- `PORT`: puerto de la API (default: `3000`)

## 🌱 Seed de chatbot

Para poblar FAQs y contexto inicial del chatbot:

```bash
npm run seed:chat
```

El seed carga:

- FAQs del chatbot (`faqs`)

El conocimiento curado del chatbot ahora vive versionado en `src/chat/knowledge/`.
El conocimiento editorial de proyectos y blog se genera desde el repo `portfolio`.

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
