export type ChatSystemEntryKey =
  | 'out_of_scope'
  | 'fallback'
  | 'starter_fallback'
  | 'ai_seed'
  | 'ai_fallback';

type ChatFaqSeedEntry = {
  question: string;
  answer: string;
  aliases: string[];
  tags: string[];
  isStarterCandidate: boolean;
  isFixedStarter: boolean;
  suggestedQuestions: string[];
  active: boolean;
  usageCount: number;
  starterPriority: number;
};

export type ChatFaqEntry = ChatFaqSeedEntry & {
  id: string;
};

const CHAT_FAQ_SEED: readonly ChatFaqSeedEntry[] = [
  {
    question: '¿Quién sos y a qué te dedicás?',
    answer:
      'Soy Matías Galeano, Fullstack Product Developer. Trabajo en aplicaciones web y móviles en producción y me muevo bastante parejo entre frontend, backend, cloud y arquitectura. En este portfolio muestro proyectos reales, stack y experiencia técnica.',
    aliases: [
      'quien sos',
      'a que te dedicas',
      'presentate',
      'contame sobre vos',
    ],
    tags: ['profile'],
    isStarterCandidate: true,
    isFixedStarter: true,
    suggestedQuestions: [
      '¿Qué tecnologías usás?',
      '¿Qué proyecto destacás de tu portfolio?',
      '¿Cuál es tu experiencia laboral?',
      '¿Cómo puedo contactarte?',
    ],
    active: true,
    usageCount: 0,
    starterPriority: 1,
  },
  {
    question: '¿Qué tecnologías usás?',
    answer:
      'Trabajo principalmente con TypeScript, Angular, Ionic, Node.js y NestJS. Hoy en el laburo estoy con Angular en frontend, un backend híbrido entre monolito NestJS y microservicios en AWS Lambda, PostgreSQL como base de datos y herramientas como Docker, GitHub Actions, EC2, ECS, ECR, S3, CloudFront, CloudWatch y Cloudflare R2.',
    aliases: ['que tecnologias usas', 'stack', 'stack tecnico', 'herramientas'],
    tags: ['skills'],
    isStarterCandidate: true,
    isFixedStarter: true,
    suggestedQuestions: [
      '¿Qué proyecto hiciste con ese stack?',
      '¿Usás NestJS en producción?',
      '¿Qué tipo de proyectos construiste con ese stack?',
      '¿Qué base de datos usás además de MongoDB?',
    ],
    active: true,
    usageCount: 0,
    starterPriority: 2,
  },
  {
    question: '¿Qué bases de datos usás?',
    answer:
      'Actualmente trabajo con PostgreSQL en mi rol en Boreal IT para Banco Comafi. Además usé MySQL en mi etapa en Ingertec y MongoDB en proyectos personales.',
    aliases: [
      'que base de datos usas',
      'que bases de datos usas',
      'con que base de datos trabajas',
      'con que bases de datos trabajas',
      'base de datos',
      'bd que usas',
    ],
    tags: ['skills', 'experience'],
    isStarterCandidate: false,
    isFixedStarter: false,
    suggestedQuestions: [
      '¿Qué tecnologías usás?',
      '¿Cuál es tu experiencia laboral?',
      '¿Qué responsabilidades tuviste?',
      '¿Qué proyecto destacás?',
    ],
    active: true,
    usageCount: 0,
    starterPriority: 0,
  },
  {
    question: '¿Qué proyecto destacás?',
    answer:
      'Destaco Foodly Notes, un recetario con Ionic + Angular y API NestJS publicado en Play Store; Modo Playa, un catálogo de alojamientos con backend multi-tenant en NestJS; y este portfolio con arquitectura static-first, chatbot contextual y automatización serverless en AWS. Son los proyectos que mejor muestran cómo mezclo frontend, backend y cloud dentro del mismo ecosistema.',
    aliases: ['proyecto destacado', 'mejor proyecto', 'proyectos'],
    tags: ['projects'],
    isStarterCandidate: true,
    isFixedStarter: false,
    suggestedQuestions: [
      '¿Qué tecnologías usaste en ese proyecto?',
      '¿Qué desafío técnico resolviste?',
      '¿Cuál fue tu rol en ese proyecto?',
      '¿Cómo funciona el chatbot del portfolio?',
    ],
    active: true,
    usageCount: 0,
    starterPriority: 3,
  },
  {
    question: '¿Cuál es tu experiencia laboral?',
    answer:
      'Tengo cerca de cuatro años de experiencia trabajando con software en producción. Estuve en Ingertec Argentina hasta abril de 2026 como Fullstack Developer y desde entonces trabajo en Boreal IT para Banco Comafi, en un producto de Fondos Comunes de Inversión con Angular en frontend, backend híbrido entre monolito NestJS y microservicios AWS Lambda, y PostgreSQL.',
    aliases: ['experiencia laboral', 'trayectoria', 'experiencia'],
    tags: ['experience'],
    isStarterCandidate: true,
    isFixedStarter: false,
    suggestedQuestions: [
      '¿Qué responsabilidades tuviste?',
      '¿Qué tecnologías usaste en esos roles?',
      '¿En qué tipo de proyectos trabajaste?',
      '¿Cuál fue tu experiencia más reciente?',
    ],
    active: true,
    usageCount: 0,
    starterPriority: 4,
  },
  {
    question: '¿Qué responsabilidades tuviste?',
    answer:
      'En lo laboral me tocó desarrollar y hacer evolucionar plataformas en producción, integrar APIs REST, mantener funcionalidades vivas y meter mejoras continuas en frontend y backend. Hoy eso incluye Angular, backend NestJS, microservicios en AWS Lambda y PostgreSQL; en proyectos personales también me encargo de arquitectura, despliegues containerizados, automatización cloud, CI/CD y operación.',
    aliases: [
      'que responsabilidades tuviste',
      'cuales fueron tus responsabilidades',
      'que responsabilidades tenias',
      'responsabilidades en proyectos',
      'responsabilidades en experiencia laboral',
      'cual fue tu rol en los proyectos',
    ],
    tags: ['experience', 'projects'],
    isStarterCandidate: false,
    isFixedStarter: false,
    suggestedQuestions: [
      '¿Cuál fue el mayor desafío técnico?',
      '¿Qué tecnologías usaste en esos roles?',
      '¿Qué proyecto destacás?',
      '¿Cuál es tu experiencia laboral?',
    ],
    active: true,
    usageCount: 0,
    starterPriority: 0,
  },
  {
    question: '¿Cuál fue el mayor desafío técnico?',
    answer:
      'En lo laboral, uno de los mayores desafíos fue trabajar sobre productos reales sin romper operación: primero optimizando rendimiento en Smartsen y hoy moviéndome sobre un esquema híbrido entre monolito NestJS, microservicios AWS Lambda y PostgreSQL en un producto financiero. En proyectos personales, el desafío principal fue diseñar arquitecturas desacopladas con APIs, despliegues en AWS, automatización serverless y flujos mantenibles entre frontend, backend y cloud.',
    aliases: [
      'cual fue el mayor desafio tecnico',
      'que desafio tecnico resolviste',
      'desafio tecnico en proyectos',
      'desafio tecnico en experiencia laboral',
      'problema tecnico mas complejo',
      'reto tecnico mas grande',
    ],
    tags: ['experience', 'projects', 'achievements'],
    isStarterCandidate: false,
    isFixedStarter: false,
    suggestedQuestions: [
      '¿Qué responsabilidades tuviste?',
      '¿Qué proyecto destacás?',
      '¿Qué tecnologías usás?',
      '¿Cuál es tu experiencia laboral?',
    ],
    active: true,
    usageCount: 0,
    starterPriority: 0,
  },
  {
    question: '¿Qué tipo de propuestas te interesan?',
    answer:
      'Me interesan principalmente roles fullstack orientados a producto, donde frontend, backend y cloud tengan peso real. Busco propuestas remotas, full-time y de largo plazo; no me interesan proyectos cortos ni laburo freelance.',
    aliases: [
      'tipo de propuestas',
      'que propuestas te interesan',
      'disponibilidad laboral',
      'busqueda laboral',
    ],
    tags: ['profile', 'career'],
    isStarterCandidate: true,
    isFixedStarter: false,
    suggestedQuestions: [
      '¿Cuál es tu experiencia laboral?',
      '¿Qué tecnologías usás?',
      '¿Qué proyecto destacás?',
      '¿Cómo puedo contactarte?',
    ],
    active: true,
    usageCount: 0,
    starterPriority: 6,
  },
  {
    question: '¿Qué idiomas manejás?',
    answer:
      'Español nativo e inglés técnico para documentación, desarrollo y trabajo diario.',
    aliases: ['idiomas', 'idioma', 'ingles', 'english'],
    tags: ['profile'],
    isStarterCandidate: true,
    isFixedStarter: false,
    suggestedQuestions: [
      '¿Qué tipo de propuestas te interesan?',
      '¿Cuál es tu experiencia laboral?',
      '¿Qué tecnologías usás?',
      '¿Cómo puedo contactarte?',
    ],
    active: true,
    usageCount: 0,
    starterPriority: 7,
  },
  {
    question: '¿Cómo puedo contactarte?',
    answer:
      'Podés contactarme desde el formulario del portfolio en matiasgaleano.dev o mediante los enlaces profesionales publicados en el sitio.',
    aliases: ['contacto', 'como te contacto', 'email', 'redes'],
    tags: ['profile'],
    isStarterCandidate: true,
    isFixedStarter: false,
    suggestedQuestions: [
      '¿Qué tipo de proyectos te interesan?',
      '¿Qué tecnologías usás?',
      '¿Qué proyecto destacás?',
      '¿Cuál es tu experiencia laboral?',
    ],
    active: true,
    usageCount: 0,
    starterPriority: 5,
  },
  {
    question: '__system_out_of_scope__',
    answer:
      'Solo puedo ayudar con preguntas sobre el portfolio, proyectos y experiencia de Matias Galeano. Podés consultarme por su stack, Foodly Notes, Modo Playa o su arquitectura backend con NestJS.',
    aliases: [],
    tags: ['system', 'system:out_of_scope'],
    isStarterCandidate: false,
    isFixedStarter: false,
    suggestedQuestions: [
      '¿Qué tecnologías usás actualmente?',
      '¿Qué proyecto destacás de tu portfolio?',
      '¿Cómo construiste el chatbot del portfolio?',
      '¿Cuál fue tu experiencia más reciente?',
    ],
    active: true,
    usageCount: 0,
    starterPriority: 0,
  },
  {
    question: '__system_fallback__',
    answer:
      'No tengo esa información disponible en el portfolio por ahora. Si querés, podés preguntarme sobre proyectos, tecnologías o experiencia.',
    aliases: [],
    tags: ['system', 'system:fallback'],
    isStarterCandidate: false,
    isFixedStarter: false,
    suggestedQuestions: [
      '¿Qué tecnologías usás?',
      '¿Qué proyecto destacás de tu portfolio?',
      '¿Cuál fue tu experiencia más reciente?',
      '¿Cómo puedo contactarte?',
    ],
    active: true,
    usageCount: 0,
    starterPriority: 0,
  },
  {
    question: '__system_starter_fallback__',
    answer: 'Fallback para starters',
    aliases: [],
    tags: ['system', 'system:starter_fallback'],
    isStarterCandidate: false,
    isFixedStarter: false,
    suggestedQuestions: [
      '¿Quién sos y a qué te dedicás?',
      '¿Qué tecnologías usás?',
      '¿Qué proyecto destacás de tu portfolio?',
      '¿Cuál fue tu experiencia más reciente?',
    ],
    active: true,
    usageCount: 0,
    starterPriority: 0,
  },
  {
    question: '__system_ai_seed__',
    answer: 'Sugerencias semilla para respuestas de AI',
    aliases: [],
    tags: ['system', 'system:ai_seed'],
    isStarterCandidate: false,
    isFixedStarter: false,
    suggestedQuestions: [
      '¿Qué tecnologías usaste en ese proyecto?',
      '¿Cuál fue el mayor desafío técnico?',
      '¿Qué rol tuviste en ese proyecto?',
      '¿Qué otros proyectos similares tenés?',
    ],
    active: true,
    usageCount: 0,
    starterPriority: 0,
  },
  {
    question: '__system_ai_fallback__',
    answer: 'Sugerencias fallback para respuestas de AI',
    aliases: [],
    tags: ['system', 'system:ai_fallback'],
    isStarterCandidate: false,
    isFixedStarter: false,
    suggestedQuestions: [
      '¿Qué proyecto destacás de tu portfolio?',
      '¿Qué tecnologías usás actualmente?',
      '¿Cuál fue tu experiencia más reciente?',
      '¿En qué tipo de proyectos te especializás?',
    ],
    active: true,
    usageCount: 0,
    starterPriority: 0,
  },
];

function normalizeFaqId(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

export const CHAT_FAQ_ITEMS: readonly ChatFaqEntry[] = CHAT_FAQ_SEED.map(
  (entry) => ({
    ...entry,
    id: normalizeFaqId(entry.question),
  }),
);
