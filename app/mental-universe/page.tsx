'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with Three.js
const MentalUniverseClient = dynamic(
  () => import('@/components/mental-universe/MentalUniverse').then(mod => ({ default: mod.MentalUniverse })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-center">
          <div className="text-2xl text-white mb-4">Mental Universe</div>
          <div className="text-gray-400">Initializing 3D environment...</div>
        </div>
      </div>
    )
  }
);

export default function MentalUniversePage() {
  const [config, setConfig] = useState({
    enableGalaxy: true,
    enableEmotions: true,
    enableMindGraph: true,
    enableThoughts: true,
    aiReasoning: true,
    maxEntities: 200
  });

  const [showControls, setShowControls] = useState(true);

  return (
    <main className="mental-universe-page">
      <div className="universe-container">
        <MentalUniverseClient
          enableGalaxy={config.enableGalaxy}
          enableEmotions={config.enableEmotions}
          enableMindGraph={config.enableMindGraph}
          enableThoughts={config.enableThoughts}
          aiReasoning={config.aiReasoning}
          maxEntities={config.maxEntities}
          className="universe-canvas"
        />
      </div>

      {/* Control panel */}
      {showControls && (
        <div className="control-panel">
          <div className="panel-header">
            <h2>Mental Universe Controls</h2>
            <button
              className="toggle-btn"
              onClick={() => setShowControls(false)}
            >
              ×
            </button>
          </div>

          <div className="panel-section">
            <h3>Visualization Modules</h3>

            <label className="control-item">
              <input
                type="checkbox"
                checked={config.enableGalaxy}
                onChange={(e) => setConfig({ ...config, enableGalaxy: e.target.checked })}
              />
              <span>Mental Galaxy</span>
              <small>Celestial psychological objects</small>
            </label>

            <label className="control-item">
              <input
                type="checkbox"
                checked={config.enableEmotions}
                onChange={(e) => setConfig({ ...config, enableEmotions: e.target.checked })}
              />
              <span>Emotion Fluid</span>
              <small>Animated liquid blobs</small>
            </label>

            <label className="control-item">
              <input
                type="checkbox"
                checked={config.enableMindGraph}
                onChange={(e) => setConfig({ ...config, enableMindGraph: e.target.checked })}
              />
              <span>Mind Graph</span>
              <small>Neural network visualization</small>
            </label>

            <label className="control-item">
              <input
                type="checkbox"
                checked={config.enableThoughts}
                onChange={(e) => setConfig({ ...config, enableThoughts: e.target.checked })}
              />
              <span>Thought Bubbles</span>
              <small>Floating thought field</small>
            </label>
          </div>

          <div className="panel-section">
            <h3>AI Features</h3>

            <label className="control-item">
              <input
                type="checkbox"
                checked={config.aiReasoning}
                onChange={(e) => setConfig({ ...config, aiReasoning: e.target.checked })}
              />
              <span>AI Reasoning</span>
              <small>Dynamic cognitive activation</small>
            </label>
          </div>

          <div className="panel-section">
            <h3>Performance</h3>

            <div className="control-item">
              <label>Max Entities</label>
              <input
                type="range"
                min="50"
                max="500"
                step="50"
                value={config.maxEntities}
                onChange={(e) => setConfig({ ...config, maxEntities: parseInt(e.target.value) })}
              />
              <span>{config.maxEntities}</span>
            </div>
          </div>

          <div className="panel-section">
            <button
              className="reset-btn"
              onClick={() => setConfig({
                enableGalaxy: true,
                enableEmotions: true,
                enableMindGraph: true,
                enableThoughts: true,
                aiReasoning: true,
                maxEntities: 200
              })}
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      )}

      {/* Show controls button when hidden */}
      {!showControls && (
        <button
          className="show-controls-btn"
          onClick={() => setShowControls(true)}
        >
          ⚙️ Controls
        </button>
      )}

      <style jsx>{`
        .mental-universe-page {
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: #0a0a0f;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .universe-container {
          width: 100%;
          height: 100%;
          position: relative;
        }

        .universe-canvas {
          width: 100%;
          height: 100%;
        }

        .control-panel {
          position: absolute;
          top: 20px;
          right: 20px;
          width: 320px;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(20px);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 20px;
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .panel-header h2 {
          font-size: 18px;
          font-weight: 600;
          color: white;
          margin: 0;
        }

        .toggle-btn {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          font-size: 24px;
          cursor: pointer;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .toggle-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .panel-section {
          margin-bottom: 24px;
        }

        .panel-section:last-child {
          margin-bottom: 0;
        }

        .panel-section h3 {
          font-size: 14px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          margin: 0 0 12px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .control-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          cursor: pointer;
          transition: background 0.2s;
        }

        .control-item:hover {
          background: rgba(255, 255, 255, 0.03);
          margin: 0 -12px;
          padding-left: 12px;
          padding-right: 12px;
          border-radius: 6px;
        }

        .control-item input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .control-item span {
          flex: 1;
          color: white;
          font-size: 14px;
          font-weight: 500;
        }

        .control-item small {
          display: block;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 2px;
        }

        .control-item input[type="range"] {
          flex: 1;
          height: 4px;
          -webkit-appearance: none;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
          outline: none;
        }

        .control-item input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
        }

        .control-item label {
          flex: 1;
          color: rgba(255, 255, 255, 0.7);
          font-size: 13px;
        }

        .control-item span:last-child {
          flex: 0;
          min-width: 40px;
          text-align: right;
          color: rgba(255, 255, 255, 0.8);
          font-weight: 600;
        }

        .reset-btn {
          width: 100%;
          padding: 12px;
          background: rgba(99, 102, 241, 0.2);
          border: 1px solid rgba(99, 102, 241, 0.4);
          color: white;
          font-size: 14px;
          font-weight: 500;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .reset-btn:hover {
          background: rgba(99, 102, 241, 0.3);
          border-color: rgba(99, 102, 241, 0.6);
        }

        .show-controls-btn {
          position: absolute;
          top: 20px;
          right: 20px;
          padding: 12px 20px;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          color: white;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .show-controls-btn:hover {
          background: rgba(0, 0, 0, 0.9);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .control-panel::-webkit-scrollbar {
          width: 6px;
        }

        .control-panel::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }

        .control-panel::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }

        .control-panel::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </main>
  );
}