import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from 'src/user/user-role.enum';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  const createContext = (user?: { role?: UserRole; roles?: UserRole[] }) => {
    const request = { user };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('permite quando rota nao exige roles', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createContext();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('permite quando usuario tem role exigida', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.USER]);
    const context = createContext({ role: UserRole.USER });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('bloqueia quando usuario nao tem role exigida', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const context = createContext({ role: UserRole.USER });

    expect(guard.canActivate(context)).toBe(false);
  });

  it('aceita lista de roles no payload', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const context = createContext({ roles: [UserRole.ADMIN, UserRole.USER] });

    expect(guard.canActivate(context)).toBe(true);
  });
});
