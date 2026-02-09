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

-`MONGO_URI`: `mongodb+srv://<USER>:<PASSWORD>@portfolio-cluster.mongodb.net/portfolio`

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

### Chatbot (planificado)

- `POST /api/chat`

---
