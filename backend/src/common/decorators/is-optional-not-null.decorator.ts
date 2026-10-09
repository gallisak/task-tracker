import { ValidateIf } from 'class-validator';

export const IsOptionalNotNull = () =>
  ValidateIf((_object: object, value: unknown) => value !== undefined);
