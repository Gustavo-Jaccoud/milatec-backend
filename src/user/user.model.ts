import { UserRole } from "./user-role.enum";

export class User{
    constructor(
    public name: string,
    public email: string,
    public role: UserRole,
    public isActive: boolean = true,
    public id?: string
  ) {}
}