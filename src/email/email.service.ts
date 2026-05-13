import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { Injectable, Logger, Optional } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private mailerService: MailerService,
    @Optional() private configService?: ConfigService,
  ) {}

  async sendEmail(to: string, code: string): Promise<void> {
    if (this.isConsoleDeliveryEnabled()) {
      this.logger.warn(
        `MAIL_DELIVERY_MODE=console ativo; PIN de desenvolvimento para ${to}: ${code}`,
      );
      return;
    }

    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Codigo de Confirmacao MilaTec',
        template: 'CodeEmailTemplate',
        context: {
          code,
        },
      });
    } catch (error) {
      this.logger.error(
        `Falha ao enviar e-mail de verificacao para ${to}`,
        (error as Error)?.stack,
      );
      throw error;
    }

    this.logger.log(`E-mail de verificacao enviado para ${to}`);
  }

  private isConsoleDeliveryEnabled(): boolean {
    const deliveryMode = this.getConfigValue('MAIL_DELIVERY_MODE')
      ?.trim()
      .toLowerCase();
    const nodeEnv = this.getConfigValue('NODE_ENV');

    return deliveryMode === 'console' && nodeEnv !== 'production';
  }

  private getConfigValue(key: string): string | undefined {
    return this.configService?.get<string>(key) ?? process.env[key];
  }
}
