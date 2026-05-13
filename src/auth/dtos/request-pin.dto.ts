import { IsEmail } from 'class-validator';

export class RequestPinDto {
  @IsEmail()
  email!: string;
}
