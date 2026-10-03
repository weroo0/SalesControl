import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsInt,
  Max,
  Min,
} from 'class-validator';

export class ClienteQueryDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => {
    const rawValue: unknown = value;

    if (typeof rawValue === 'string') {
      return rawValue.trim();
    }

    return rawValue;
  })
  nombre?: string;

  @IsOptional()
  @Transform(({ value }) => {
    const rawValue: unknown = value;

    if (rawValue === 'true') return true;
    if (rawValue === 'false') return false;

    return rawValue;
  })
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
