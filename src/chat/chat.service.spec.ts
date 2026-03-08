import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ChatQuestionLog } from './chat-question-log.schema';
import { ChatService } from './chat.service';
import { FaqService } from './faq.service';
import { KnowledgeService } from './knowledge.service';
import { OpenAiService } from './openai.service';

describe('ChatService', () => {
  let service: ChatService;

  const faqServiceMock = {
    findBestMatch: jest.fn(),
    incrementUsage: jest.fn(),
    getSystemEntry: jest.fn(),
    buildFollowUpSuggestions: jest.fn(),
  };

  const knowledgeServiceMock = {
    getRelevantContext: jest.fn(),
  };

  const openAiServiceMock = {
    generateChatResponse: jest.fn(),
  };

  const questionLogModelMock = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    faqServiceMock.getSystemEntry.mockResolvedValue(null);

    const moduleRef = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: FaqService, useValue: faqServiceMock },
        { provide: KnowledgeService, useValue: knowledgeServiceMock },
        { provide: OpenAiService, useValue: openAiServiceMock },
        {
          provide: getModelToken(ChatQuestionLog.name),
          useValue: questionLogModelMock,
        },
      ],
    }).compile();

    service = moduleRef.get(ChatService);
  });

  it('devuelve starters fijos y simplificados', async () => {
    const result = await service.getStarters();

    expect(result.suggestedQuestions).toEqual([
      '¿Quién sos y a qué te dedicás?',
      '¿Qué tecnologías usás?',
    ]);
  });

  it('responde por FAQ y registra uso/log', async () => {
    const faqId = new Types.ObjectId();
    faqServiceMock.findBestMatch.mockResolvedValue({
      _id: faqId,
      question: '¿Qué tecnologías usás?',
      answer: 'Uso TypeScript y NestJS',
      tags: ['skills'],
    });
    faqServiceMock.buildFollowUpSuggestions.mockReturnValue([
      '¿Qué proyecto destacás?',
      '¿Cuál es tu experiencia laboral?',
    ]);
    openAiServiceMock.generateChatResponse.mockResolvedValue({
      answer: 'Trabajo con TypeScript y NestJS.',
      suggestedQuestions: ['¿Qué proyecto destacás?', '¿Usás MongoDB?'],
    });
    questionLogModelMock.create.mockResolvedValue(undefined);

    const result = await service.reply({
      message: '¿Qué tecnologías usás?',
      sessionId: 's1',
    });

    expect(faqServiceMock.incrementUsage).toHaveBeenCalledWith(
      faqId.toHexString(),
    );
    expect(result.source).toBe('faq');
    expect(result.answer).toBe('Trabajo con TypeScript y NestJS.');
    expect(result.suggestedQuestions).toEqual([
      '¿Qué proyecto destacás?',
      '¿Usás MongoDB?',
    ]);
    expect(questionLogModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        question: '¿Qué tecnologías usás?',
        sessionId: 's1',
        source: 'faq',
        matchedFaqId: faqId.toHexString(),
      }),
    );
  });

  it('usa respuesta AI cuando no hay match FAQ', async () => {
    faqServiceMock.findBestMatch.mockResolvedValue(null);
    knowledgeServiceMock.getRelevantContext.mockResolvedValue([
      {
        sourceType: 'profile',
        title: 'Proyectos',
        text: 'Foodly Notes publicado en Play Store',
        tags: ['projects'],
      },
    ]);
    openAiServiceMock.generateChatResponse.mockResolvedValue({
      answer: 'Sí, Foodly Notes está publicada en Play Store.',
      suggestedQuestions: ['¿Qué tecnologías usaste en Foodly Notes?'],
    });
    questionLogModelMock.create.mockResolvedValue(undefined);

    const result = await service.reply({
      message: '¿Publicaste alguna app en play store?',
      sessionId: 's2',
    });

    expect(result.source).toBe('ai');
    expect(result.answer).toContain('Play Store');
    expect(questionLogModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'ai' }),
    );
  });

  it('cae en fallback si AI no responde', async () => {
    faqServiceMock.findBestMatch.mockResolvedValue(null);
    knowledgeServiceMock.getRelevantContext.mockResolvedValue([]);
    openAiServiceMock.generateChatResponse.mockResolvedValue(null);
    questionLogModelMock.create.mockResolvedValue(undefined);

    const result = await service.reply({
      message: 'Pregunta desconocida',
    });

    expect(result.source).toBe('fallback');
    expect(result.suggestedQuestions).toHaveLength(2);
  });

  it('intercepta preguntas fuera de alcance con redireccion al portfolio', async () => {
    questionLogModelMock.create.mockResolvedValue(undefined);

    const result = await service.reply({
      message: 'How much is 2+2?',
      sessionId: 's3',
    });

    expect(result.source).toBe('fallback');
    expect(result.answer).toContain(
      'Solo puedo ayudar con preguntas sobre el portfolio',
    );
    expect(faqServiceMock.findBestMatch).not.toHaveBeenCalled();
    expect(knowledgeServiceMock.getRelevantContext).not.toHaveBeenCalled();
    expect(openAiServiceMock.generateChatResponse).not.toHaveBeenCalled();
    expect(questionLogModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        question: 'How much is 2+2?',
        source: 'fallback',
      }),
    );
  });

  it('mantiene flujo contextual para preguntas tecnicas aunque no haya match FAQ', async () => {
    faqServiceMock.findBestMatch.mockResolvedValue(null);
    knowledgeServiceMock.getRelevantContext.mockResolvedValue([
      {
        sourceType: 'profile',
        title: 'Tecnologias principales',
        text: 'Angular, Ionic y NestJS',
        tags: ['angular', 'ionic', 'nestjs'],
      },
    ]);
    openAiServiceMock.generateChatResponse.mockResolvedValue({
      answer:
        'Matias Galeano trabaja principalmente con Angular, Ionic y NestJS.',
      suggestedQuestions: ['¿En qué proyecto aplicaste ese stack?'],
    });
    questionLogModelMock.create.mockResolvedValue(undefined);

    const result = await service.reply({
      message: 'Do you know React?',
      sessionId: 's4',
    });

    expect(result.source).toBe('ai');
    expect(knowledgeServiceMock.getRelevantContext).toHaveBeenCalledWith(
      'Do you know React?',
    );
    expect(openAiServiceMock.generateChatResponse).toHaveBeenCalled();
  });

  it('mantiene flujo contextual para preguntas sobre blog y cloud del portfolio', async () => {
    faqServiceMock.findBestMatch.mockResolvedValue(null);
    knowledgeServiceMock.getRelevantContext.mockResolvedValue([
      {
        sourceType: 'cloud',
        sourceId: 'cloud-lambdas',
        title: 'Experiencia reciente con AWS Lambda',
        text: 'Se implementaron Lambdas para generate-og y process-release.',
        tags: ['aws', 'lambda', 'serverless'],
      },
    ]);
    openAiServiceMock.generateChatResponse.mockResolvedValue({
      answer:
        'En portfolio-cloud resolví Lambdas dedicadas para generate-og y process-release.',
      suggestedQuestions: ['¿Cómo manejás el release manifest?'],
    });
    questionLogModelMock.create.mockResolvedValue(undefined);

    const result = await service.reply({
      message: '¿Cómo resolviste las lambdas del blog en portfolio cloud?',
      sessionId: 's5',
    });

    expect(result.source).toBe('ai');
    expect(knowledgeServiceMock.getRelevantContext).toHaveBeenCalledWith(
      '¿Cómo resolviste las lambdas del blog en portfolio cloud?',
    );
    expect(openAiServiceMock.generateChatResponse).toHaveBeenCalled();
  });
});
