import jwt, { SignOptions, JwtPayload, Secret } from "jsonwebtoken";

type TPayload = { id: string };

const JWT_SECRET = (process.env.JWT_SECRET || 'default-secret-key') as Secret;

export const generateToken = (payload: TPayload, expiresIn: string): string => {
  // Explicitly type the options so TS picks correct overload
  const options: SignOptions = { expiresIn: expiresIn as any };
  return jwt.sign(payload, JWT_SECRET, options);
};

export const verifyToken = (token: string): TPayload => {
  const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & TPayload;
  return { id: decoded.id };
};
