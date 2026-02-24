import { KnowledgeContextItem } from '../chat/chat.types';

export type ProfileContextSeedDocument = KnowledgeContextItem & {
  readonly active: boolean;
};

export const profileContextSeed: readonly ProfileContextSeedDocument[] = [
  {
    sourceType: 'profile',
    sourceId: 'main-profile',
    title: 'Perfil profesional',
    text: [
      'Nombre: Matías Galeano.',
      'Origen: Posadas, Misiones, Argentina.',
      'Rol: Fullstack Developer con foco en productos digitales.',
      'Experiencia actual: más de 3 años y medio en Ingertec Argentina.',
      'Objetivo del portfolio: mostrar proyectos reales, experiencia y stack técnico.',
      'Sitio principal: matiasgaleano.dev.',
    ].join(' '),
    tags: ['profile', 'fullstack', 'ingertec', 'posadas', 'misiones'],
    active: true,
  },
  {
    sourceType: 'profile',
    sourceId: 'main-origin',
    title: 'Origen',
    text: [
      'Soy de Posadas, Misiones, Argentina.',
      'Como curiosidad, Misiones es conocida por las Cataratas del Iguazú.',
    ].join(' '),
    tags: ['profile', 'origin', 'posadas', 'misiones', 'argentina'],
    active: true,
  },
  {
    sourceType: 'profile',
    sourceId: 'main-stack',
    title: 'Stack principal',
    text: [
      'Stack principal: TypeScript, Angular, Ionic, Node.js, NestJS y MongoDB.',
      'Tecnologías complementarias: TailwindCSS, Capacitor e integración de APIs.',
      'Enfoque en código mantenible, estructura clara y productos listos para producción.',
    ].join(' '),
    tags: ['skills', 'typescript', 'angular', 'ionic', 'nestjs', 'mongodb'],
    active: true,
  },
  {
    sourceType: 'profile',
    sourceId: 'main-experience',
    title: 'Experiencia laboral',
    text: [
      'Más de 3 años y medio en Ingertec Argentina como Fullstack Developer.',
      'Trabajo en desarrollo y evolución de plataformas reales de monitoreo, gestión y control.',
      'Experiencia en mantenimiento evolutivo, optimización de rendimiento y mejora continua.',
    ].join(' '),
    tags: ['experience', 'ingertec', 'fullstack'],
    active: true,
  },
  {
    sourceType: 'profile',
    sourceId: 'main-projects',
    title: 'Proyectos del portfolio',
    text: [
      'Portfolio actual: aplicación con Angular + TailwindCSS y API NestJS con MongoDB.',
      'Foodly Notes: recetario con Angular/Ionic y API NestJS, con favoritos y listas, publicado en Google Play Store.',
      'Modo Playa: suite con API NestJS multi-tenant con autenticación y panel admin Angular/Ionic.',
      'Los backends de Portfolio, Foodly Notes y Modo Playa están desplegados en EC2 de AWS.',
    ].join(' '),
    tags: ['projects', 'portfolio', 'foodly-notes', 'modo-playa'],
    active: true,
  },
  {
    sourceType: 'profile',
    sourceId: 'main-repos',
    title: 'Repositorios públicos relevantes',
    text: [
      'Repositorios principales: portfolio, portfolio-api, foodly-notes, foodly-notes-api, modo-playa-admin, modo-playa-api y modo-playa-app.',
      'Los proyectos muestran aplicaciones y APIs desacopladas con arquitectura real de producción.',
      'El portfolio incluye chatbot para responder sobre experiencia, stack y proyectos.',
    ].join(' '),
    tags: ['projects', 'github', 'portfolio'],
    active: true,
  },
  {
    sourceType: 'profile',
    sourceId: 'main-devops',
    title: 'Experiencia en infraestructura y DevOps',
    text: [
      'Experiencia desplegando aplicaciones en AWS utilizando ECS, EC2, ECR y S3.',
      'Uso de Docker y Docker Compose para orquestación de contenedores.',
      'Configuración de Traefik como reverse proxy con certificados SSL automáticos.',
      'Implementación de pipelines CI/CD con GitHub Actions para build, test y deploy automático.',
      'Arquitectura cloud orientada a producción con múltiples APIs desplegadas en entornos reales.',
      'Backends de Portfolio, Foodly Notes y Modo Playa desplegados en EC2 de AWS.',
    ].join(' '),
    tags: ['devops', 'aws', 'docker', 'github-actions', 'ci-cd', 'cloud'],
    active: true,
  },
  {
    sourceType: 'profile',
    sourceId: 'main-goals',
    title: 'Objetivos profesionales',
    text: [
      'Interés en roles Fullstack Developer en modalidad remota, tiempo completo y por tiempo indeterminado.',
      'No me interesan propuestas de proyectos cortos ni trabajos freelance.',
      'No tengo preferencia por tipo de producto o industria, mientras exista una filosofía orientada a producto y arquitectura escalable.',
      'Interés en seguir desarrollándose en cloud, DevOps y sistemas distribuidos.',
    ].join(' '),
    tags: ['career', 'goals', 'work', 'opportunities', 'remote', 'full-time'],
    active: true,
  },
  {
    sourceType: 'profile',
    sourceId: 'main-languages',
    title: 'Idiomas',
    text: [
      'Idioma principal: español nativo.',
      'Nivel de inglés: inglés técnico para documentación, desarrollo y trabajo diario.',
    ].join(' '),
    tags: ['languages', 'spanish', 'english'],
    active: true,
  },
  {
    sourceType: 'profile',
    sourceId: 'main-achievements',
    title: 'Logros destacados',
    text: [
      'En Ingertec optimicé el rendimiento del sistema Smartsen en monitores de tiempo real, históricos y control de objetivos y desvíos.',
      'También inicié una alternativa para crear aplicaciones en base a Ionic, definiendo una estructura clara, escalable y mantenible.',
      'Esa base mejoró el alcance de varios sistemas como Smart IOT, Consejar y GeonTracker.',
    ].join(' '),
    tags: ['achievements', 'ingertec', 'ionic', 'performance', 'smartsen'],
    active: true,
  },
  {
    sourceType: 'profile',
    sourceId: 'main-strengths',
    title: 'Fortalezas profesionales',
    text: [
      'Enfoque en código mantenible y arquitectura clara.',
      'Capacidad para trabajar en sistemas reales en producción.',
      'Experiencia integrando interfaces, APIs y despliegue cloud.',
      'Orientación a resolver problemas prácticos y mejorar productos existentes.',
    ].join(' '),
    tags: ['strengths', 'skills', 'experience'],
    active: true,
  },
  {
    sourceType: 'profile',
    sourceId: 'main-practices',
    title: 'Prácticas y metodologías',
    text: [
      'Experiencia en testing unitario con Jest y Jasmine.',
      'Uso de CI/CD con GitHub Actions.',
      'Trabajo con Gitflow y buenas prácticas de versionado.',
      'Enfoque en desarrollo iterativo y mantenimiento evolutivo.',
    ].join(' '),
    tags: ['testing', 'ci-cd', 'git', 'practices'],
    active: true,
  },
  {
    sourceType: 'profile',
    sourceId: 'main-contact',
    title: 'Contacto profesional',
    text: [
      'Portfolio: https://matiasgaleano.dev.',
      'GitHub: https://github.com/matigaleanodev.',
      'LinkedIn: https://www.linkedin.com/in/matias-galeano-dev.',
      'Para contacto directo se puede usar el formulario disponible en el portfolio.',
    ].join(' '),
    tags: ['contact', 'linkedin', 'github', 'portfolio'],
    active: true,
  },
];
