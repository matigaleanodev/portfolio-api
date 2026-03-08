import { KnowledgeContextItem } from '../chat.types';

export const PROFILE_KNOWLEDGE_ITEMS: readonly KnowledgeContextItem[] = [
  {
    sourceType: 'profile',
    sourceId: 'main-profile',
    title: 'Perfil profesional',
    text: [
      'Matías Galeano es Fullstack Developer de Posadas, Misiones, Argentina.',
      'Su foco está en productos digitales reales, arquitectura mantenible y evolución continua.',
      'El portfolio actual busca mostrar experiencia, proyectos, decisiones técnicas y contenido editorial propio.',
    ].join(' '),
    tags: ['profile', 'fullstack', 'portfolio', 'matias-galeano'],
  },
  {
    sourceType: 'profile',
    sourceId: 'main-stack',
    title: 'Stack principal',
    text: [
      'Stack principal: TypeScript, Angular, Ionic, Node.js y NestJS.',
      'Experiencia con MongoDB en proyectos personales, MySQL en contexto laboral y fuerte interés en profundizar cloud, arquitectura y automatización.',
      'Tecnologías complementarias frecuentes: TailwindCSS, Docker, GitHub Actions y APIs HTTP.',
    ].join(' '),
    tags: [
      'skills',
      'typescript',
      'angular',
      'ionic',
      'nestjs',
      'mongodb',
      'mysql',
      'docker',
      'github-actions',
    ],
  },
  {
    sourceType: 'profile',
    sourceId: 'main-experience',
    title: 'Experiencia laboral',
    text: [
      'Tiene más de tres años y medio de experiencia en Ingertec Argentina como Fullstack Developer.',
      'Trabaja en plataformas reales de monitoreo, gestión y control, con mantenimiento evolutivo, mejoras de rendimiento y evolución funcional.',
    ].join(' '),
    tags: ['experience', 'ingertec', 'fullstack', 'product'],
  },
  {
    sourceType: 'profile',
    sourceId: 'main-strengths',
    title: 'Fortalezas profesionales',
    text: [
      'Se enfoca en soluciones simples, mantenibles y listas para producción.',
      'Suele diseñar fronteras claras entre frontend, backend y automatización cloud.',
      'Prioriza decisiones técnicas defendibles antes que complejidad innecesaria.',
    ].join(' '),
    tags: ['strengths', 'architecture', 'maintainability', 'production'],
  },
  {
    sourceType: 'profile',
    sourceId: 'main-contact',
    title: 'Contacto profesional',
    text: [
      'El contacto principal se realiza desde el formulario del portfolio en matiasgaleano.dev.',
      'También mantiene presencia pública en GitHub y LinkedIn.',
    ].join(' '),
    tags: ['contact', 'portfolio', 'github', 'linkedin'],
    links: [
      { label: 'Portfolio', url: 'https://matiasgaleano.dev' },
      { label: 'GitHub', url: 'https://github.com/matigaleanodev' },
      {
        label: 'LinkedIn',
        url: 'https://www.linkedin.com/in/matias-galeano-dev',
      },
    ],
  },
];
