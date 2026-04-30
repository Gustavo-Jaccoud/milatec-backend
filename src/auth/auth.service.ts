import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dtos/login.dto';
import { UserService } from 'src/user/user.service';
import { EmailService } from 'src/email/email.service';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { User } from 'src/user/user.model';
import { AuditService } from 'src/audit/audit.service';




@Injectable()
export class AuthService {
    constructor(
        private jwtService: JwtService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private userService: UserService,
        private emailService: EmailService,
        private auditService: AuditService,) { }

    async login(loginDto: LoginDto) {
        const userExists = await this.userService.getUser(loginDto.email);
        if (!userExists || !userExists.active) {
            await this.auditService.log({
                eventType: 'AUTH_LOGIN_FAILED',
                actorEmail: loginDto.email,
                actorRole: userExists?.role,
                actorTenantId: userExists?.idEmpresa,
                httpMethod: 'POST',
                route: '/auth/login',
                entity: 'auth',
                statusCode: 401,
                errorMessage: 'Invalid credentials',
            });
            throw new UnauthorizedException('Invalid credentials');
        }
        const cachedCode = await this.cacheManager.get<string>(loginDto.email);

        if (!loginDto.code && !cachedCode) {
            this.sendVerificationCode(loginDto.email)
            return { message: 'O código de verificação foi enviado para o seu e-mail.'};
        }
      
        try {
            if (cachedCode === loginDto.code) {
           
                const accessToken = await this.generateToken(userExists);
                this.cacheManager.del(loginDto.email);

                await this.auditService.log({
                    eventType: 'AUTH_LOGIN_SUCCESS',
                    actorEmail: userExists.email,
                    actorRole: userExists.role,
                    actorTenantId: userExists.idEmpresa,
                    httpMethod: 'POST',
                    route: '/auth/login',
                    entity: 'auth',
                    statusCode: 200,
                });

                return { accessToken };
            }

        } catch (error) {
            await this.auditService.log({
                eventType: 'AUTH_LOGIN_FAILED',
                actorEmail: loginDto.email,
                actorRole: userExists.role,
                actorTenantId: userExists.idEmpresa,
                httpMethod: 'POST',
                route: '/auth/login',
                entity: 'auth',
                statusCode: 401,
                errorName: (error as Error)?.name,
                errorMessage: (error as Error)?.message ?? 'Invalid credentials',
            });
            throw new UnauthorizedException('Invalid credentials');
        }

        await this.auditService.log({
            eventType: 'AUTH_LOGIN_FAILED',
            actorEmail: loginDto.email,
            actorRole: userExists.role,
            actorTenantId: userExists.idEmpresa,
            httpMethod: 'POST',
            route: '/auth/login',
            entity: 'auth',
            statusCode: 401,
            errorMessage: 'Verification code mismatch',
        });

        throw new UnauthorizedException('Invalid credentials');


    }

    private async sendVerificationCode(email: string) {
        const code = this.generateCode();
        await this.cacheManager.set(email, code, 60000)
        this.emailService.sendEmail(email, code)
    }
    private generateCode(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    }

    private async generateToken(user: User): Promise<string> {
        const acessToken = await this.jwtService.signAsync({
            name: user.name,
            email: user.email,
            role: user.role,
            idEmpresa: user.idEmpresa
        });
        return acessToken;
    }
}