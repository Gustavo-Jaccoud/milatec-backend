import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dtos/login.dto';
import { RequestPinDto } from './dtos/request-pin.dto';
import { VerifyPinDto } from './dtos/verify-pin.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('request-pin')
  @HttpCode(HttpStatus.OK)
  async requestPin(
    @Body(new ValidationPipe({ whitelist: true })) body: RequestPinDto,
  ) {
    return await this.authService.requestPin(body);
  }

  @Post('verify-pin')
  @HttpCode(HttpStatus.OK)
  async verifyPin(
    @Body(new ValidationPipe({ whitelist: true })) body: VerifyPinDto,
  ) {
    return await this.authService.verifyPin(body);
  }

  @Post('login')
  async login(@Body() body: LoginDto) {
    return await this.authService.login(body);
  }
}
