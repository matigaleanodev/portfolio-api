import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ChatFaqDocument = HydratedDocument<ChatFaq>;

@Schema({ collection: 'faqs', timestamps: true })
export class ChatFaq {
  @Prop({ required: true, trim: true })
  question!: string;

  @Prop({ required: true, trim: true })
  answer!: string;

  @Prop({ type: [String], default: [] })
  aliases!: string[];

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({ default: true })
  active!: boolean;

  @Prop({ default: false })
  isStarterCandidate!: boolean;

  @Prop({ default: false })
  isFixedStarter!: boolean;

  @Prop({ default: 0 })
  starterPriority!: number;

  @Prop({ default: 0 })
  usageCount!: number;

  @Prop({ type: [String], default: [] })
  suggestedQuestions!: string[];
}

export const ChatFaqSchema = SchemaFactory.createForClass(ChatFaq);

ChatFaqSchema.index({ active: 1, isFixedStarter: 1, starterPriority: 1 });
ChatFaqSchema.index({ active: 1, isStarterCandidate: 1, usageCount: -1 });
