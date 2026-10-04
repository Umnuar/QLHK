import crypto from "crypto";
import jwt from "jsonwebtoken";
import { config } from "../config/env";

export interface TokenPayload {
	id: string;
	username: string;
	role: "admin" | "user";
	village_id: string | null;
	jti?: string;
}

export function generateAccessToken(payload: TokenPayload): string {
	return jwt.sign(payload, config.jwtSecret, { expiresIn: "15m" });
}

export function generateRefreshToken(payload: TokenPayload): string {
	return jwt.sign(
		{ ...payload, jti: crypto.randomUUID() },
		config.jwtRefreshSecret,
		{
			expiresIn: "7d",
		},
	);
}

export function verifyAccessToken(token: string): TokenPayload {
	return jwt.verify(token, config.jwtSecret) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
	return jwt.verify(token, config.jwtRefreshSecret) as TokenPayload;
}
