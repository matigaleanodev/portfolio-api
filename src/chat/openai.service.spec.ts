import { OpenAiService } from './openai.service';

describe('OpenAiService', () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.OPENAI_API_KEY;
  const originalModel = process.env.OPENAI_CHAT_MODEL;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.OPENAI_CHAT_MODEL = 'gpt-4.1-mini';
  });

  afterAll(() => {
    global.fetch = originalFetch;

    if (originalApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalApiKey;
    }

    if (originalModel === undefined) {
      delete process.env.OPENAI_CHAT_MODEL;
    } else {
      process.env.OPENAI_CHAT_MODEL = originalModel;
    }
  });

  it('retorna null si no hay contexto', async () => {
    const service = new OpenAiService();

    const result = await service.generateChatResponse({
      userMessage: 'hola',
      contextItems: [],
    });

    expect(result).toBeNull();
  });

  it('parsea la respuesta y usa cache para evitar segunda llamada', async () => {
    const fetchMock = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          output: [
            {
              content: [
                {
                  text: JSON.stringify({
                    answer: 'Foodly Notes está publicada en Play Store.',
                    suggestedQuestions: [
                      '¿Qué tecnologías usaste?',
                      '¿Cuál fue tu rol?',
                    ],
                  }),
                },
              ],
            },
          ],
        }),
    } as Response);

    global.fetch = fetchMock;

    const service = new OpenAiService();
    const payload = {
      userMessage: 'publicaste alguna app?',
      contextItems: [
        {
          sourceType: 'profile' as const,
          sourceId: 'main-projects',
          title: 'Proyectos',
          text: 'Foodly Notes publicado en Google Play Store',
          tags: ['foodly-notes', 'play-store'],
        },
      ],
      suggestedSeedQuestions: ['¿Qué tecnologías usaste?'],
    };

    const first = await service.generateChatResponse(payload);
    const second = await service.generateChatResponse(payload);

    expect(first?.answer).toContain('Play Store');
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retorna null cuando OpenAI responde error http', async () => {
    global.fetch = jest.fn<typeof fetch>().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({}),
    } as Response);

    const service = new OpenAiService();
    const result = await service.generateChatResponse({
      userMessage: 'hola',
      contextItems: [
        {
          sourceType: 'profile',
          title: 'Perfil',
          text: 'texto',
        },
      ],
    });

    expect(result).toBeNull();
  });
});
