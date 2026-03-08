# Portfolio API

[Read in English](./README.md)

Backend público mínimo del ecosistema del portfolio.

Este repositorio es dueño del contrato dinámico server-side consumido por el frontend y se mantiene intencionalmente acotado: endpoints de contacto, chat y fachada de suscripciones.

---

## Rol En El Ecosistema

- `portfolio`: frontend público, contenido editorial estático y deploy en Firebase.
- `portfolio-api`: API pública dinámica para contacto, chat y suscripciones.
- `portfolio-cloud`: automatización cloud, persistencia de suscriptores, notificaciones y publicación canónica del knowledge del chat.

---

## Contrato Público

Endpoints públicos actuales:

- `GET /api/health`
- `POST /api/contact`
- `GET /api/chat/starters`
- `POST /api/chat`
- `POST /api/subscriptions`
- `DELETE /api/subscriptions`

---

## Funcionalidades Principales

- Endpoint de contacto con validación y controles anti-spam
- Runtime híbrido de chat para starters y respuestas del asistente del portfolio
- Fachada mínima de suscripciones delegada a `portfolio-cloud`
- Carga remota del knowledge del chat desde R2 con fallback local para desarrollo o contingencia
- Validación DTO, throttling y tests automatizados

---

## Stack

- NestJS
- TypeScript
- AWS SDK para acceso a R2
- Resend
- Jest

---

## Notas De Runtime

- La API no debe servir contenido editorial estático.
- Los posts del blog y los proyectos siguen siendo ownership de `portfolio`.
- La persistencia de suscriptores y la automatización post-publicación siguen siendo ownership de `portfolio-cloud`.
- El runtime del chat resuelve el knowledge editorial canónico publicado desde la capa cloud.

---

## Desarrollo Local

```bash
npm install
npm run start:dev
```

Comandos útiles:

- `npm run build`
- `npm run lint`
- `npm test`
- `npm run test:e2e`

La configuración de entorno está documentada en `.env.example`.

---

## Version

Versión actual de la aplicación: **1.1.0**
