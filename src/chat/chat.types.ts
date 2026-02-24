type KnowledgeContextItemBase = {
  readonly title: string;
  readonly text: string;
  readonly tags?: readonly string[];
};

type ProjectKnowledgeContextItem = KnowledgeContextItemBase & {
  readonly sourceType: 'project';
  readonly sourceId: string;
};

type FaqKnowledgeContextItem = KnowledgeContextItemBase & {
  readonly sourceType: 'faq';
  readonly sourceId: string;
};

type ProfileKnowledgeContextItem = KnowledgeContextItemBase & {
  readonly sourceType: 'profile';
  readonly sourceId?: string;
};

export type KnowledgeContextItem =
  | ProjectKnowledgeContextItem
  | FaqKnowledgeContextItem
  | ProfileKnowledgeContextItem;

export interface ChatCompletionPayload {
  userMessage: string;
  contextItems: KnowledgeContextItem[];
  suggestedSeedQuestions?: string[];
}

export interface ChatCompletionResult {
  readonly answer: string;
  readonly suggestedQuestions: readonly string[];
}
