import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from 'src/user/user-role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: { verifyAsync: jest.Mock };
  let reflector: { getAllAndOverride: jest.Mock };

  const createContext = (headers: Record<string, string> = {}): ExecutionContext => {
    const request = { headers, user: undefined as unknown };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  };

  beforeEach(() => {
    jwtService = { verifyAsync: jest.fn() };
    reflector = { getAllAndOverride: jest.fn() };
    guard = new AuthGuard(
      jwtService as unknown as JwtService,
      reflector as unknown as Reflector,
    );
  });

  it('permite acesso quando rota nao exige roles', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createContext();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('rejeita quando token Bearer ausente', async () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.USER]);
    const context = createContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejeita quando token e invalido', async () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.USER]);
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid'));
    const context = createContext({ authorization: 'Bearer bad-token' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('preenche request.user com payload valido', async () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.USER]);
    const payload = { email: 'user@test.com', role: UserRole.USER };
    jwtService.verifyAsync.mockResolvedValue(payload);
    const context = createContext({ authorization: 'Bearer valid-token' });
    const request = context.switchToHttp().getRequest();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual(payload);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  });
});
