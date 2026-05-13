import { IsEmail, Matches } from 'class-validator';

export class VerifyPinDto {
  @IsEmail()
  email!: string;

  @Matches(/^\d{4}$/, {
    message: 'PIN deve conter 4 digitos numericos',
  })
  pin!: string;
}
