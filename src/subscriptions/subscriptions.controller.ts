import { Body, Controller, Delete, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SubscriptionEmailDto } from './subscriptions.dto';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionResponse } from './subscriptions.types';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Post()
  @HttpCode(200)
  @Throttle({
    default: {
      ttl: 60 * 60 * 1000,
      limit: 10,
    },
  })
  subscribe(@Body() dto: SubscriptionEmailDto): Promise<SubscriptionResponse> {
    return this.subscriptionsService.subscribe(dto);
  }

  @Delete()
  @HttpCode(200)
  @Throttle({
    default: {
      ttl: 60 * 60 * 1000,
      limit: 10,
    },
  })
  unsubscribe(
    @Body() dto: SubscriptionEmailDto,
  ): Promise<SubscriptionResponse> {
    return this.subscriptionsService.unsubscribe(dto);
  }
}
