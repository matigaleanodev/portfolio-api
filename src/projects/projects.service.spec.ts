import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ProjectsService } from './projects.service';
import { Project } from './projects.schema';

describe('ProjectsService', () => {
  let service: ProjectsService;

  const execMock = jest.fn();
  const sortMock = jest.fn(() => ({ lean: leanMock }));
  const leanMock = jest.fn(() => ({ exec: execMock }));
  const findMock = jest.fn(() => ({ sort: sortMock }));

  const projectModelMock = {
    find: findMock,
  };

  beforeEach(async () => {
    execMock.mockClear();
    findMock.mockClear();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getModelToken(Project.name),
          useValue: projectModelMock,
        },
      ],
    }).compile();

    service = moduleRef.get(ProjectsService);
  });

  it('devuelve la lista de proyectos ordenada', async () => {
    const projects = [{ name: 'Foodly Notes', order: 1 }];

    execMock.mockResolvedValue(projects);

    const result = await service.findAll();

    expect(findMock).toHaveBeenCalled();
    expect(result).toEqual(projects);
  });
});
