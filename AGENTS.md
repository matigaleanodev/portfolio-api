# portfolio-api

## Contexto de trabajo

Si existe un workspace con AGENTS.md en los directorios padre, leerlo explícitamente antes de editar y seguir sus referencias. Una raíz Git anidada puede impedir la herencia automática. Fuera de ese entorno, este archivo y el README deben ser suficientes para trabajar.

## Código y contratos

- NestJS, TypeScript; API dinámica acotada del portfolio.
- Health, contacto, chat/starters y fachada de suscripciones son su superficie de producto.
- El contenido editorial se produce en portfolio y se publica mediante portfolio-cloud.
- Conservar DTOs, errores, CORS, cuotas y compatibilidad con portfolio-api-cloud.
- Chat combina perfil/FAQ, conocimiento editorial y proveedor externo encapsulado.
- Suscriptores y operaciones de almacenamiento pertenecen a portfolio-cloud.

## Desarrollo y verificación

- npm ci instala; npm run start:dev inicia NestJS.
- npm run build compila; npm test ejecuta Jest.
- npm run test:e2e verifica integración cuando el cambio lo requiere.
- npm run lint aplica fixes; revisar cambios antes de conservarlos.
- Usar dobles/configuración ficticia para pruebas de modelos, correo y suscripciones.

## Restricciones

- No agregar CMS, endpoints de posts o proyectos ni replicar automatizaciones cloud.
- No duplicar escrituras entre implementaciones NestJS y Lambda.
- Mantener fallback/control de errores sin exponer prompts, datos privados o credenciales.
- Las pruebas de contratos no requieren invocar modelos o proveedores reales.
- Revisar README para límites y configuración de la implementación.
