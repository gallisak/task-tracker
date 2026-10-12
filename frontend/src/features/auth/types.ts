export interface User {
  id: string
  email: string
  name: string
  createdAt: string
}

export interface AuthResponse {
  accessToken: string
  user: User
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput extends LoginInput {
  name: string
}
