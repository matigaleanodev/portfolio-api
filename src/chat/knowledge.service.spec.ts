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
