import "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
    tenantId?: string;
    tenantSlug?: string;
  }

  interface Session {
    user: {
      tenant: any;
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      tenantId?: string;
      tenantSlug?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    tenantId?: string;
    tenantSlug?: string;
  }
}