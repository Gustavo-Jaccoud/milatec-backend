import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as SibApiV3Sdk from 'sib-api-v3-sdk';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiInstance: SibApiV3Sdk.TransactionalEmailsApi;

  constructor(private readonly configService: ConfigService) {
    const defaultClient = SibApiV3Sdk.ApiClient.instance;

    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = this.configService.get<string>('BREVO_API_KEY')!;

    this.apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  }

  async sendEmail(to: string, code: string): Promise<void> {
    try {
      const html = this.renderTemplate('CodeEmailTemplate', {
        code,
      });

      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

      sendSmtpEmail.sender = {
        name: 'MilaTec',
        email: this.configService.get<string>('MAIL_FROM')!,
      };

      sendSmtpEmail.to = [
        {
          email: to,
        },
      ];

      sendSmtpEmail.subject = 'Código de Confirmação MilaTec';
      sendSmtpEmail.htmlContent = html;

      const result =
        await this.apiInstance.sendTransacEmail(sendSmtpEmail);

      console.log(result);

      this.logger.log(`E-mail de verificação enviado para ${to}`);
    } catch (error: any) {
  console.error('BREVO ERROR:', error.response?.body);
  console.error('BREVO ERROR FULL:', error);
  throw error;
}
  }

  private renderTemplate(
    templateName: string,
    context: Record<string, any>,
  ): string {
    const templatePath = path.join(
      process.cwd(),
      'src',
      'email',
      'templates',
      `${templateName}.html`,
    );

    return fs.readFileSync(templatePath, 'utf8').replace('{{code}}', context.code);;
  }
}