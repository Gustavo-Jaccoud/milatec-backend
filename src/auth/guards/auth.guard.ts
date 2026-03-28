import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { Reflector } from "@nestjs/core";
import { UserRole } from "src/user/user-role.enum";

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private jwtService: JwtService,private reflector: Reflector) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
          context.getHandler(),
          context.getClass(),
        ]);
    
        if (!required || required.length === 0) return true;
        
    const request = context.switchToHttp().getRequest();

    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    
    try {
        const payload = await this.jwtService.verifyAsync(token, {
            secret: process.env.JWT_SECRET ||  'defaultSecret',
        });

        request['user'] = payload
    } catch {
        throw new UnauthorizedException();
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers['authorization']?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}