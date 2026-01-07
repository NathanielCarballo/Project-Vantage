/**
 * Log-Metropolis Visual Cortex
 *
 * Real-time 3D visualization of system state.
 * Buildings represent services, their height = load, color = health.
 */

import { CityCanvas } from './components/canvas/CityCanvas';
import { StatusOverlay } from './components/ui/StatusOverlay';
import { useCityWebSocket } from './hooks/useCityWebSocket';

function App() {
  // Initialize WebSocket connection
  useCityWebSocket();

  return (
    <div className="w-screen h-screen relative overflow-hidden">
      {/* 3D City Visualization */}
      <CityCanvas showStats={import.meta.env.DEV} />

      {/* UI Overlay */}
      <StatusOverlay />

      {/* Title */}
      <div className="absolute bottom-4 right-4 z-10 font-mono text-xs text-white/30">
        LOG-METROPOLIS v0.3 | Visual Cortex
      </div>
    </div>
  );
}

export default App;
