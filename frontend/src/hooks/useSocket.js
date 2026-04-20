import { useEffect, useCallback } from 'react';
import { getSocket } from '../api/socket';

/**
 * Hook to listen for Socket.IO events and trigger callbacks.
 * @param {string} event - Event name to listen for
 * @param {function} callback - Callback function when event fires
 */
export default function useSocket(event, callback) {
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on(event, callback);
    return () => {
      socket.off(event, callback);
    };
  }, [event, callback]);
}
