import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ChatHistoryMessageDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @Matches(/\S/)
  @MaxLength(1500)
  content!: string;
}

export class ChatRequestDto {
  @IsString()
  @Matches(/\S/)
  @MaxLength(500)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sessionId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryMessageDto)
  history?: ChatHistoryMessageDto[];
}

export class ChatResponseDto {
  answer!: string;
  suggestedQuestions!: string[];
  source!: 'faq' | 'ai' | 'fallback';
}

export class ChatStartersResponseDto {
  suggestedQuestions!: string[];
}
