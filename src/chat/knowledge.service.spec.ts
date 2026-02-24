import { Test } from '@nestjs/testing';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Project } from '../projects/projects.schema';
import { KnowledgeService } from './knowledge.service';

describe('KnowledgeService', () => {
  let service: KnowledgeService;

  const execMock = jest.fn();
  const leanMock = jest.fn(() => ({ exec: execMock }));
  const limitMock = jest.fn(() => ({ lean: leanMock }));
  const sortMock = jest.fn(() => ({ limit: limitMock }));
  const findProjectsMock = jest.fn(() => ({ sort: sortMock }));

  const projectModelMock = {
    find: findProjectsMock,
  };

  const toArrayMock = jest.fn();
  const profileLimitMock = jest.fn(() => ({ toArray: toArrayMock }));
  const profileFindMock = jest.fn(() => ({ limit: profileLimitMock }));
  const collectionMock = jest.fn(() => ({ find: profileFindMock }));

  const connectionMock = {
    collection: collectionMock,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        KnowledgeService,
        { provide: getModelToken(Project.name), useValue: projectModelMock },
        { provide: getConnectionToken(), useValue: connectionMock },
      ],
    }).compile();

    service = moduleRef.get(KnowledgeService);
  });

  it('prioriza contexto de profile_context cuando coincide mejor con la pregunta', async () => {
    execMock.mockResolvedValue([
      {
        _id: '1',
        name: 'Portfolio',
        description: 'API con contacto y proyectos',
        technologies: ['NestJS', 'MongoDB'],
      },
    ]);
    toArrayMock.mockResolvedValue([
      {
        sourceType: 'profile',
        sourceId: 'main-projects',
        title: 'Proyectos del portfolio',
        text: 'Foodly Notes está publicado en Google Play Store.',
        tags: ['foodly-notes', 'play', 'store'],
      },
    ]);

    const result = await service.getRelevantContext(
      'publicaste alguna app en play store',
    );

    expect(result[0]).toEqual(
      expect.objectContaining({
        sourceType: 'profile',
        sourceId: 'main-projects',
      }),
    );
  });

  it('devuelve fallback de contexto cuando no hay matches', async () => {
    execMock.mockResolvedValue([
      {
        _id: '1',
        name: 'Portfolio',
        description: 'Sitio personal',
        technologies: ['Angular'],
      },
      {
        _id: '2',
        name: 'Foodly Notes',
        description: 'Recetario',
        technologies: ['Ionic'],
      },
      {
        _id: '3',
        name: 'Modo Playa',
        description: 'Catalogo',
        technologies: ['NestJS'],
      },
    ]);
    toArrayMock.mockResolvedValue([]);

    const result = await service.getRelevantContext('zzzz qqqq');

    expect(result).toHaveLength(2);
  });
});
