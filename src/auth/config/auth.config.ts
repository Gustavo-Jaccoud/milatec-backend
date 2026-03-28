
export const configs = {
    global: true,
    secret: process.env.JWT_SECRET!,
    signOptions: { expiresIn: 60}
}