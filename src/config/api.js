const currentHost = window.location.hostname;
const currentProtocol = window.location.protocol;

export const API_BASE = import.meta.env.VITE_API_BASE_URL || `${currentProtocol}//${currentHost}:3001/api`;
export const IA_BASE = import.meta.env.VITE_IA_BASE_URL || `${currentProtocol}//${currentHost}:5000`;
