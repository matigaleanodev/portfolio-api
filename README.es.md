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
- El chat carga el knowledge editorial canónico desde cloud para proyectos y publicaciones; las consultas exclusivamente profesionales conocidas usan el perfil local sin depender de R2. Ver [auditoría del asistente](docs/assistant-profile-audit.es.md) para historial, evaluación real y métricas sin texto de visitantes.

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

Versión actual de la aplicación: **1.2.0**

## Contenido editorial programado

El frontend controla las fechas de publicación y el deploy estático diario; esta API no programa posts ni mails. El contexto editorial filtra fechas de posts inválidas/futuras usando `America/Argentina/Buenos_Aires`, incluido el conocimiento remoto cacheado y el fallback local. Cloud normalmente publica solo el artifact filtrado del frontend desplegado. Desplegar esta protección antes del cron del frontend. Las reglas editoriales y de recuperación están en `portfolio/Docs/scheduled-publication.es.md`.
