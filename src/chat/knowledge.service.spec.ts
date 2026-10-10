import { KnowledgeService } from './knowledge.service';
import { ChatKnowledgeRepository } from './chat-knowledge.repository';

describe('KnowledgeService', () => {
  it('excluye posts futuros e inválidos aunque lleguen en el artifact remoto o local', async () => {
    const result = await createService({
      projects: [],
      posts: [
        {
          slug: 'published',
          title: 'Blog publicado',
          excerpt: 'Artículo del blog',
          date: '2020-01-01',
        },
        {
          slug: 'scheduled',
          title: 'Blog futuro',
          excerpt: 'Artículo del blog',
          date: '2999-01-01',
        },
        {
          slug: 'invalid',
          title: 'Blog inválido',
          excerpt: 'Artículo del blog',
          date: '2026-02-30',
        },
      ],
    }).getRelevantContext('¿Qué artículos publicaste en el blog?');
    expect(result.some((item) => item.sourceId === 'published')).toBe(true);
    expect(
      result.some((item) => ['scheduled', 'invalid'].includes(item.sourceId)),
    ).toBe(false);
  });
  it.each([
    '¿Dónde trabajás?',
    '¿Quién sos?',
    '¿Qué tecnologías usás?',
    '¿Conocés SQL Server?',
    '¿Qué idiomas hablás?',
    '¿Cómo te contacto?',
    '¿Cuánto cobrás por hora?',
  ])(
    'resuelve el perfil sin acceder al repositorio editorial: %s',
    async (question) => {
      const repository = {
        getKnowledge: jest
          .fn()
          .mockRejectedValue(new Error('R2 no disponible')),
      };
      const service = new KnowledgeService(
        repository as unknown as ChatKnowledgeRepository,
      );
      const result = await service.getRelevantContext(question);
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((item) => item.sourceType === 'profile')).toBe(true);
      expect(repository.getKnowledge).not.toHaveBeenCalled();
    },
  );

  it.each([
    '¿Qué hace Foodly?',
    '¿Qué stack usa ModoPlaya?',
    'Compará Comafi con los proyectos',
    '¿Qué publicaste en el blog?',
  ])(
    'mantiene el error operativo si la consulta necesita contenido editorial: %s',
    async (question) => {
      const repository = {
        getKnowledge: jest
          .fn()
          .mockRejectedValue(new Error('R2 no disponible')),
      };
      const service = new KnowledgeService(
        repository as unknown as ChatKnowledgeRepository,
      );
      await expect(service.getRelevantContext(question)).rejects.toThrow(
        'R2 no disponible',
      );
    },
  );
  it.each([
    '¿Dónde trabajás?',
    'donde trabajas?',
    '¿En qué empresa laburás?',
    '¿No trabaja en Comafi?',
  ])(
    'prioriza el empleo actual frente a contenido editorial: %s',
    async (question) => {
      const result = await createService({
        projects: [],
        posts: Array.from({ length: 8 }, (_, index) => ({
          slug: `post-${index}`,
          title: question,
          excerpt: question,
        })),
      }).getRelevantContext(question);
      expect(result[0]?.sourceId).toBe('main-experience');
      expect(result[0]?.text).toContain('Banco Comafi a través de Boreal IT');
    },
  );

  it.each([
    '¿Tenés experiencia con SQL Server?',
    '¿Conocés PostgreSQL en RDS y Aurora?',
    '¿Trabajás con DynamoDB?',
    '¿Usás colas SQS?',
    '¿Tenés experiencia con AWS CDK y Lambda?',
  ])(
    'recupera conocimientos profesionales sin confundirlos con el portfolio: %s',
    async (question) => {
      const result = await createService({
        projects: [],
        posts: [],
      }).getRelevantContext(question);
      expect(result[0]?.sourceId).toMatch(/^main-(databases|aws)$/);
      expect(result.every((item) => item.sourceType === 'profile')).toBe(true);
    },
  );

  it('recupera el empleo para una referencia conversacional', async () => {
    const result = await createService({
      projects: [],
      posts: [],
    }).getRelevantContext('¿Y qué hacés ahí?', [
      { role: 'user', content: '¿Trabajás en Comafi?' },
    ]);
    expect(result[0]?.sourceId).toBe('main-experience');
  });

  it.each([
    ['¿Se maneja en inglés?', 'main-career-preferences', 'inglés técnico'],
    ['¿Cómo lo contacto por correo?', 'main-contact', 'formulario'],
  ])(
    'recupera hechos profesionales fuera de una FAQ exacta: %s',
    async (question, id, fact) => {
      const result = await createService({
        projects: [],
        posts: [],
      }).getRelevantContext(question);
      expect(result[0]?.sourceId).toBe(id);
      expect(result[0]?.text).toContain(fact);
    },
  );

  it('no usa conocimientos personales para atribuir SQL Server a Foodly', async () => {
    const result = await createService({
      projects: [
        {
          slug: 'foodly-notes',
          title: 'Foodly Notes',
          excerpt: 'Recetas con MongoDB',
        },
      ],
      posts: [],
    }).getRelevantContext('¿Foodly usa SQL Server y AWS CDK?');
    expect(result[0]?.sourceId).toBe('foodly-notes');
    expect(result.some((item) => item.sourceType === 'profile')).toBe(false);
  });

  it.each(['¿Qué tecnologías usa?', '¿Cómo funciona?', '¿Y el backend?'])(
    'recupera el proyecto reciente en una repregunta implícita: %s',
    async (question) => {
      const result = await createService({
        projects: [
          {
            slug: 'modo-playa',
            title: 'Modo Playa',
            excerpt: 'Alojamientos con Angular y NestJS',
          },
        ],
        posts: [],
      }).getRelevantContext(question, [
        { role: 'user', content: 'Contame de Modo Playa' },
        {
          role: 'assistant',
          content: 'Modo Playa es una plataforma de alojamientos.',
        },
      ]);
      expect(result[0]?.sourceId).toBe('modo-playa');
      expect(result.some((item) => item.sourceId === 'main-stack')).toBe(false);
    },
  );

  it('mantiene el tema cuando la última respuesta no repite el nombre del proyecto', async () => {
    const result = await createService({
      projects: [
        { slug: 'modo-playa', title: 'Modo Playa', excerpt: 'Alojamientos' },
      ],
      posts: [],
    }).getRelevantContext('¿Y el backend?', [
      { role: 'user', content: 'Contame de Modo Playa' },
      { role: 'assistant', content: 'Es una plataforma de alojamientos.' },
      { role: 'user', content: '¿Qué tecnologías usa?' },
      { role: 'assistant', content: 'Usa Angular y NestJS.' },
    ]);
    expect(result[0]?.sourceId).toBe('modo-playa');
  });

  it('la repregunta sigue al último proyecto aunque la pregunta anterior tenga usa', async () => {
    const result = await createService({
      projects: [
        { slug: 'modo-playa', title: 'Modo Playa', excerpt: 'Alojamientos' },
        { slug: 'foodly-notes', title: 'Foodly Notes', excerpt: 'Recetas' },
      ],
      posts: [],
    }).getRelevantContext('¿Y el backend?', [
      { role: 'user', content: 'Contame de Modo Playa' },
      { role: 'assistant', content: 'Es una plataforma de alojamientos.' },
      { role: 'user', content: '¿Qué tecnologías usa Foodly?' },
      { role: 'assistant', content: 'Usa Angular y NestJS.' },
    ]);
    expect(result[0]?.sourceId).toBe('foodly-notes');
  });

  it('conserva los proyectos para una referencia ordinal explícita', async () => {
    const result = await createService({
      projects: [
        { slug: 'foodly-notes', title: 'Foodly Notes', excerpt: 'Recetas' },
        { slug: 'modo-playa', title: 'Modo Playa', excerpt: 'Alojamientos' },
      ],
      posts: [],
    }).getRelevantContext('Del segundo proyecto, ¿cómo funciona el backend?', [
      { role: 'user', content: 'Compará Foodly Notes y Modo Playa' },
      { role: 'assistant', content: 'Primero recetas y después alojamientos.' },
    ]);
    expect(result.map((item) => item.sourceId)).toEqual(
      expect.arrayContaining(['foodly-notes', 'modo-playa']),
    );
  });

  it('una referencia sigue el cambio más reciente hacia el empleo', async () => {
    const repository = { getKnowledge: jest.fn() };
    const result = await new KnowledgeService(
      repository as unknown as ChatKnowledgeRepository,
    ).getRelevantContext('¿Y qué hacés ahí?', [
      { role: 'user', content: 'Contame de Modo Playa' },
      {
        role: 'assistant',
        content: 'Modo Playa es una plataforma de alojamientos.',
      },
      { role: 'user', content: '¿Trabajás en Comafi?' },
      { role: 'assistant', content: 'Sí, en Banco Comafi.' },
    ]);
    expect(result[0]?.sourceId).toBe('main-experience');
    expect(repository.getKnowledge).not.toHaveBeenCalled();
  });

  it('una consulta explícita nueva reemplaza el proyecto anterior', async () => {
    const result = await createService({
      projects: [
        { slug: 'modo-playa', title: 'Modo Playa', excerpt: 'Alojamientos' },
        { slug: 'foodly-notes', title: 'Foodly Notes', excerpt: 'Recetas' },
      ],
      posts: [],
    }).getRelevantContext('¿Qué tecnologías usa Foodly?', [
      {
        role: 'assistant',
        content: 'Modo Playa es una plataforma de alojamientos.',
      },
    ]);
    expect(result[0]?.sourceId).toBe('foodly-notes');
  });

  it('una pregunta personal conserva el perfil tras hablar de un proyecto', async () => {
    const repository = { getKnowledge: jest.fn() };
    const service = new KnowledgeService(
      repository as unknown as ChatKnowledgeRepository,
    );
    const result = await service.getRelevantContext('¿Qué tecnologías usás?', [
      {
        role: 'assistant',
        content: 'Modo Playa es una plataforma de alojamientos.',
      },
    ]);
    expect(result[0]?.sourceId).toBe('main-stack');
    expect(repository.getKnowledge).not.toHaveBeenCalled();
  });

  it('conserva entidades del historial para una referencia sin keywords de dominio', async () => {
    const service = createService({
      projects: [
        { slug: 'foodly-notes', title: 'Foodly Notes', excerpt: 'Recetas' },
      ],
      posts: [],
    });
    const result = await service.getRelevantContext('¿Y el otro?', [
      { role: 'assistant', content: 'Foodly Notes' },
    ]);
    expect(result[0]?.sourceId).toBe('foodly-notes');
  });
  it('prioriza contacto en una consulta comercial aunque el historial trate de proyectos', async () => {
    const service = createService({ projects: [], posts: [] });
    const result = await service.getRelevantContext(
      '¿Matías puede empezar mañana y cuánto cobra por hora?',
      [
        {
          role: 'assistant',
          content: 'Foodly Notes y Modo Playa: Angular, NestJS, AWS, Docker',
        },
      ],
    );
    expect(result[0]?.sourceId).toBe('main-contact');
    expect(result[0]?.text).toContain('formulario');
  });
  it.each([
    'Compará Foodly y ModoPlaya: stack y publicación',
    'MODO PLAYA y FÓODLY: qué hace cada uno',
  ])(
    'incluye ambos proyectos antes de aplicar el límite: %s',
    async (question) => {
      const service = createService({
        generatedAt: '2026-10-09T00:00:00Z',
        projects: [
          { slug: 'foodly-notes', title: 'Foodly Notes', excerpt: 'Recetas' },
          { slug: 'modo-playa', title: 'Modo Playa', excerpt: 'Alojamientos' },
        ],
        posts: Array.from({ length: 8 }, (_, index) => ({
          slug: `post-${index}`,
          title: question,
          excerpt: question,
          date: '2026-10-09',
        })),
      });
      const result = await service.getRelevantContext(question);
      expect(result.slice(0, 2).map((item) => item.sourceId)).toEqual([
        'foodly-notes',
        'modo-playa',
      ]);
    },
  );

  it('usa la ubicación actual sin recurrir a posts históricos', async () => {
    const result = await createService({
      projects: [],
      posts: [],
    }).getRelevantContext('perfil fullstack');
    expect(result.map((item) => item.text).join(' ')).toContain('Villa Gesell');
    expect(result.map((item) => item.text).join(' ')).not.toContain('Posadas');
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('prioriza el artifact editorial cuando coincide mejor con la pregunta', async () => {
    const service = createService({
      generatedAt: new Date().toISOString(),
      projects: [
        {
          slug: 'foodly-notes',
          title: 'Foodly Notes',
          excerpt: 'App de recetas publicada en Google Play Store.',
          stack: ['Angular', 'Ionic', 'NestJS'],
          links: [
            {
              label: 'Play Store',
              url: 'https://play.google.com/store/apps/details?id=io.example',
            },
          ],
          highlights: ['Publicada en Google Play Store.'],
          searchText: 'foodly notes play store angular ionic nestjs',
        },
      ],
      posts: [],
    });
    const result = await service.getRelevantContext(
      'publicaste alguna app en play store',
    );

    expect(result[0]).toEqual(
      expect.objectContaining({
        sourceType: 'project',
        sourceId: 'foodly-notes',
      }),
    );
  });

  it('responde con conocimiento curado local cuando el artifact editorial esta vacio', async () => {
    const service = createService({
      generatedAt: new Date().toISOString(),
      projects: [],
      posts: [],
    });
    const result = await service.getRelevantContext(
      'como esta armado el ecosistema de portfolio cloud',
    );

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceType: 'cloud',
          sourceId: 'cloud-ecosystem',
        }),
      ]),
    );
  });

  it('incluye posts del blog dentro del conocimiento editorial', async () => {
    const service = createService({
      generatedAt: new Date().toISOString(),
      projects: [],
      posts: [
        {
          slug: 'desplegar-apis-docker-ec2',
          title: 'Cómo desplegar APIs con Docker en un EC2',
          excerpt: 'Post sobre deploy de APIs NestJS con Docker y EC2.',
          date: '2026-03-02',
          tags: ['docker', 'aws', 'ec2'],
          canonicalUrl:
            'https://matiasgaleano.dev/blog/desplegar-apis-docker-ec2',
          summary:
            'Explica el criterio operativo para deploy con Docker Compose.',
          searchText: 'docker aws ec2 deploy compose portfolio api',
        },
      ],
    });
    const result = await service.getRelevantContext(
      'escribiste algo sobre docker en ec2',
    );

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceType: 'post',
          sourceId: 'desplegar-apis-docker-ec2',
        }),
      ]),
    );
  });

  it('prioriza conocimiento cloud cuando la pregunta apunta a lambdas y serverless', async () => {
    const service = createService({
      generatedAt: new Date().toISOString(),
      projects: [],
      posts: [],
    });
    const result = await service.getRelevantContext(
      'como resolviste lambdas y serverless en portfolio cloud',
    );

    expect(result[0]).toEqual(
      expect.objectContaining({
        sourceType: 'cloud',
      }),
    );
  });
});

function createService(payload: Record<string, unknown>): KnowledgeService {
  const repository = {
    getKnowledge: jest.fn().mockResolvedValue(payload),
  } as unknown as ChatKnowledgeRepository;

  return new KnowledgeService(repository);
}
