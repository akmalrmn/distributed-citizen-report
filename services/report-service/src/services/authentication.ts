import { pool } from '../db/connection';
import bcrypt from "bcryptjs";

export interface LoginCredentials {
    email: string
    username: string
}

export interface RegisterCredentials {
    email: string,
    password: string,
    username: string,
}

export async function checkEmail(cred: LoginCredentials) {
    const { email, username } = cred;

    const result = await pool.query(
        `SELECT * FROM accounts WHERE email=$1 AND username=$2`,
        [
            email,
            username
        ]
    )

    return result;
}

export async function checkPassword(pass_input: string, pass_checked: string): Promise<Boolean> {
    return bcrypt.compare(pass_input, pass_checked);
}

export async function createAccount(cred: RegisterCredentials) {
    const  { email, password, username } = cred;

    const email_check = await checkEmail({email, username});

    if (email_check.rows.length > 0) {
        throw new Error("Email already registered");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
        `
        INSERT INTO accounts (email, password_hash, username)
        VALUES ($1, $2, $3)
        RETURNING id, email, username, role, created_at
        `,
        [email, passwordHash, username]
    );

    return result.rows[0];
}