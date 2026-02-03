
// Stub auth config for frontend-only build
export const authOptions = {
  providers: [],
  session: { strategy: 'jwt' as const },
  pages: {
    signIn: '/login',
  },
};
export { authOptions as default };
