import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailService {
    async sendEmail(to: string, subject: string) {
    console.log(`Enviando e-mail para ${to}: ${subject}`);
  }
}
