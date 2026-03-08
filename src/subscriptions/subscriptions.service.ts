import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionEmailDto } from './subscriptions.dto';
import { SubscriptionResponse } from './subscriptions.types';
import { getPortfolioCloudApiBaseUrl } from '../config/runtime.config';

const SUBSCRIPTIONS_PATH = '/subscriptions';
const SUBSCRIPTIONS_UPSTREAM_TIMEOUT_MS = 8_000;

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = getPortfolioCloudApiBaseUrl({
      PORTFOLIO_CLOUD_API_URL: this.configService.get<string>(
        'PORTFOLIO_CLOUD_API_URL',
      ),
    });
  }

  subscribe(dto: SubscriptionEmailDto): Promise<SubscriptionResponse> {
    return this.send('POST', dto);
  }

  unsubscribe(dto: SubscriptionEmailDto): Promise<SubscriptionResponse> {
    return this.send('DELETE', dto);
  }

  private async send(
    method: 'POST' | 'DELETE',
    dto: SubscriptionEmailDto,
  ): Promise<SubscriptionResponse> {
    const endpoint = `${this.baseUrl}${SUBSCRIPTIONS_PATH}`;

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dto),
        signal: AbortSignal.timeout(SUBSCRIPTIONS_UPSTREAM_TIMEOUT_MS),
      });

      const payload = await this.parseJson(response);

      if (response.ok) {
        return this.validateSuccessPayload(payload);
      }

      if (response.status >= 400 && response.status < 500) {
        const message = this.getErrorMessage(payload);
        throw new BadRequestException(message);
      }

      this.logger.error(
        `Subscriptions upstream returned ${response.status} for ${method} ${endpoint}`,
      );
      throw new BadGatewayException(
        'No se pudo procesar la suscripcion en este momento.',
      );
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof BadGatewayException
      ) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : 'unknown network error';
      this.logger.error(
        `Subscriptions upstream request failed for ${method} ${endpoint}: ${message}`,
      );
      throw new ServiceUnavailableException(
        'No se pudo conectar con el servicio de suscripciones.',
      );
    }
  }

  private async parseJson(response: Response): Promise<unknown> {
    try {
      return (await response.json()) as unknown;
    } catch {
      return null;
    }
  }

  private validateSuccessPayload(payload: unknown): SubscriptionResponse {
    if (
      !payload ||
      typeof payload !== 'object' ||
      typeof (payload as SubscriptionResponse).message !== 'string'
    ) {
      throw new BadGatewayException(
        'El servicio de suscripciones devolvio una respuesta invalida.',
      );
    }

    const { message, email } = payload as SubscriptionResponse;

    if (email !== undefined && typeof email !== 'string') {
      throw new BadGatewayException(
        'El servicio de suscripciones devolvio una respuesta invalida.',
      );
    }

    return { message, email };
  }

  private getErrorMessage(payload: unknown): string {
    if (
      payload &&
      typeof payload === 'object' &&
      typeof (payload as { error?: unknown }).error === 'string'
    ) {
      return (payload as { error: string }).error;
    }

    return 'No se pudo validar la solicitud de suscripcion.';
  }
}
