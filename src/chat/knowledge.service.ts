import { Injectable } from '@nestjs/common';
import { isPublicationDue } from './publication';
import {
  CHAT_BLOG_TOPIC_TERMS,
  CHAT_CLOUD_TOPIC_TERMS,
  CHAT_PROFILE_TOPIC_TERMS,
  CHAT_PROJECT_TOPIC_TERMS,
} from './chat-content.config';
import { CLOUD_KNOWLEDGE_ITEMS } from './knowledge/cloud.knowledge';
import { PROFILE_KNOWLEDGE_ITEMS } from './knowledge/profile.knowledge';
import { recordChatMetric } from './chat-metrics';
import { ChatCompletionPayload, KnowledgeContextItem } from './chat.types';
import {
  ChatKnowledgeRepository,
  EditorialKnowledgeArtifact,
} from './chat-knowledge.repository';

const CURATED_KNOWLEDGE_ITEMS: readonly KnowledgeContextItem[] = [
  ...PROFILE_KNOWLEDGE_ITEMS,
  ...CLOUD_KNOWLEDGE_ITEMS,
];

@Injectable()
export class KnowledgeService {
  constructor(
    private readonly chatKnowledgeRepository: ChatKnowledgeRepository,
  ) {}

  /**
   * Selecciona hechos editoriales sin permitir que el historial desplace la consulta actual.
   * @param question Consulta actual; determina el ranking y la necesidad de contacto.
   * @param history Diálogo no confiable usado solo para recuperar entidades en referencias.
   * @returns Contexto limitado que conserva los proyectos nombrados antes del ranking general.
   */
  async getRelevantContext(
    question: string,
    history: ChatCompletionPayload['history'] = [],
  ): Promise<KnowledgeContextItem[]> {
    const startedAt = performance.now();
    try {
      const context = await this.selectContext(question, history);
      recordChatMetric({
        event: 'chat_knowledge',
        outcome: context.every((item) => item.sourceType === 'profile')
          ? 'curated'
          : 'editorial',
        durationMs: performance.now() - startedAt,
      });
      return context;
    } catch (error) {
      recordChatMetric({
        event: 'chat_knowledge',
        outcome: 'error',
        durationMs: performance.now() - startedAt,
      });
      throw error;
    }
  }

  private async selectContext(
    question: string,
    history: ChatCompletionPayload['history'] = [],
  ): Promise<KnowledgeContextItem[]> {
    const normalized = this.normalize(question);
    const recentTurn =
      history.findLast(
        (turn) =>
          turn.role === 'user' &&
          (!this.isFollowup(this.normalize(turn.content)) ||
            this.isEditorialQuestion(this.normalize(turn.content), false)),
      )?.content ??
      history.at(-1)?.content ??
      '';
    const referenceQuestion =
      /\b(segundo|primero|otro|ese|estos|ambos|antes|dijiste|ahi|eso|esa)\b/.test(
        normalized,
      ) ||
      (!this.isEditorialQuestion(normalized, false) &&
        this.isFollowup(normalized))
        ? this.normalize(`${question} ${recentTurn}`)
        : normalized;
    const localProfile = this.getProfessionalContext(referenceQuestion, false);
    const commercialQuestion =
      /\b(tarifa|hora|disponibilidad|manana|usuarios|cobra|costo|salario)\b/.test(
        normalized,
      );
    const professionalOnly =
      (localProfile.length > 0 || commercialQuestion) &&
      !this.isEditorialQuestion(referenceQuestion, false);
    const editorialItems = professionalOnly
      ? []
      : await this.getEditorialKnowledgeItems();
    const namedProjects = editorialItems.filter(
      (item) =>
        item.sourceType === 'project' &&
        [
          item.title,
          item.sourceId.replace(/-/g, ' '),
          ...(item.sourceId === 'foodly-notes' ? ['Foodly'] : []),
        ].some((name) =>
          referenceQuestion
            .replace(/\s/g, '')
            .includes(this.normalize(name).replace(/\s/g, '')),
        ),
    );
    const contactItems = commercialQuestion
      ? CURATED_KNOWLEDGE_ITEMS.filter(
          (item) => item.sourceId === 'main-contact',
        )
      : [];
    const profileItems =
      namedProjects.length > 0
        ? this.getProfessionalContext(referenceQuestion, true)
        : localProfile;
    const scored = [...CURATED_KNOWLEDGE_ITEMS, ...editorialItems]
      .filter((item) => !professionalOnly || item.sourceType === 'profile')
      .filter(
        (item) =>
          !namedProjects.length ||
          profileItems.length > 0 ||
          item.sourceType !== 'profile',
      )
      .map((item) => ({
        item,
        score: this.scoreItem(normalized, item),
      }))
      .sort((left, right) => right.score - left.score);

    const relevant = scored.filter((entry) => entry.score > 0).slice(0, 4);

    const rankedItems =
      relevant.length > 0
        ? relevant.map((entry) => entry.item)
        : scored.slice(0, 3).map((entry) => entry.item);
    return [...contactItems, ...namedProjects, ...profileItems, ...rankedItems]
      .filter((item, index, items) => items.indexOf(item) === index)
      .slice(0, Math.max(4, namedProjects.length));
  }

  private isFollowup(question: string): boolean {
    return (
      /\b(segundo|primero|otro|ese|estos|ambos|antes|dijiste|ahi|eso|esa|usa|usan|utiliza|utilizan|funciona|funcionan|tiene|tienen)\b/.test(
        question,
      ) ||
      /^y\b.*\b(stack|tecnologias?|backend|frontend|arquitectura|bases? de datos)\b/.test(
        question,
      )
    );
  }

  private getProfessionalContext(
    question: string,
    hasNamedProject: boolean,
  ): KnowledgeContextItem[] {
    const ids: string[] = [];
    if (
      /\b(quien sos|quien es matias|perfil|presentate|sobre vos|a que te dedicas)\b/.test(
        question,
      )
    )
      ids.push('main-profile');
    if (/\b(fortalezas|enfoque|mantenibilidad)\b/.test(question))
      ids.push('main-strengths');
    const employment =
      /\b(comafi|boreal|ingertec|fci|fondos comunes|experiencia laboral|trayectoria)\b/.test(
        question,
      ) ||
      (!hasNamedProject &&
        (/\b(empresa|empleador|consultora)\b/.test(question) ||
          /\b(donde|para quien|en que|de que)\s+(?:empresa\s+)?(?:trabaj\w*|labur\w*)\b/.test(
            question,
          )));
    if (employment) ids.push('main-experience');
    if (
      /\b(idiomas?|ingles|english|propuestas?|oportunidades|freelance|remot\w*)\b/.test(
        question,
      )
    )
      ids.push('main-career-preferences');
    if (/\b(contact\w*|email|correo|linkedin|redes)\b/.test(question))
      ids.push('main-contact');

    // Una consulta editorial conserva su dominio; conocer una tecnología no prueba su uso en cada proyecto.
    const editorial = this.isEditorialQuestion(question, hasNamedProject);
    if (!editorial || employment) {
      if (
        /\b(sql\s?server|mssql|postgre\w*|rds|aurora|dynamo\s?db|mysql|mongodb|bases? de datos)\b/.test(
          question,
        )
      )
        ids.push('main-databases');
      if (/\b(aws|cdk|sqs|colas?|lambda\w*|serverless)\b/.test(question))
        ids.push('main-aws');
      if (
        /\b(stack|tecnologias?|herramientas|angular|ionic|nestjs|nest|typescript|ts|javascript|js|node|docker)\b/.test(
          question,
        )
      )
        ids.push('main-stack');
    }
    return ids.flatMap((id) =>
      PROFILE_KNOWLEDGE_ITEMS.filter((item) => item.sourceId === id),
    );
  }

  private isEditorialQuestion(
    question: string,
    hasNamedProject: boolean,
  ): boolean {
    return (
      hasNamedProject ||
      /\b(portfolio|portafolio|foodly|modo\s?playa|blog|posts?|articulos?|proyectos?|publicaste|escribiste)\b/.test(
        question,
      )
    );
  }

  private async getEditorialKnowledgeItems(): Promise<KnowledgeContextItem[]> {
    const artifact = await this.chatKnowledgeRepository.getKnowledge();

    return this.mapEditorialArtifactToKnowledgeItems(artifact);
  }

  private mapEditorialArtifactToKnowledgeItems(
    artifact: EditorialKnowledgeArtifact,
  ): KnowledgeContextItem[] {
    const projectItems = (artifact.projects ?? []).map((project) => ({
      sourceType: 'project' as const,
      sourceId: project.slug,
      title: project.title,
      text: [project.excerpt, project.highlights?.join(' '), project.searchText]
        .filter(Boolean)
        .join(' '),
      tags: project.stack ?? [],
      links: project.links ?? [],
    }));

    const postItems = (artifact.posts ?? [])
      .filter((post) => isPublicationDue(post.date))
      .map((post) => ({
        sourceType: 'post' as const,
        sourceId: post.slug,
        title: post.title,
        text: [post.excerpt, post.summary, post.searchText]
          .filter(Boolean)
          .join(' '),
        tags: post.tags ?? [],
        links: post.canonicalUrl
          ? [{ label: 'Post del blog', url: post.canonicalUrl }]
          : [],
      }));

    return [...projectItems, ...postItems];
  }

  private scoreItem(question: string, item: KnowledgeContextItem): number {
    const tagText = (item.tags ?? []).join(' ');
    const linkText = (item.links ?? [])
      .map((link) => `${link.label} ${link.url}`)
      .join(' ');
    const sourceAffinity = this.getSourceAffinityScore(question, item);

    return (
      sourceAffinity * 4 +
      this.keywordScore(question, item.title) * 3 +
      this.keywordScore(question, item.text) * 2 +
      this.keywordScore(question, tagText) * 2 +
      this.keywordScore(question, linkText)
    );
  }

  private getSourceAffinityScore(
    question: string,
    item: KnowledgeContextItem,
  ): number {
    switch (item.sourceType) {
      case 'project':
        return this.containsAny(question, CHAT_PROJECT_TOPIC_TERMS) ? 2 : 0;
      case 'post':
        return this.containsAny(question, CHAT_BLOG_TOPIC_TERMS) ? 2 : 0;
      case 'cloud':
        return this.containsAny(question, CHAT_CLOUD_TOPIC_TERMS) ? 2 : 0;
      case 'profile':
        return this.containsAny(question, CHAT_PROFILE_TOPIC_TERMS) ? 2 : 0;
      default:
        return 0;
    }
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^\p{L}\p{N}\s:/.-]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private keywordScore(question: string, text: string): number {
    const normalizedText = this.normalize(text);
    const tokens = question
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(
        (token) =>
          token.length >= 3 &&
          ![
            'que',
            'con',
            'como',
            'donde',
            'para',
            'por',
            'una',
            'del',
            'las',
            'los',
            'ese',
            'esa',
            'tenes',
            'usas',
          ].includes(token),
      );

    if (tokens.length === 0 || !normalizedText) {
      return 0;
    }

    return tokens.reduce(
      (score, token) => score + (normalizedText.includes(token) ? 1 : 0),
      0,
    );
  }

  private containsAny(text: string, terms: readonly string[]): boolean {
    return terms.some((term) => text.includes(term));
  }
}
