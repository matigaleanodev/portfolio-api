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
      'Soy Matías Galeano, Fullstack Developer. Trabajo en aplicaciones en producción, con foco en mantenimiento evolutivo, optimización y experiencia de usuario. En este portfolio muestro proyectos reales, stack y experiencia técnica.',
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
      'Trabajo principalmente con TypeScript, Angular, Ionic, Node.js y NestJS. En proyectos personales uso MongoDB y en mi trabajo en Ingertec también trabajo con MySQL. Además uso TailwindCSS, Capacitor e integración de APIs para construir productos escalables, y me interesa sumar PostgreSQL en el corto plazo.',
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
      'Trabajo con MongoDB en proyectos personales y con MySQL en mi trabajo en Ingertec. Además, tengo interés en trabajar con PostgreSQL en un futuro próximo.',
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
      'Destaco Foodly Notes, un recetario con Ionic + Angular y API NestJS publicado en Play Store; Modo Playa, un catálogo de alojamientos con arquitectura multi-tenant y autenticación; y este portfolio desarrollado con Angular y NestJS. Los tres backends están desplegados en EC2 de AWS.',
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
      'Tengo más de 3 años y medio de experiencia en Ingertec Argentina como Fullstack Developer, trabajando sobre plataformas reales y utilizando MySQL en ese contexto. También desarrollo proyectos personales fullstack, donde uso MongoDB.',
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
      'En experiencia laboral me encargué del desarrollo y evolución de plataformas en producción, mantenimiento evolutivo, optimización de rendimiento y mejoras continuas en frontend y backend. En proyectos personales definí arquitectura, desarrollo fullstack, integración de APIs, autenticación, despliegue en AWS y mantenimiento de las aplicaciones publicadas.',
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
      'En experiencia laboral, uno de los mayores desafíos fue optimizar rendimiento en monitores en tiempo real, históricos y control de objetivos/desvíos dentro de Smartsen sin afectar operación productiva. En proyectos personales, el desafío principal fue diseñar APIs y aplicaciones desacopladas con arquitectura mantenible, autenticación y despliegue en AWS para soportar evolución real (por ejemplo en Modo Playa y Foodly Notes).',
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
      'Estoy abierto a propuestas remotas, a tiempo completo y por tiempo indeterminado. No me interesan proyectos cortos ni trabajos freelance.',
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
