const API_URL = import.meta.env.VITE_API_URL || '';

export interface Account {
  email: string;
  username: string;
  password: string;
}

export interface RegisterAccount {
  email: string;
  username: string;
  password: string;
  confirm_password: string;
}

export interface User {
  userId: string;
  username: string;
  role?: string;
}

export async function login(cred: Account) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({
        email: cred.email,
        password: cred.password,
        username: cred.username
    })
  });

  return res;
}

export async function register(cred: RegisterAccount) {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({
        email: cred.email,
        password: cred.password,
        username: cred.username
    })
  });

  return res;
}

export async function logout() {
  const res = await fetch(`${API_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include'
  });
  return res;
}

export async function getme() {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    },
    credentials: "include"
  })
  return res;
}