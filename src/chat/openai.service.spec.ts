import { OpenAiService } from './openai.service';
import { Logger } from '@nestjs/common';

describe('OpenAiService', () => {
  const contextItems = [
    {
      sourceType: 'project' as const,
      sourceId: 'modo-playa',
      title: 'Modo Playa',
      text: 'Alojamientos con ownerId. Publicada en Google Play.',
    },
  ];
  const originalFetch = global.fetch;
  const originalApiKey = process.env.OPENAI_API_KEY;
  const originalModel = process.env.OPENAI_CHAT_MODEL;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.OPENAI_CHAT_MODEL = 'gpt-4.1-mini';
  });
  afterEach(() => jest.restoreAllMocks());

  it('mide llamadas reales y caché por separado sin duplicar consumo ni registrar respuestas', async () => {
    const log = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    global.fetch = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          output: [
            {
              content: [
                {
                  text: JSON.stringify({
                    answer: 'Respuesta privada de prueba',
                    suggestedQuestions: [],
                  }),
                },
              ],
            },
          ],
          usage: {
            input_tokens: 120,
            output_tokens: 30,
            input_tokens_details: { cached_tokens: 80 },
          },
        }),
    } as Response);
    const service = new OpenAiService();
    const payload = { userMessage: 'Pregunta privada de prueba', contextItems };
    await service.generateChatResponse(payload);
    await service.generateChatResponse(payload);
    const events = log.mock.calls.map(
      ([value]) => JSON.parse(value as string) as Record<string, unknown>,
    );
    expect(events.map((event) => event.outcome)).toEqual([
      'success',
      'cache_hit',
    ]);
    expect(events[0]).toMatchObject({
      inputTokens: 120,
      outputTokens: 30,
      cachedInputTokens: 80,
    });
    expect(events[1]).not.toHaveProperty('inputTokens');
    expect(JSON.stringify(events)).not.toContain('privada');
    expect(
      [...service['responseCache'].keys()].every((key) =>
        /^[a-f0-9]{64}$/.test(key),
      ),
    ).toBe(true);
  });

  it('un error de red no vuelca el texto arbitrario de la excepción en logs', async () => {
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    global.fetch = jest
      .fn<typeof fetch>()
      .mockRejectedValue(new Error('contenido privado del visitante'));
    await new OpenAiService().generateChatResponse({
      userMessage: 'Pregunta',
      contextItems,
    });
    expect(warn).toHaveBeenCalledWith('OpenAI request failed: network_error');
    expect(JSON.stringify(warn.mock.calls)).not.toContain('privado');
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

  it.each([
    '',
    '   ',
    'invalid-json',
    '{}',
    '{"answer":"   ","suggestedQuestions":[]}',
  ])('rechaza respuesta vacía o malformada: %s', async (text) => {
    global.fetch = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ output: [{ content: [{ text }] }] }),
    } as Response);
    expect(
      await new OpenAiService().generateChatResponse({
        userMessage: 'Modo Playa',
        contextItems,
      }),
    ).toBeNull();
  });

  it('corta la llamada al proveedor a los 15 segundos', async () => {
    jest.useFakeTimers();
    try {
      global.fetch = jest.fn<typeof fetch>().mockImplementation(
        (_url: RequestInfo | URL, options?: RequestInit) =>
          new Promise((_resolve, reject) => {
            options?.signal?.addEventListener('abort', () =>
              reject(new Error('aborted')),
            );
          }),
      );
      const result = new OpenAiService().generateChatResponse({
        userMessage: 'Modo Playa',
        contextItems,
      });
      await jest.advanceTimersByTimeAsync(15_000);
      expect(await result).toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('separa cache por historial, enlaces y hechos; envía el historial en orden', async () => {
    const fetchMock = jest.fn<typeof fetch>().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            output: [
              {
                content: [
                  {
                    text: JSON.stringify({
                      answer: 'Respuesta',
                      suggestedQuestions: [],
                    }),
                  },
                ],
              },
            ],
          }),
      } as Response),
    );
    global.fetch = fetchMock;
    const service = new OpenAiService();
    const firstHistory = [
      {
        role: 'assistant' as const,
        content: 'Foodly Notes, después Modo Playa',
      },
    ];
    await service.generateChatResponse({
      userMessage: 'El segundo',
      contextItems,
      history: firstHistory,
    });
    await service.generateChatResponse({
      userMessage: 'El segundo',
      contextItems,
      history: [
        { role: 'assistant', content: 'Modo Playa, después Foodly Notes' },
      ],
    });
    await service.generateChatResponse({
      userMessage: 'El segundo',
      contextItems: [{ ...contextItems[0], text: 'Hechos actualizados' }],
      history: firstHistory,
    });
    await service.generateChatResponse({
      userMessage: 'El segundo',
      contextItems: [
        {
          ...contextItems[0],
          links: [{ label: 'Portfolio', url: 'https://matiasgaleano.dev' }],
        },
      ],
      history: firstHistory,
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    const calls = fetchMock.mock.calls as unknown as Parameters<typeof fetch>[];
    const body = JSON.parse(calls[0]?.[1]?.body as string) as {
      input: { role: string; content: string }[];
    };
    expect(body.input[1]).toEqual(firstHistory[0]);
    expect(body.input[0]?.content).toContain('datos no confiables');
    expect(body.input[0]?.content).toContain('ownerId');
    expect(body.input.at(-1)?.content).not.toContain('ownerId');
    expect(body.input.at(-1)?.content).toContain('El segundo');
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
