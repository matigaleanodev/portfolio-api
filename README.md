# Portfolio API

API backend del portfolio personal con:

- formulario de contacto
- endpoint público de proyectos
- chatbot híbrido (FAQ + contexto Mongo + OpenAI)

## ✨ Features

- Endpoint público de contacto
- Endpoint público de proyectos
- Chatbot híbrido con sugerencias de preguntas
- Starters del chat (`GET /api/chat/starters`)
- FAQ + contexto de perfil seedable en MongoDB
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

## 📂 Proyectos

La API expone un endpoint público de solo lectura para obtener los proyectos que se muestran en el portfolio.

### `GET /api/projects`

Devuelve la lista completa de proyectos, ordenados según el campo `order`.

- Endpoint público
- Sin autenticación
- Solo lectura
- Datos obtenidos desde MongoDB Atlas

Ejemplo de respuesta:

```json
[
  {
    "name": "Foodly Notes",
    "image": "/assets/foodly-notes.webp",
    "description": "Foodly Notes es una aplicación de recetas pensada como producto real para el uso cotidiano...",
    "technologies": ["Angular", "Ionic", "NestJS", "MongoDB"],
    "links": [
      {
        "id": "frontend",
        "name": "Repositorio Frontend",
        "icon": "code",
        "color": "primary",
        "url": "https://github.com/matigaleanodev/foodly-notes"
      }
    ],
    "highlight": true,
    "order": 1
  }
]
```

Este endpoint está pensado para ser consumido directamente por el frontend del portfolio, utilizando un modelo de datos estable y sin mutaciones.

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

- `FAQ -> contexto Mongo (projects + profile_context) -> OpenAI -> fallback`
- Responde con `answer` + `suggestedQuestions`
- Incluye preguntas sugeridas iniciales para arrancar la conversación

### `GET /api/chat/starters`

Devuelve 4 preguntas sugeridas iniciales.

Ejemplo:

```json
{
  "suggestedQuestions": [
    "¿Quién sos y a qué te dedicás?",
    "¿Qué tecnologías usás?",
    "¿Qué proyecto destacás?",
    "¿Cuál es tu experiencia laboral?"
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

## 🛡️ Anti-spam

- **Honeypot**: campo oculto (`company`). Si viene con valor, se ignora el envío (respuesta igual OK).
- **Rate limit**: 5 requests por hora por IP (solo en el módulo de contacto).

## ⚙️ Variables de entorno

Crear un archivo `.env` basado en `.env.example`:

- `MONGO_URI`: `mongodb+srv://<USER>:<PASSWORD>@portfolio-cluster.mongodb.net/portfolio`

- `RESEND_API_KEY`: API key de Resend
- `CONTACT_FROM_EMAIL`: email “from” (dominio verificado)
- `CONTACT_TO_EMAIL`: email destino (tu inbox)
- `CORS_ORIGIN`: origen permitido (ej: `https://matiasgaleano.dev`)
- `OPENAI_API_KEY`: API key de OpenAI (para el chatbot)
- `OPENAI_CHAT_MODEL`: modelo de chat (default: `gpt-4.1-mini`)
- `PORT`: puerto de la API (default: `3000`)

## 🌱 Seed de chatbot

Para poblar FAQs y contexto inicial del chatbot:

```bash
npm run seed:chat
```

El seed carga:

- FAQs del chatbot (`faqs`)
- contexto de perfil (`profile_context`)

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
