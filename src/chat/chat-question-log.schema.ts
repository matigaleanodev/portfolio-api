import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ChatFaq } from './chat-faq.schema';

export type ChatQuestionLogDocument = HydratedDocument<ChatQuestionLog>;

@Schema({ collection: 'chat_question_logs', timestamps: true })
export class ChatQuestionLog {
  @Prop({ required: true, trim: true })
  question!: string;

  @Prop({ type: Types.ObjectId, ref: ChatFaq.name })
  matchedFaqId?: Types.ObjectId;

  @Prop({ enum: ['faq', 'ai', 'fallback'], required: true })
  source!: 'faq' | 'ai' | 'fallback';

  @Prop()
  sessionId?: string;
}

export const ChatQuestionLogSchema =
  SchemaFactory.createForClass(ChatQuestionLog);
