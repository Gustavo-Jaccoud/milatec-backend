import { UserRole } from "./user-role.enum";

export class User{
    constructor(
    public name: string,
    public email: string,
    public role: UserRole,
    public idEmpresa: string,
    public id?: string
  ) {}
}