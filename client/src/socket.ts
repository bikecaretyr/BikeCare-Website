import { io } from 'socket.io-client'
import { getToken } from './api/client'

export const socket = io('/', {
  auth: { token: getToken() },
  autoConnect: false,
})