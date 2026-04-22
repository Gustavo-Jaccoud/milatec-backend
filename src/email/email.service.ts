import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailService {
  constructor(private mailerService: MailerService) { }
  async sendEmail(to: string, code: string) {
    try {
      const mail = await this.mailerService.sendMail({
        to: to,
        subject: "Código de Confirmação MilaTec",
        template: 'CodeEmailTemplate',
        context: {
          code: code,
        },

      })
    }
    catch (error) {
      console.log(error)
    }
    console.log(`Enviando e-mail para ${to}: ${code}`);
  }
}
