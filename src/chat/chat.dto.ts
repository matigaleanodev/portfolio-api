import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ChatRequestDto {
  @IsString()
  @MaxLength(500)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sessionId?: string;
}

export class ChatResponseDto {
  answer!: string;
  suggestedQuestions!: string[];
  source!: 'faq' | 'ai' | 'fallback';
}

export class ChatStartersResponseDto {
  suggestedQuestions!: string[];
}
