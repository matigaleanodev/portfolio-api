import { Test } from '@nestjs/testing';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('ContactController', () => {
  let controller: ContactController;
  const contactService = { send: jest.fn() };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ContactController],
      providers: [{ provide: ContactService, useValue: contactService }],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = moduleRef.get(ContactController);
    contactService.send.mockClear();
  });

  it('no envía email cuando el honeypot viene con valor', async () => {
    await controller.send({
      name: 'Juan',
      email: 'juan@test.com',
      message: 'Hola, te escribo desde el portfolio',
      company: 'ACME',
    });

    expect(contactService.send).not.toHaveBeenCalled();
  });

  it('envía email cuando el honeypot no viene', async () => {
    await controller.send({
      name: 'Juan',
      email: 'juan@test.com',
      message: 'Hola, te escribo desde el portfolio',
    });

    expect(contactService.send).toHaveBeenCalledTimes(1);
  });
});
