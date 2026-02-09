import { Test } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

describe('ProjectsController', () => {
  let controller: ProjectsController;

  const projectsServiceMock = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    projectsServiceMock.findAll.mockClear();

    const moduleRef = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: projectsServiceMock,
        },
      ],
    }).compile();

    controller = moduleRef.get(ProjectsController);
  });

  it('retorna la lista de proyectos', async () => {
    const projects = [{ name: 'Foodly Notes' }];

    projectsServiceMock.findAll.mockResolvedValue(projects);

    const result = await controller.findAll();

    expect(projectsServiceMock.findAll).toHaveBeenCalledTimes(1);
    expect(result).toEqual(projects);
  });
});
