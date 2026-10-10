# Portfolio API

[Read in Spanish](./README.es.md)

Minimal public backend for the portfolio ecosystem.

This repository owns the server-side dynamic contract consumed by the frontend and stays intentionally narrow: contact, chat, and subscription facade endpoints.

---

## Role In The Ecosystem

- `portfolio`: public frontend, static editorial content, and Firebase deployment.
- `portfolio-api`: public dynamic API for contact, chat, and subscriptions.
- `portfolio-cloud`: cloud automation, subscriber persistence, notifications, and canonical chat knowledge publication.

---

## Public Contract

Current public endpoints:

- `GET /api/health`
- `POST /api/contact`
- `GET /api/chat/starters`
- `POST /api/chat`
- `POST /api/subscriptions`
- `DELETE /api/subscriptions`

---

## Main Features

- Contact form endpoint with validation and anti-spam controls
- Hybrid chat runtime for starters and portfolio assistant responses
- Minimal subscription facade delegated to `portfolio-cloud`
- Remote chat knowledge loading from R2 with local fallback for development or contingency
- DTO validation, throttling, and automated tests

---

## Stack

- NestJS
- TypeScript
- AWS SDK for R2 access
- Resend
- Jest

---

## Runtime Notes

- The API must not serve static editorial content.
- Blog posts and projects remain owned by `portfolio`.
- Subscription persistence and post-publication automation remain owned by `portfolio-cloud`.
- Chat loads canonical cloud editorial knowledge for projects and posts; known exclusively professional questions use the local profile without depending on R2. See the [assistant audit](docs/assistant-profile-audit.md) for bounded history, real-model evaluation and text-free operational metrics.

---

## Local Development

```bash
npm install
npm run start:dev
```

Useful commands:

- `npm run build`
- `npm run lint`
- `npm test`
- `npm run test:e2e`

Environment setup is documented in `.env.example`.

---

## Version

Current application version: **1.2.0**

## Scheduled editorial content

The frontend owns publication dates and the daily static deploy; this API does not schedule posts or email. Editorial context filters invalid/future post dates using `America/Argentina/Buenos_Aires`, including cached remote and local fallback knowledge. Cloud normally publishes only the deployed frontend's filtered artifact. Deploy this protection before the frontend scheduler. Editorial and recovery guidance lives in `portfolio/Docs/scheduled-publication.md`.
