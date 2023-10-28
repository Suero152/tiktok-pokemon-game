import { io } from 'socket.io-client';

//const URL = process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:4000';
const server_ = io.connect('http://localhost:5000')

export const socket = server_;