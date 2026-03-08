export interface KnowledgeLink {
  readonly label: string;
  readonly url: string;
}

type KnowledgeContextItemBase = {
  readonly title: string;
  readonly text: string;
  readonly tags?: readonly string[];
  readonly links?: readonly KnowledgeLink[];
};

type ProjectKnowledgeContextItem = KnowledgeContextItemBase & {
  readonly sourceType: 'project';
  readonly sourceId: string;
};

type FaqKnowledgeContextItem = KnowledgeContextItemBase & {
  readonly sourceType: 'faq';
  readonly sourceId: string;
};

type PostKnowledgeContextItem = KnowledgeContextItemBase & {
  readonly sourceType: 'post';
  readonly sourceId: string;
};

type ProfileKnowledgeContextItem = KnowledgeContextItemBase & {
  readonly sourceType: 'profile';
  readonly sourceId?: string;
};

type CloudKnowledgeContextItem = KnowledgeContextItemBase & {
  readonly sourceType: 'cloud';
  readonly sourceId: string;
};

export type KnowledgeContextItem =
  | ProjectKnowledgeContextItem
  | FaqKnowledgeContextItem
  | PostKnowledgeContextItem
  | ProfileKnowledgeContextItem
  | CloudKnowledgeContextItem;

export interface ChatCompletionPayload {
  userMessage: string;
  contextItems: KnowledgeContextItem[];
  suggestedSeedQuestions?: string[];
}

export interface ChatCompletionResult {
  readonly answer: string;
  readonly suggestedQuestions: readonly string[];
}
