import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ChatRequestDto,
  ChatResponseDto,
  ChatStartersResponseDto,
} from './chat.dto';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('starters')
  async getStarters(): Promise<ChatStartersResponseDto> {
    return this.chatService.getStarters();
  }

  @Post()
  async reply(@Body() dto: ChatRequestDto): Promise<ChatResponseDto> {
    return this.chatService.reply(dto);
  }
}
