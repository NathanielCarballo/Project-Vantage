/**
 * StatusOverlay Component
 *
 * Shows connection status and building count in the corner of the screen.
 */

import { useCityStore } from '../../stores/cityStore';

const STATUS_COLORS: Record<string, string> = {
  connecting: 'bg-yellow-500',
  connected: 'bg-green-500',
  disconnected: 'bg-gray-500',
  error: 'bg-red-500',
};

const STATUS_TEXT: Record<string, string> = {
  connecting: 'Connecting...',
  connected: 'Connected',
  disconnected: 'Disconnected',
  error: 'Error',
};

export function StatusOverlay() {
  const connectionStatus = useCityStore((s) => s.connectionStatus);
  const errorMessage = useCityStore((s) => s.errorMessage);
  const buildingCount = useCityStore((s) => s.buildingNames.length);

  return (
    <div className="absolute bottom-4 left-4 z-10 font-mono text-sm">
      {/* Connection status */}
      <div className="flex items-center gap-2 bg-black/80 backdrop-blur px-4 py-3 rounded-lg text-white">
        <span
          className={`w-2 h-2 rounded-full ${STATUS_COLORS[connectionStatus]} ${connectionStatus === 'connecting' ? 'animate-pulse' : ''
            }`}
        />
        <span>{STATUS_TEXT[connectionStatus]}</span>
        {buildingCount > 0 && (
          <span className="text-white/60 ml-2">
            | {buildingCount} service{buildingCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="mt-2 bg-red-900/60 backdrop-blur px-3 py-2 rounded-lg text-red-200 max-w-xs">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
