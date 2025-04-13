import { jwtDecode } from 'jwt-decode';

export const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

export const getUserFromToken = () => {
  const token = getToken();
  if (!token) return null;
  
  try {
    const decoded = jwtDecode(token);
    return decoded;
  } catch (error) {
    console.error('Invalid token format', error);
    return null;
  }
};

export const isTokenExpired = () => {
  try {
    const token = getToken();
    if (!token) return true;
    
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    
    return decoded.exp < currentTime;
  } catch {
    return true;
  }
};

export const isAuthenticated = () => {
  return !!getToken() && !isTokenExpired();
};