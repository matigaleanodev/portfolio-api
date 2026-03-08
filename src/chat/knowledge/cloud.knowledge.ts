import { KnowledgeContextItem } from '../chat.types';

export const CLOUD_KNOWLEDGE_ITEMS: readonly KnowledgeContextItem[] = [
  {
    sourceType: 'cloud',
    sourceId: 'cloud-ecosystem',
    title: 'Arquitectura del ecosistema portfolio',
    text: [
      'El ecosistema actual está dividido en tres repositorios con responsabilidades claras.',
      '`portfolio` concentra frontend estático, contenido y prerender.',
      '`portfolio-api` conserva contacto y chatbot.',
      '`portfolio-cloud` concentra automatización serverless, OpenGraph, suscripciones y procesamiento post-publicación.',
    ].join(' '),
    tags: ['cloud', 'architecture', 'portfolio', 'portfolio-cloud', 'serverless'],
  },
  {
    sourceType: 'cloud',
    sourceId: 'cloud-lambdas',
    title: 'Experiencia reciente con AWS Lambda',
    text: [
      'Se implementaron Lambdas dedicadas para `generate-og`, `notify-post`, `subscribe`, `unsubscribe` y `process-release` dentro de `portfolio-cloud`.',
      'El enfoque fue mantener handlers chicos, servicios compartidos para proveedores y contratos idempotentes para los flujos editoriales.',
    ].join(' '),
    tags: ['aws', 'lambda', 'serverless', 'portfolio-cloud', 'og', 'subscriptions'],
  },
  {
    sourceType: 'cloud',
    sourceId: 'cloud-storage',
    title: 'Storage y estado editorial',
    text: [
      'La automatización editorial usa almacenamiento estilo objeto para assets y estado operativo.',
      'Las imágenes OpenGraph generadas se publican en un bucket accesible por dominio público y el estado procesado de posts vive como JSON versionable en storage.',
      'El criterio es usar storage simple y auditable antes que sumar bases de datos innecesarias.',
    ].join(' '),
    tags: ['cloud', 'storage', 's3', 'r2', 'state', 'og-images'],
  },
  {
    sourceType: 'cloud',
    sourceId: 'cloud-release-flow',
    title: 'Flujo post-publicación del blog',
    text: [
      'El frontend genera un release manifest con información editorial del blog.',
      'Luego `process-release` detecta posts nuevos, dispara la generación de OpenGraph y envía notificaciones a suscriptores.',
      'La intención es mantener ese flujo desacoplado del backend principal para que `portfolio-api` no se convierta en CMS ni en orquestador editorial.',
    ].join(' '),
    tags: ['cloud', 'release', 'blog', 'event-driven', 'notifications', 'manifest'],
  },
  {
    sourceType: 'cloud',
    sourceId: 'cloud-operational-criteria',
    title: 'Criterio técnico cloud y deploy',
    text: [
      'El backend principal sigue desplegado en EC2 con Docker por simplicidad operativa.',
      'La automatización nueva del blog se mueve a AWS Lambda y servicios event-driven porque encaja mejor con tareas discretas como procesar releases, generar assets y notificar.',
      'La separación busca balancear pragmatismo, costo y claridad de responsabilidades.',
    ].join(' '),
    tags: ['cloud', 'aws', 'ec2', 'docker', 'lambda', 'pragmatism'],
  },
];
