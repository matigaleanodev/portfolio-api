import { KnowledgeService } from './knowledge.service';
import { ChatKnowledgeRepository } from './chat-knowledge.repository';

describe('KnowledgeService', () => {
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
