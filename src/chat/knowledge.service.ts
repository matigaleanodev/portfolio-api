import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { Project, ProjectDocument } from '../projects/projects.schema';
import { KnowledgeContextItem } from './chat.types';

type ProfileContextRecord = {
  _id: unknown;
  sourceType: 'profile';
  sourceId?: string;
  title: string;
  text: string;
  tags?: string[];
  active?: boolean;
};

@Injectable()
export class KnowledgeService {
  constructor(
    @InjectModel(Project.name)
    private readonly projectModel: Model<ProjectDocument>,
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async getRelevantContext(question: string): Promise<KnowledgeContextItem[]> {
    const normalized = question.toLowerCase();
    const [projects, profileContext] = await Promise.all([
      this.projectModel.find().sort({ order: 1 }).limit(6).lean().exec(),
      this.connection
        .collection<ProfileContextRecord>('profile_context')
        .find({ active: true })
        .limit(20)
        .toArray(),
    ]);

    const scoredProjects = projects.map((project) => {
      const score =
        this.keywordScore(normalized, project.name) * 3 +
        this.keywordScore(normalized, project.description) +
        this.keywordScore(normalized, (project.technologies ?? []).join(' ')) *
          2;

      return {
        score,
        item: {
          sourceType: 'project' as const,
          sourceId: String(project._id),
          title: project.name,
          text: project.description,
          tags: project.technologies ?? [],
        },
      };
    });

    const scoredProfileContext = profileContext.map((item) => {
      const score =
        this.keywordScore(normalized, item.title) * 2 +
        this.keywordScore(normalized, item.text) +
        this.keywordScore(normalized, (item.tags ?? []).join(' ')) * 2;

      return {
        score,
        item: {
          sourceType: 'profile' as const,
          sourceId: item.sourceId,
          title: item.title,
          text: item.text,
          tags: item.tags ?? [],
        },
      };
    });

    const scored = [...scoredProjects, ...scoredProfileContext].sort(
      (a, b) => b.score - a.score,
    );

    const relevant = scored.filter((entry) => entry.score > 0).slice(0, 4);

    if (relevant.length > 0) {
      return relevant.map((entry) => entry.item);
    }

    return scored.slice(0, 2).map((entry) => entry.item);
  }

  private keywordScore(question: string, text: string): number {
    const tokens = question
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3);

    if (tokens.length === 0) {
      return 0;
    }

    return tokens.reduce(
      (score, token) => score + (text.includes(token) ? 1 : 0),
      0,
    );
  }
}
