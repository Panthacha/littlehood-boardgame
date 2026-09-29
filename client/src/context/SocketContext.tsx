import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents, Session } from '../types';

interface SocketContextType {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  session: Session | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  session: null,
  connected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Connect to deployed backend if VITE_API_URL exists, otherwise local
    const backendUrl = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`;
    const newSocket = io(backendUrl);

    newSocket.on('connect', () => {
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    newSocket.on('gameStateUpdate', (newSession) => {
      setSession(newSession);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, session, connected }}>
      {children}
    </SocketContext.Provider>
  );
};
