import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsController', () => {
  let controller: SubscriptionsController;
  const subscriptionsService = {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SubscriptionsController],
      providers: [
        { provide: SubscriptionsService, useValue: subscriptionsService },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = moduleRef.get(SubscriptionsController);
    subscriptionsService.subscribe.mockClear();
    subscriptionsService.unsubscribe.mockClear();
  });

  it('delegates subscribe requests', async () => {
    subscriptionsService.subscribe.mockResolvedValue({
      message: 'Subscribed successfully',
      email: 'test@example.com',
    });

    await controller.subscribe({ email: 'test@example.com' });

    expect(subscriptionsService.subscribe).toHaveBeenCalledWith({
      email: 'test@example.com',
    });
  });

  it('delegates unsubscribe requests', async () => {
    subscriptionsService.unsubscribe.mockResolvedValue({
      message: 'Unsubscribed successfully',
      email: 'test@example.com',
    });

    await controller.unsubscribe({ email: 'test@example.com' });

    expect(subscriptionsService.unsubscribe).toHaveBeenCalledWith({
      email: 'test@example.com',
    });
  });
});
