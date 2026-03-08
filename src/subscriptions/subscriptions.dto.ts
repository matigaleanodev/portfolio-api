import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength } from 'class-validator';

export class SubscriptionEmailDto {
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(320)
  email!: string;
}
