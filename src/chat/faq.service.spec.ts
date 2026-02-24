import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ChatFaq } from './chat-faq.schema';
import { FaqService } from './faq.service';

describe('FaqService', () => {
  let service: FaqService;

  const execMock = jest.fn();
  const leanMock = jest.fn(() => ({ exec: execMock }));
  const limitMock = jest.fn(() => ({ lean: leanMock, exec: execMock }));
  const sortMock = jest.fn(() => ({ lean: leanMock, limit: limitMock }));
  const findMock = jest.fn(() => ({ sort: sortMock, lean: leanMock }));
  const updateExecMock = jest.fn();
  const updateOneMock = jest.fn(() => ({ exec: updateExecMock }));

  const faqModelMock = {
    find: findMock,
    updateOne: updateOneMock,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        FaqService,
        { provide: getModelToken(ChatFaq.name), useValue: faqModelMock },
      ],
    }).compile();

    service = moduleRef.get(FaqService);
  });

  it('busca por palabras primero y cae a full scan si no hay candidatos', async () => {
    const targetId = new Types.ObjectId();

    execMock.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        _id: targetId,
        question: '¿Qué tecnologías usás?',
        aliases: ['stack'],
        answer: 'x',
        tags: ['skills'],
      },
    ]);

    const result = await service.findBestMatch('¿Qué tecnologías usás?');
    const firstFindQuery = findMock.mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;

    expect(findMock).toHaveBeenCalledTimes(2);
    expect(firstFindQuery).toEqual(expect.objectContaining({ active: true }));
    expect(
      Array.isArray((firstFindQuery as { $or?: unknown }).$or),
    ).toBeTruthy();
    expect(findMock.mock.calls[1]?.[0]).toEqual({ active: true });
    expect(result?._id).toEqual(targetId);
  });

  it('arma starters con fijas y dinámicas sin duplicar', async () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);

    execMock
      .mockResolvedValueOnce([
        { question: '¿Quién sos y a qué te dedicás?' },
        { question: '¿Qué tecnologías usás?' },
      ])
      .mockResolvedValueOnce([
        { question: '¿Qué tecnologías usás?' },
        { question: '¿Qué proyecto destacás?' },
        { question: '¿Cómo puedo contactarte?' },
      ]);

    const result = await service.getStarterQuestions(4);

    expect(result).toEqual([
      '¿Quién sos y a qué te dedicás?',
      '¿Qué tecnologías usás?',
      '¿Qué proyecto destacás?',
      '¿Cómo puedo contactarte?',
    ]);

    randomSpy.mockRestore();
  });
});
