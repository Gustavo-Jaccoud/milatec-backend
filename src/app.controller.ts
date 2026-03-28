import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  constructor() {}

  @Get("Ok")
    getOk(): string {
      return "OK";
    }
}
