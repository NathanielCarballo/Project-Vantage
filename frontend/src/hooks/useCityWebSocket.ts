/**
 * WebSocket Hook for City State Updates
 *
 * Connects to the backend and ingests data at 10Hz.
 * Updates the mutable cityStateRef WITHOUT triggering React re-renders
 * (except when new buildings spawn).
 */

import { useEffect, useRef } from 'react';
import { useCityStore, updateCityState } from '../stores/cityStore';
import type { CityStateMessage } from '../types';

/**
 * Determine WebSocket URL from environment or auto-detect.
 * - Uses VITE_API_URL if set
 * - Falls back to localhost:8000
 * - Auto-switches to wss:// if page is served over HTTPS
 */
function getWebSocketUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;

  if (envUrl) {
    return envUrl;
  }

  // Default fallback
  const defaultHost = 'localhost:8000';
  const wsPath = '/ws';

  // Auto-detect protocol based on page protocol
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const protocol = isSecure ? 'wss:' : 'ws:';

  return `${protocol}//${defaultHost}${wsPath}`;
}

const WS_URL = getWebSocketUrl();
const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

export function useCityWebSocket(): void {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const isConnectingRef = useRef(false);

  // Initialize connection on mount - runs only once
  useEffect(() => {
    // Get store actions directly to avoid dependency issues
    const { setConnectionStatus, setErrorMessage, refreshBuildingList } =
      useCityStore.getState();

    function connect() {
      // Guard: Prevent duplicate connections
      if (isConnectingRef.current) {
        console.log('[CityWS] Connection already in progress, skipping');
        return;
      }

      // Guard: Already connected
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log('[CityWS] Already connected, skipping');
        return;
      }

      // Cleanup existing socket if in a bad state
      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent reconnect loop
        wsRef.current.close();
        wsRef.current = null;
      }

      isConnectingRef.current = true;
      setConnectionStatus('connecting');
      setErrorMessage(null);

      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[CityWS] Connected to', WS_URL);
          isConnectingRef.current = false;
          setConnectionStatus('connected');
          setErrorMessage(null);
          reconnectAttempts.current = 0;
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as CityStateMessage;

            if (message.buildings && typeof message.buildings === 'object') {
              // Update mutable state (no React re-render unless new buildings)
              updateCityState(message.buildings, refreshBuildingList);
            }
          } catch (err) {
            console.error('[CityWS] Failed to parse message:', err);
          }
        };

        ws.onerror = (event) => {
          console.error('[CityWS] WebSocket error:', event);
          isConnectingRef.current = false;
          setConnectionStatus('error');
          setErrorMessage('WebSocket connection error');
        };

        ws.onclose = (event) => {
          console.log('[CityWS] Connection closed:', event.code, event.reason);
          isConnectingRef.current = false;
          wsRef.current = null;
          setConnectionStatus('disconnected');

          // Attempt reconnection with backoff
          if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts.current += 1;
            const delay = RECONNECT_DELAY_MS * Math.min(reconnectAttempts.current, 5);

            console.log(
              `[CityWS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})`
            );

            reconnectTimeoutRef.current = window.setTimeout(() => {
              connect();
            }, delay);
          } else {
            setErrorMessage(
              `Failed to connect after ${MAX_RECONNECT_ATTEMPTS} attempts. Is the backend running?`
            );
          }
        };
      } catch (err) {
        console.error('[CityWS] Failed to create WebSocket:', err);
        isConnectingRef.current = false;
        setConnectionStatus('error');
        setErrorMessage('Failed to create WebSocket connection');
      }
    }

    // Start connection
    connect();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent reconnect on intentional close
        wsRef.current.close();
        wsRef.current = null;
      }
      isConnectingRef.current = false;
    };
  }, []); // Empty deps - run only on mount
}
