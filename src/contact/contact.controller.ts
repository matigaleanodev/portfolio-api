import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ContactDto } from './contact.dto';
import { ContactService } from './contact.service';
import { ThrottlerGuard } from '@nestjs/throttler';

@Controller('contact')
@UseGuards(ThrottlerGuard)
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(204)
  async send(@Body() dto: ContactDto): Promise<void> {
    if (dto.company) {
      // Honeypot activado: respondemos OK pero no hacemos nada
      return;
    }

    await this.contactService.send(dto);
  }
}
