import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ContactDto } from './contact.dto';
import { ContactService } from './contact.service';
import { Throttle } from '@nestjs/throttler';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(204)
  @Throttle({
    default: {
      ttl: 60 * 60 * 1000,
      limit: 5,
    },
  })
  async send(@Body() dto: ContactDto): Promise<void> {
    if (dto.company) {
      // Honeypot activado: respondemos OK pero no hacemos nada
      return;
    }

    await this.contactService.send(dto);
  }
}
