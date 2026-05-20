import { UserRole } from 'src/user/user-role.enum';
import { User } from 'src/user/user.model';

export const userRegular = new User(
  'Usuario Teste',
  'usuario@milatec.com',
  true,
  UserRole.USER,
  'recOAwFNXjz1CgW6O',
);

export const userAdmin = new User(
  'Admin Teste',
  'admin@milatec.com',
  true,
  UserRole.ADMIN,
  'recOAwFNXjz1CgW6O',
);
