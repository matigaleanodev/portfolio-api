import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ContactService } from './contact.service';
import { ContactDto } from './contact.dto';
import { Resend } from 'resend';

type EmailSendArgs = {
  from: string;
  to: string;
  subject: string;
  text: string;
};

const emailsSendMock: jest.MockedFunction<(args: EmailSendArgs) => unknown> =
  jest.fn();

jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: {
        send: emailsSendMock,
      },
    })),
  };
});

describe('ContactService', () => {
  let service: ContactService;

  const configServiceMock = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        RESEND_API_KEY: 'test_api_key',
        CONTACT_FROM_EMAIL: 'from@test.com',
        CONTACT_TO_EMAIL: 'to@test.com',
      };

      return values[key];
    }),
  };

  beforeEach(async () => {
    emailsSendMock.mockClear();
    (Resend as unknown as jest.Mock).mockClear();
    configServiceMock.get.mockClear();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ContactService,
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = moduleRef.get(ContactService);
  });

  it('inicializa Resend con RESEND_API_KEY', () => {
    expect(Resend).toHaveBeenCalledTimes(1);
    expect(Resend).toHaveBeenCalledWith('test_api_key');
  });

  it('envía un email con los datos del contacto', async () => {
    const dto: ContactDto = {
      name: 'Juan Perez',
      email: 'juan@test.com',
      message: 'Hola Mati, vi tu portfolio y quería contactarte.',
    };

    await service.send(dto);

    expect(emailsSendMock).toHaveBeenCalledTimes(1);

    const [args] = emailsSendMock.mock.calls[0];

    expect(args.from).toBe('from@test.com');
    expect(args.to).toBe('to@test.com');
    expect(args.subject).toBe('Nuevo mensaje desde el portfolio');

    expect(args.text).toContain('Nuevo mensaje de contacto');
    expect(args.text).toContain(`Nombre: ${dto.name}`);
    expect(args.text).toContain(`Email: ${dto.email}`);
    expect(args.text).toContain('Fecha:');
    expect(args.text).toContain(dto.message);
  });
});
