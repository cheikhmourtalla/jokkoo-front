export type UserRole = "admin" | "employee";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
};

export const getStoredUser = (): AuthUser | null => {
  const rawUser = localStorage.getItem("user");

  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch {
    return null;
  }
};

export const isAdmin = (): boolean => {
  const user = getStoredUser();
  return user?.role === "admin";
};

export const isEmployee = (): boolean => {
  const user = getStoredUser();
  return user?.role === "employee";
};