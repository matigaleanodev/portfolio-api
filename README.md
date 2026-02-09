# Portfolio API

API backend para el formulario de contacto del portfolio personal.

## ✨ Features

- Endpoint público de contacto
- Validaciones con `class-validator`
- Anti-spam con **honeypot** y **rate limiting**
- Envío de emails vía **Resend**
- Tests unitarios (Jest)

## 🧩 Tech stack

- NestJS
- TypeScript
- Resend
- Jest

## 🚀 Endpoints

### Contacto (implementado)

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

## 🛡️ Anti-spam

- **Honeypot**: campo oculto (`company`). Si viene con valor, se ignora el envío (respuesta igual OK).
- **Rate limit**: 5 requests por hora por IP (solo en el módulo de contacto).

## ⚙️ Variables de entorno

Crear un archivo `.env` basado en `.env.example`:

- `RESEND_API_KEY`: API key de Resend
- `CONTACT_FROM_EMAIL`: email “from” (dominio verificado)
- `CONTACT_TO_EMAIL`: email destino (tu inbox)
- `CORS_ORIGIN`: origen permitido (ej: `https://matiasgaleano.dev`)

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

## 🗺️ Roadmap (todavía no implementado)

> Estos endpoints/módulos están **planificados**, pero **no existen aún** en el código.

### Proyectos (planificado)

- `GET /api/projects`
- `GET /api/projects/:id`

### Chatbot (planificado)

- `POST /api/chat`

---
