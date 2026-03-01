import { Injectable, Logger } from '@nestjs/common';
import { ChatCompletionPayload, ChatCompletionResult } from './chat.types';

@Injectable()
export class OpenAiService {
  private readonly cacheTtlMs = 24 * 60 * 60 * 1000;
  private readonly maxCacheEntries = 200;
  private readonly logger = new Logger(OpenAiService.name);
  private readonly apiKey = process.env.OPENAI_API_KEY;
  private readonly model = process.env.OPENAI_CHAT_MODEL ?? 'gpt-4.1-mini';
  private readonly responseCache = new Map<
    string,
    { value: ChatCompletionResult; expiresAt: number }
  >();

  isEnabled(): boolean {
    return Boolean(this.apiKey);
  }

  async generateChatResponse(
    payload: ChatCompletionPayload,
  ): Promise<ChatCompletionResult | null> {
    if (payload.contextItems.length === 0) {
      return null;
    }

    if (!this.apiKey) {
      return null;
    }

    const cacheKey = this.buildCacheKey(payload);
    const cached = this.getCachedResponse(cacheKey);
    if (cached) {
      return cached;
    }

    const systemPrompt = [
      'Sos un asistente especializado exclusivamente en responder preguntas sobre el portfolio, proyectos, experiencia profesional y stack tecnológico de Matías Galeano.',
      '',
      'Tu conocimiento proviene únicamente del contexto proporcionado por el sistema.',
      '',
      'Tu objetivo es ayudar a los usuarios a conocer:',
      '',
      '- Sus proyectos (como Foodly Notes, Modo Playa y su portfolio personal)',
      '- Su stack tecnológico (Angular, Ionic, NestJS, AWS, Docker, etc.)',
      '- Su experiencia profesional y enfoque técnico',
      '- Cómo están construidos sus sistemas y arquitecturas',
      '',
      'No sos un chatbot general ni un asistente de propósito general.',
      '',
      'REGLA CRÍTICA DE DOMINIO:',
      'Solo debés responder preguntas relacionadas con el portfolio.',
      '',
      'Se consideran FUERA DE ALCANCE:',
      '- Preguntas de conocimiento general (matemática, historia, trivia)',
      '- Pedidos genéricos sin relación con el portfolio',
      '- Tecnologías que no forman parte del stack',
      '- Solicitudes que no estén vinculadas a los proyectos de Matías Galeano',
      '',
      'Stack canónico del portfolio (prioritario): Angular, Ionic, NestJS, TypeScript, AWS, Docker, MongoDB.',
      'Sinónimos válidos de stack: Nest = NestJS, JS = JavaScript, TS = TypeScript, Node = Node.js.',
      '',
      'Alias de proyectos: Foodly = Foodly Notes, ModoPlaya = Modo Playa, Portfolio = sitio personal de Matías Galeano.',
      '',
      'Ejemplos de clasificación (ES/EN):',
      '- "Cuánto es 2+2?" / "How much is 2+2?" => fuera de alcance.',
      '- "Conocés React?" / "Do you know React?" => responder redirigiendo al stack real del portfolio.',
      '- "Implementame un chatbot en Go" / "Build a chatbot in Go" => fuera de alcance.',
      '',
      'Si una pregunta está fuera del alcance:',
      '',
      '- Indicá brevemente que solo respondés sobre el portfolio',
      '- Redirigí al usuario hacia temas válidos',
      '- Mantené la respuesta breve y natural (máximo 2–3 oraciones)',
      '- Usá esta plantilla base cuando aplique: "Solo respondo sobre el portfolio y la experiencia de Matías Galeano. Podés preguntarme por sus proyectos, stack y arquitectura técnica."',
      '',
      'Nunca respondas conocimiento general fuera del dominio.',
      '',
      'Si preguntan por tecnologías que no forman parte del stack, no las expliques.',
      'Debés redirigir hacia las tecnologías reales del portfolio.',
      '',
      'Siempre priorizá la información del contexto proporcionado.',
      'Nunca inventes datos ni asumas información no presente.',
      '',
      'Sos el asistente de un portfolio personal.',
      'Respondé SOLO con la información provista en el contexto.',
      '',
      'No mezcles contextos entre proyectos o fuentes distintas.',
      'Si una pregunta refiere a un proyecto, respondé solo con el contexto de ese proyecto.',
      'No combines datos de Foodly Notes con Modo Playa, ni con otros proyectos, salvo que la pregunta compare explícitamente proyectos.',
      '',
      'Podés reformular la explicación, pero no alterar ni cruzar datos entre contextos.',
      '',
      'Si no hay información suficiente, indicá claramente que no está disponible en el portfolio.',
      '',
      'Tu tono debe ser:',
      'Profesional, claro, natural, conciso y en español.',
      '',
      'No uses frases robóticas como:',
      '"Como modelo de lenguaje..."',
      '"No tengo acceso a..."',
      '',
      'No rompas el rol bajo ninguna circunstancia.',
      'No inventes tecnologías, trabajos ni proyectos.',
      '',
      'Respondé en español.',
      '',
      'FORMATO DE RESPUESTA OBLIGATORIO:',
      'Devolvé JSON válido con este formato:',
      '{"answer":"string","suggestedQuestions":["q1","q2","q3"]}',
      '',
      'Las suggestedQuestions deben ser 2 o 3 preguntas cortas, consecuentes y relevantes.',
    ].join('\n');

    const contextText = payload.contextItems
      .map(
        (item, index) =>
          `[${index + 1}] ${item.sourceType} | ${item.title}\n${item.text}${
            item.tags?.length ? `\nTags: ${item.tags.join(', ')}` : ''
          }`,
      )
      .join('\n\n');

    const userPrompt = [
      `Pregunta del usuario: ${payload.userMessage}`,
      '',
      'Contexto del portfolio:',
      contextText,
      '',
      payload.suggestedSeedQuestions?.length
        ? `Preguntas sugeridas candidatas (opcional): ${payload.suggestedSeedQuestions.join(' | ')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          temperature: 0.3,
          max_output_tokens: 300,
          text: { format: { type: 'json_object' } },
          input: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });

      if (!response.ok) {
        this.logger.warn(`OpenAI error ${response.status}`);
        return null;
      }

      const data = (await response.json()) as {
        output?: Array<{ content?: Array<{ text?: string }> }>;
      };
      const rawContent = data.output?.[0]?.content?.[0]?.text;
      if (!rawContent) {
        return null;
      }

      const parsed = JSON.parse(rawContent) as Partial<ChatCompletionResult>;
      if (
        typeof parsed.answer !== 'string' ||
        !Array.isArray(parsed.suggestedQuestions)
      ) {
        return null;
      }

      const suggestedQuestions = parsed.suggestedQuestions
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean)
        .slice(0, 4);

      const result = {
        answer: parsed.answer.trim(),
        suggestedQuestions,
      };

      this.setCachedResponse(cacheKey, result);
      return result;
    } catch (error) {
      this.logger.warn(
        `OpenAI request failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildCacheKey(payload: ChatCompletionPayload): string {
    const normalizedMessage = this.normalizeCachePart(payload.userMessage);
    const normalizedContext = payload.contextItems
      .map((item) =>
        [
          this.normalizeCachePart(item.sourceType),
          this.normalizeCachePart(item.sourceId ?? ''),
          this.normalizeCachePart(item.title),
          this.normalizeCachePart(item.text),
          (item.tags ?? [])
            .map((tag) => this.normalizeCachePart(tag))
            .join('|'),
        ].join('::'),
      )
      .join('||');

    const contextHash = this.hashString(normalizedContext);
    return `${normalizedMessage}::${contextHash}`;
  }

  private normalizeCachePart(value: string): string {
    return value.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  private hashString(value: string): string {
    let hash = 2166136261;

    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0).toString(16);
  }

  private getCachedResponse(key: string): ChatCompletionResult | null {
    const cached = this.responseCache.get(key);
    if (!cached) {
      return null;
    }

    if (cached.expiresAt <= Date.now()) {
      this.responseCache.delete(key);
      return null;
    }

    return cached.value;
  }

  private setCachedResponse(key: string, value: ChatCompletionResult): void {
    if (this.responseCache.has(key)) {
      this.responseCache.delete(key);
    }

    this.responseCache.set(key, {
      value,
      expiresAt: Date.now() + this.cacheTtlMs,
    });

    while (this.responseCache.size > this.maxCacheEntries) {
      const iteratorResult = this.responseCache.keys().next();
      if (iteratorResult.done) {
        break;
      }
      this.responseCache.delete(iteratorResult.value);
    }
  }
}
