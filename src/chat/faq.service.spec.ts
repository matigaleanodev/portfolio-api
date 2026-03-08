import { Test } from '@nestjs/testing';
import { FaqService } from './faq.service';

describe('FaqService', () => {
  let service: FaqService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [FaqService],
    }).compile();

    service = moduleRef.get(FaqService);
  });

  it('busca coincidencias sobre las FAQs versionadas locales', async () => {
    const result = await service.findBestMatch('¿Qué tecnologías usás?');

    expect(result?.id).toBe('que-tecnologias-usas');
    expect(result?.tags).toContain('skills');
  });

  it('resuelve entradas de sistema sin depender de Mongo', async () => {
    const result = await service.getSystemEntry('fallback');

    expect(result).toEqual(
      expect.objectContaining({
        answer: expect.stringContaining('No tengo esa información'),
        suggestedQuestions: expect.any(Array),
      }),
    );
  });
});
