type ChatFaqSeed = {
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

export const chatFaqSeed: ChatFaqSeed[] = [
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
      'Trabajo principalmente con TypeScript, Angular, Ionic, Node.js, NestJS y MongoDB. También uso TailwindCSS, Capacitor e integración de APIs para construir productos escalables.',
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
      'Tengo más de 3 años y medio de experiencia en Ingertec Argentina como Fullstack Developer, trabajando sobre plataformas reales. También desarrollo proyectos personales fullstack.',
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
];
