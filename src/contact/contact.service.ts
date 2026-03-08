import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ContactDto } from './contact.dto';
import { Resend } from 'resend';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);
  private readonly resend: Resend;

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
  }

  async send(dto: ContactDto): Promise<void> {
    const timestamp = new Date().toLocaleString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
    });

    const text = `
          Nuevo mensaje de contacto

          Nombre: ${dto.name}
          Email: ${dto.email}
          Fecha: ${timestamp}

          Mensaje:
          ${dto.message}
          `.trim();

    try {
      await this.resend.emails.send({
        from: this.configService.get<string>('CONTACT_FROM_EMAIL')!,
        to: this.configService.get<string>('CONTACT_TO_EMAIL')!,
        subject: 'Nuevo mensaje desde el portfolio',
        text,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send contact email: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      throw new InternalServerErrorException(
        'No se pudo procesar el mensaje de contacto.',
      );
    }
  }
}
