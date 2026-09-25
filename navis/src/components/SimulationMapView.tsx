/**
 * SimulationMapView.tsx
 *
 * Immersive 3D Driving Simulation Environment (Three.js WebGL).
 *
 * Key Capabilities:
 * - Google Maps 3D Driving Perspective (dynamic forward chase view with depth & parallax)
 * - Highly visible, unmistakable multi-road tunnel fork (distinct Left Bypass vs Right Main Expressway branches)
 * - Interactive Decision Dialog Box at the tunnel junction:
 *     - Vehicle stops completely at the fork
 *     - Interactive dialog explains the decision and sensor heuristics (Gyroscope yaw, Accelerometer speed, Magnetometer azimuth)
 *     - Clicking [ PROCEED / NEXT ▶ ] resumes vehicle driving through the selected right tunnel tube
 * - Dramatic, clear right turn with curved asphalt roadbed, curved tunnel ribs, glowing green chevron signs, and steering wheels
 * - Prominent Entrance & Exit portals with flashing hazard beacons
 * - 100% flicker-free 60 FPS animation with pre-allocated geometries
 */

import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { LatLng, SIMULATION_ROUTE } from '../data/simulationRoute';
import { SimulationFrame } from '../services/simulationEngine';
import { colors } from '../theme/colors';

interface SimulationMapViewProps {
  frame: SimulationFrame;
  isPresentationMode?: boolean;
  style?: object;
  onMapReady?: () => void;
  onForkDecisionPause?: () => void;
  onForkDecisionResume?: () => void;
  disableForkDecision?: boolean;
}

function buildSimulationHtml(center: LatLng, disableForkDecision: boolean): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>3D GNSS Dead Reckoning Simulation</title>
  <!-- Three.js r128 -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <!-- Leaflet.js for OpenStreetMap Inset Map (Ref Design) -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      background: #050811;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    #canvas-container {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
    }

    /* ── High-Tech Floating 3D HUD ─────────────────────────────────────── */
    #hud-overlay {
      position: absolute;
      top: 10px;
      left: 10px;
      right: 10px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      pointer-events: none;
      z-index: 100;
    }

    .hud-card {
      background: rgba(11, 15, 25, 0.92);
      border: 1px solid rgba(99, 102, 241, 0.45);
      border-radius: 10px;
      padding: 7px 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.6), inset 0 1px 2px rgba(255,255,255,0.1);
      backdrop-filter: blur(8px);
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .hud-stat { display: flex; flex-direction: column; gap: 1px; }
    .hud-label { font-size: 7.5px; font-weight: 800; color: #94a3b8; letter-spacing: 0.8px; text-transform: uppercase; }
    .hud-val { font-size: 12px; font-weight: 900; color: #38bdf8; font-family: 'Courier New', monospace; }

    .hud-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
      pointer-events: auto;
    }

    .camera-btn {
      background: rgba(15, 23, 42, 0.90);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: #f8fafc;
      font-size: 9px;
      font-weight: 800;
      padding: 5px 10px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.2s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    }
    .camera-btn:hover { background: #4f46e5; border-color: #818cf8; }
    .camera-btn.active { background: #4f46e5; border-color: #818cf8; box-shadow: 0 0 10px rgba(99,102,241,0.5); }

    /* ── OpenStreetMap Mini-Map Inset (Ref Design) ───────────────────── */
    #minimap-card {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 145px;
      height: 145px;
      border-radius: 16px;
      border: 3px solid rgba(255, 255, 255, 0.95);
      box-shadow: 0 10px 28px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.3);
      overflow: hidden;
      z-index: 180;
      pointer-events: auto;
      background: #f8fafc;
    }

    #minimap-header-label {
      position: absolute;
      top: 6px;
      left: 6px;
      z-index: 500;
      background: rgba(255, 255, 255, 0.92);
      color: #3b82f6;
      font-size: 10px;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 6px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    #minimap-container {
      width: 100%;
      height: 100%;
    }

    .minimap-dot {
      width: 14px;
      height: 14px;
      background-color: #2563eb;
      border: 2.5px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 0 10px rgba(37, 99, 235, 0.9);
      position: relative;
    }

    .minimap-pulse {
      position: absolute;
      top: -4px;
      left: -4px;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: rgba(37, 99, 235, 0.35);
      animation: miniPulse 1.8s infinite ease-out;
    }

    @keyframes miniPulse {
      0% { transform: scale(0.5); opacity: 1; }
      100% { transform: scale(1.6); opacity: 0; }
    }

    /* ── Re-center floating button ─────────────────────────────────── */
    #recenter-btn {
      position: absolute;
      bottom: 18px;
      right: 14px;
      background: rgba(15, 23, 42, 0.92);
      border: 1.5px solid rgba(255,255,255,0.35);
      color: #f8fafc;
      font-size: 18px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      display: none;
      align-items: center;
      justify-content: center;
      box-shadow: 0 3px 14px rgba(0,0,0,0.55);
      z-index: 200;
      transition: all 0.2s ease;
      pointer-events: auto;
    }
    #recenter-btn:hover { background: #4f46e5; border-color: #818cf8; }
    #recenter-btn.visible { display: flex; }

    .state-badge {
      background: #4f46e5;
      color: #ffffff;
      font-size: 8.5px;
      font-weight: 900;
      padding: 4px 8px;
      border-radius: 6px;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      box-shadow: 0 0 12px rgba(79, 70, 229, 0.5);
      border: 1px solid rgba(255,255,255,0.4);
    }

    /* ── Interactive Tunnel Decision Dialog Modal ──────────────────────── */
    #decision-dialog-backdrop {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(5, 8, 17, 0.76);
      backdrop-filter: blur(6px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 500;
    }

    .decision-dialog {
      background: rgba(15, 23, 42, 0.97);
      border: 2px solid #f59e0b;
      border-radius: 16px;
      padding: 16px 20px;
      width: 92%;
      max-width: 440px;
      box-shadow: 0 16px 40px rgba(0,0,0,0.85), 0 0 32px rgba(245, 158, 11, 0.45);
      display: flex;
      flex-direction: column;
      gap: 12px;
      animation: dialogPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    @keyframes dialogPop {
      from { opacity: 0; transform: scale(0.92); }
      to   { opacity: 1; transform: scale(1.0); }
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(245, 158, 11, 0.3);
      padding-bottom: 8px;
    }
    .dialog-badge {
      background: #f59e0b;
      color: #0f172a;
      font-size: 9px;
      font-weight: 900;
      padding: 2px 7px;
      border-radius: 4px;
      letter-spacing: 0.6px;
    }
    .dialog-title {
      color: #fde68a;
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 0.5px;
    }

    .decision-row {
      display: flex;
      gap: 8px;
      background: rgba(30, 41, 59, 0.7);
      padding: 10px 12px;
      border-radius: 8px;
      border-left: 4px solid #10b981;
    }
    .decision-text { color: #f8fafc; font-size: 11px; line-height: 16px; }
    .decision-highlight { color: #34d399; font-weight: 800; }

    .heuristics-box {
      background: rgba(11, 15, 25, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 9px 12px;
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    .heuristics-title { font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.6px; }
    .heuristic-item { display: flex; gap: 6px; font-size: 9.5px; color: #cbd5e1; line-height: 14px; }
    .heuristic-bullet { color: #f59e0b; font-weight: bold; }

    .next-btn {
      background: linear-gradient(135deg, #10b981, #059669);
      border: 1.5px solid #6ee7b7;
      color: #ffffff;
      font-size: 13px;
      font-weight: 900;
      padding: 12px 20px;
      border-radius: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      box-shadow: 0 4px 16px rgba(16, 185, 129, 0.5);
      transition: all 0.2s ease;
      letter-spacing: 0.8px;
      animation: pulseBtn 1.8s infinite;
    }
    .next-btn:hover { background: #34d399; transform: translateY(-1px); }
    @keyframes pulseBtn {
      0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { box-shadow: 0 0 0 14px rgba(16, 185, 129, 0); }
      100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
  </style>
</head>
<body>
  <div id="canvas-container"></div>

  <!-- HUD Telemetry Overlay -->
  <div id="hud-overlay">
    <div class="hud-card">
      <div class="hud-stat">
        <span class="hud-label">GNSS SATS</span>
        <span class="hud-val" id="hud-sats">14 🛰️</span>
      </div>
      <div class="hud-stat">
        <span class="hud-label">DR DRIFT</span>
        <span class="hud-val" id="hud-drift" style="color: #f59e0b;">0.0 m</span>
      </div>
      <div class="hud-stat">
        <span class="hud-label">SPEED</span>
        <span class="hud-val" id="hud-speed">48 km/h</span>
      </div>
      <div class="hud-stat">
        <span class="hud-label">PROGRESS</span>
        <span class="hud-val" id="hud-progress">0%</span>
      </div>
    </div>

    <div class="hud-right" style="margin-top: 155px;">
      <div class="state-badge" id="hud-state">GNSS ACTIVE</div>
      <div style="display:flex;gap:4px;">
        <button class="camera-btn active" id="btn-3d" onclick="setCameraMode('DRIVE3D')">🧭 3D</button>
        <button class="camera-btn" id="btn-2d" onclick="setCameraMode('TOP')">🗺 2D</button>
      </div>
    </div>
  </div>

  <!-- OpenStreetMap Mini-Map Inset (Ref Design) -->
  <div id="minimap-card">
    <div id="minimap-header-label">33rd Street</div>
    <div id="minimap-container" style="position: relative; width: 100%; height: 100%;">
      <!-- High-Tech OpenStreetMap SVG Fallback -->
      <svg id="minimap-svg" viewBox="0 0 160 160" style="position: absolute; top:0; left:0; width:100%; height:100%; background: #f1f5f9; z-index: 1;">
        <rect x="0" y="0" width="160" height="160" fill="#f1f5f9"/>
        <rect x="10" y="10" width="60" height="48" fill="#e2e8f0" rx="4"/>
        <rect x="82" y="10" width="68" height="38" fill="#fbcfe8" opacity="0.65" rx="4"/>
        <text x="92" y="31" font-size="8" font-family="sans-serif" font-weight="bold" fill="#be185d">Korea Town</text>
        <rect x="10" y="72" width="55" height="78" fill="#e2e8f0" rx="4"/>
        <rect x="80" y="78" width="70" height="72" fill="#e2e8f0" rx="4"/>

        <!-- Road Network -->
        <path d="M 0 65 L 160 65" stroke="#ffffff" stroke-width="15"/>
        <path d="M 0 65 L 160 65" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="3,3"/>
        <text x="80" y="61" font-size="7.5" font-family="sans-serif" font-weight="bold" fill="#475569">W 31st Street</text>

        <path d="M 0 142 L 160 142" stroke="#ffffff" stroke-width="12"/>
        <text x="75" y="139" font-size="7" font-family="sans-serif" fill="#64748b">West 30th St</text>

        <path d="M 70 0 L 70 160" stroke="#ffffff" stroke-width="15"/>
        <text x="73" y="115" font-size="7.5" font-family="sans-serif" font-weight="bold" fill="#3b82f6" transform="rotate(90, 73, 115)">33rd Street</text>

        <!-- Pre-tunnel Route Path Polyline -->
        <path d="M 20 142 L 65 72" stroke="#4f46e5" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>

        <!-- HIGHLIGHTED TUNNEL PATH SEGMENT (Amber Dashed) -->
        <path d="M 65 72 L 108 38" stroke="#f59e0b" stroke-width="6" stroke-linecap="round" stroke-dasharray="6,4" fill="none"/>
        <text x="86" y="50" font-size="6.5" font-family="sans-serif" font-weight="extrabold" fill="#d97706" transform="rotate(-36, 86, 50)">TUNNEL</text>

        <!-- Post-tunnel Route Path Polyline -->
        <path d="M 108 38 L 142 16" stroke="#10b981" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>

        <!-- Position Marker -->
        <g id="svg-marker-group" transform="translate(65, 72)">
          <circle r="9" fill="#2563eb" opacity="0.35"/>
          <circle r="5.5" fill="#2563eb" stroke="#ffffff" stroke-width="2"/>
        </g>
      </svg>
      <div id="leaflet-minimap-div" style="position: absolute; top:0; left:0; width:100%; height:100%; z-index: 2;"></div>
    </div>
  </div>

  <!-- Re-center floating button (shown when user pans away) -->
  <button id="recenter-btn" onclick="recenterCamera()" title="Re-center on vehicle">◎</button>

  <!-- Interactive Tunnel Fork Decision Dialog Modal -->
  <div id="decision-dialog-backdrop">
    <div class="decision-dialog">
      <div class="dialog-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 18px;">🔀</span>
          <span class="dialog-title">TUNNEL FORK SENSOR DECISION</span>
        </div>
        <span class="dialog-badge">GNSS: 0 SATS</span>
      </div>

      <div class="decision-row">
        <div class="decision-text">
          <div style="margin-bottom: 4px;">
            <span class="decision-highlight">DECISION:</span> Stay on <span class="decision-highlight">RIGHT MAIN TUBE (NH 275)</span>
          </div>
          <div style="color: #f87171; font-size: 10px;">
            REJECTED: Left Exit 4B Bypass (Off-route dead end)
          </div>
        </div>
      </div>

      <div class="heuristics-box">
        <span class="heuristics-title">WHY WAS THIS DECISION MADE? (SENSOR FUSION)</span>
        <div class="heuristic-item">
          <span class="heuristic-bullet">1.</span>
          <span><b>Gyroscope (ω_z = +0.038 rad/s):</b> Yaw rate detects rightward curvature entering the planned expressway tube.</span>
        </div>
        <div class="heuristic-item">
          <span class="heuristic-bullet">2.</span>
          <span><b>Accelerometer (Speed 48 km/h):</b> Continuous cruising speed profile, confirming no off-ramp deceleration.</span>
        </div>
        <div class="heuristic-item">
          <span class="heuristic-bullet">3.</span>
          <span><b>Magnetometer (Heading 274° → 288°):</b> Azimuth tracks the planned expressway bearing.</span>
        </div>
      </div>

      <button class="next-btn" onclick="dismissDecisionDialog()">
        <span>PROCEED / NEXT</span>
        <span style="font-size: 15px;">▶</span>
      </button>
    </div>
  </div>

  <script>
    // ─── 1. THREE.JS SCENE SETUP ──────────────────────────────────────────────
    var container = document.getElementById('canvas-container');
    var width = window.innerWidth;
    var height = window.innerHeight;

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060913);
    scene.fog = new THREE.FogExp2(0x060913, 0.002);

    // Google Navigation Perspective Camera (Forward Looking with Depth & Parallax)
    var camera = new THREE.PerspectiveCamera(56, width / height, 0.5, 1500);
    var renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // ─── 2. LIGHTING ─────────────────────────────────────────────────────────
    var ambientLight = new THREE.AmbientLight(0xdbeafe, 0.85);
    scene.add(ambientLight);

    var sunLight = new THREE.DirectionalLight(0xfff7ed, 1.4);
    sunLight.position.set(50, 180, 80);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);

    // ─── 3. ROAD & TUNNEL CONSTANTS & CURVE EQUATIONS ────────────────────────
    var ROAD_WIDTH = 13.5;
    var TOTAL_ROAD_LENGTH = 600;
    var TUNNEL_START_Z = 200;
    var TUNNEL_FORK_Z = 267; // Fork junction split point
    var HALT_Z = 284; // Point where simulation pauses for decision dialog
    var TUNNEL_CURVE_APEX_Z = 345;
    var TUNNEL_END_Z = 420;
    var TUNNEL_LENGTH = TUNNEL_END_Z - TUNNEL_START_Z; // 220 units (~320m)

    // Mathematical definition of the Main Route right turn:
    function getRouteX(z) {
      if (z <= 267) {
        return 0;
      } else if (z > 267 && z <= TUNNEL_CURVE_APEX_Z) {
        // Dramatic smooth S-curve right turn: X sweeps from 0 to +10.5
        var t = (z - 267) / (TUNNEL_CURVE_APEX_Z - 267);
        var s = (1 - Math.cos(t * Math.PI)) / 2;
        return s * 10.5;
      } else if (z > TUNNEL_CURVE_APEX_Z && z <= TUNNEL_END_Z) {
        // Smooth transition from apex X = +10.5 to exit portal X = +7.0
        var t2 = (z - TUNNEL_CURVE_APEX_Z) / (TUNNEL_END_Z - TUNNEL_CURVE_APEX_Z);
        return 10.5 - t2 * 3.5;
      } else {
        // Post-tunnel straight highway aligned with exit portal at X = +7.0
        return 7.0;
      }
    }

    function getRouteTangentAngle(z) {
      var dz = 0.4;
      var x1 = getRouteX(z - dz);
      var x2 = getRouteX(z + dz);
      return Math.atan2(x2 - x1, 2 * dz);
    }

    // Mathematical definition of the Left Bypass (Exit 4B):
    function getLeftBypassX(z) {
      if (z <= 267) return 0;
      var t = (z - 267) / 95;
      var s = (1 - Math.cos(Math.min(1, t) * Math.PI)) / 2;
      return -s * 19.0;
    }

    function getLeftBypassAngle(z) {
      var dz = 0.4;
      var x1 = getLeftBypassX(z - dz);
      var x2 = getLeftBypassX(z + dz);
      return Math.atan2(x2 - x1, 2 * dz);
    }

    // Helper: Build a curved road ribbon geometry with exact perpendicular width
    function createCurvedRoadMesh(startZ, endZ, width, curveFn, color, yOffset, opacity, roughness) {
      var steps = Math.max(16, Math.round((endZ - startZ) / 2.0));
      var numVertices = (steps + 1) * 2;
      var positions = new Float32Array(numVertices * 3);
      var indices = [];
      var uvs = new Float32Array(numVertices * 2);

      for (var i = 0; i <= steps; i++) {
        var t = i / steps;
        var z = startZ + t * (endZ - startZ);
        var x = curveFn(z);

        var dz = 0.3;
        var xPrev = curveFn(z - dz);
        var xNext = curveFn(z + dz);
        var angle = Math.atan2(xNext - xPrev, 2 * dz);

        var perpX = Math.cos(angle);
        var perpZ = -Math.sin(angle);
        var halfW = width / 2;
        var idx = i * 2;

        positions[idx * 3]     = x - perpX * halfW;
        positions[idx * 3 + 1] = yOffset;
        positions[idx * 3 + 2] = z - perpZ * halfW;

        positions[(idx + 1) * 3]     = x + perpX * halfW;
        positions[(idx + 1) * 3 + 1] = yOffset;
        positions[(idx + 1) * 3 + 2] = z + perpZ * halfW;

        uvs[idx * 2]     = 0;
        uvs[idx * 2 + 1] = t * 12;
        uvs[(idx + 1) * 2]     = 1;
        uvs[(idx + 1) * 2 + 1] = t * 12;

        if (i < steps) {
          var a = i * 2;
          var b = i * 2 + 1;
          var c = (i + 1) * 2;
          var d = (i + 1) * 2 + 1;
          indices.push(a, c, b);
          indices.push(b, c, d);
        }
      }

      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      geo.setIndex(indices);
      geo.computeVertexNormals();

      var mat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: roughness !== undefined ? roughness : 0.75,
        metalness: 0.15,
        transparent: opacity !== undefined && opacity < 1.0,
        opacity: opacity !== undefined ? opacity : 1.0,
        side: THREE.DoubleSide
      });

      var mesh = new THREE.Mesh(geo, mat);
      mesh.receiveShadow = true;
      return mesh;
    }

    // ─── 4. GROUND & ROADS ───────────────────────────────────────────────────
    // Ground plane
    var groundGeo = new THREE.PlaneGeometry(1200, 1200);
    var groundMat = new THREE.MeshStandardMaterial({ color: 0x0a0f1d, roughness: 0.95 });
    var ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.05, TOTAL_ROAD_LENGTH / 2);
    ground.receiveShadow = true;
    scene.add(ground);

    // 1. Pre-Tunnel & Approach Road: Z = -40 to Z = 267 (straight at X = 0)
    var approachRoadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, 307);
    var roadMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 });
    var approachRoad = new THREE.Mesh(approachRoadGeo, roadMat);
    approachRoad.rotation.x = -Math.PI / 2;
    approachRoad.position.set(0, 0, (267 - 40) / 2);
    approachRoad.receiveShadow = true;
    scene.add(approachRoad);

    // Pre-tunnel curbs
    var curbMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });
    var leftCurbGeo = new THREE.BoxGeometry(1.2, 0.35, 307);
    var leftCurb = new THREE.Mesh(leftCurbGeo, curbMat);
    leftCurb.position.set(-ROAD_WIDTH / 2 - 0.6, 0.15, (267 - 40) / 2);
    scene.add(leftCurb);

    var rightCurbGeo = new THREE.BoxGeometry(1.2, 0.35, 307);
    var rightCurb = new THREE.Mesh(rightCurbGeo, curbMat);
    rightCurb.position.set(ROAD_WIDTH / 2 + 0.6, 0.15, (267 - 40) / 2);
    scene.add(rightCurb);

    // Pre-tunnel yellow dashes
    var dashGroup = new THREE.Group();
    var dashMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
    for (var dz = 10; dz < 264; dz += 12) {
      var dGeo = new THREE.PlaneGeometry(0.35, 5.5);
      var dMesh = new THREE.Mesh(dGeo, dashMat);
      dMesh.rotation.x = -Math.PI / 2;
      dMesh.position.set(0, 0.02, dz);
      dashGroup.add(dMesh);
    }
    scene.add(dashGroup);

    // 2. Post-Tunnel Straight Road: Z = 420 to Z = 640 (straight at X = 7.0)
    var postRoadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, 220);
    var postRoad = new THREE.Mesh(postRoadGeo, roadMat);
    postRoad.rotation.x = -Math.PI / 2;
    postRoad.position.set(7.0, 0, (420 + 640) / 2);
    postRoad.receiveShadow = true;
    scene.add(postRoad);

    var postLeftCurb = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 220), curbMat);
    postLeftCurb.position.set(7.0 - ROAD_WIDTH / 2 - 0.6, 0.15, (420 + 640) / 2);
    scene.add(postLeftCurb);

    var postRightCurb = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 220), curbMat);
    postRightCurb.position.set(7.0 + ROAD_WIDTH / 2 + 0.6, 0.15, (420 + 640) / 2);
    scene.add(postRightCurb);

    for (var pdz = 425; pdz < 635; pdz += 12) {
      var pdMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 5.5), dashMat);
      pdMesh.rotation.x = -Math.PI / 2;
      pdMesh.position.set(7.0, 0.02, pdz);
      scene.add(pdMesh);
    }

    // ─── 5. DRAMATIC & CLEAR MULTI-ROAD TUNNEL BIFURCATION (FORK & TURN) ─────
    var forkGroup = new THREE.Group();

    // 1. Right Main Route Road (The Dramatic Right Turn): Z = 267 to Z = 425
    var rightTurnRoad = createCurvedRoadMesh(266, 422, 12.0, getRouteX, 0x1e293b, 0.015);
    forkGroup.add(rightTurnRoad);

    // Yellow dashed lane lines along the curve
    for (var rz = 268; rz < 418; rz += 9) {
      var rx = getRouteX(rz);
      var rAngle = getRouteTangentAngle(rz);
      var rdMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 4.5), dashMat);
      rdMesh.rotation.x = -Math.PI / 2;
      rdMesh.rotation.z = -rAngle;
      rdMesh.position.set(rx, 0.035, rz);
      forkGroup.add(rdMesh);
    }

    // Curved Left and Right Curbs along the Right Turn
    function getRightRouteInnerCurb(z) { return getRouteX(z) - 6.4; }
    function getRightRouteOuterCurb(z) { return getRouteX(z) + 6.4; }
    var innerCurbMesh = createCurvedRoadMesh(267, 420, 0.8, getRightRouteInnerCurb, 0x475569, 0.12, 1.0, 0.5);
    var outerCurbMesh = createCurvedRoadMesh(267, 420, 0.8, getRightRouteOuterCurb, 0x475569, 0.12, 1.0, 0.5);
    forkGroup.add(innerCurbMesh);
    forkGroup.add(outerCurbMesh);

    // Only add multi-road elements if fork decision is enabled
    if (!${disableForkDecision}) {
      // 2. Left Branch Road Surface (Clearly curving left at Z = 267 to 375)
      var leftBypassRoad = createCurvedRoadMesh(266, 375, 10.5, getLeftBypassX, 0x141a24, 0.012);
      forkGroup.add(leftBypassRoad);

      // Left branch red lane markings
      var leftDashMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      for (var lz = 268; lz < 370; lz += 10) {
        var lx = getLeftBypassX(lz);
        var lAngle = getLeftBypassAngle(lz);
        var ldMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 4.5), leftDashMat);
        ldMesh.rotation.x = -Math.PI / 2;
        ldMesh.rotation.z = -lAngle;
        ldMesh.position.set(lx, 0.03, lz);
        forkGroup.add(ldMesh);
      }

      // 3. Apex Concrete Crash Barrier Wedge with Hazard Stripes at Z = 270, X = 0
      var wedgeGeo = new THREE.CylinderGeometry(0.7, 2.2, 3.8, 6);
      var wedgeMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.45 });
      var wedge = new THREE.Mesh(wedgeGeo, wedgeMat);
      wedge.position.set(0, 1.9, 270);
      forkGroup.add(wedge);

      // Flashing Apex Hazard Light
      var apexLight = new THREE.PointLight(0xf59e0b, 1.6, 20, 1.5);
      apexLight.position.set(0, 4.2, 270);
      forkGroup.add(apexLight);

      // 4. Overhead Gantry Sign Spanning Both Tubes at Z = 265
      var forkCanvas = document.createElement('canvas');
      forkCanvas.width = 1024;
      forkCanvas.height = 256;
      var fctx = forkCanvas.getContext('2d');
      fctx.fillStyle = '#0b0f19';
      fctx.fillRect(0, 0, 1024, 256);
      fctx.strokeStyle = '#f59e0b';
      fctx.lineWidth = 14;
      fctx.strokeRect(7, 7, 1010, 242);

      fctx.fillStyle = '#ef4444';
      fctx.font = 'bold 44px Arial, sans-serif';
      fctx.fillText('⬅ EXIT 4B [BYPASS / REJECTED]', 28, 100);

      fctx.fillStyle = '#10b981';
      fctx.fillText('MAIN ROUTE · NH 275 [CHOSEN] ➡', 500, 100);

      fctx.fillStyle = '#fde68a';
      fctx.font = 'bold 30px Arial, sans-serif';
      fctx.fillText('DEAD RECKONING ACTIVE — SENSORS DETECT RIGHT TUBE CURVE', 45, 190);

      var forkSignTex = new THREE.CanvasTexture(forkCanvas);
      var forkSignMat = new THREE.MeshBasicMaterial({ map: forkSignTex });
      var forkSignMesh = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH + 14, 3.8), forkSignMat);
      forkSignMesh.position.set(0, 7.8, 265);
      forkGroup.add(forkSignMesh);

      // 5. Glowing Green Right-Turn Directional Arrows on Asphalt
      var greenArrowMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
      var turnArrowPositions = [274, 290, 310, 330];
      turnArrowPositions.forEach(function(az) {
        var ax = getRouteX(az);
        var aAngle = getRouteTangentAngle(az);
        var arrowMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 3.6), greenArrowMat);
        arrowMesh.rotation.x = -Math.PI / 2;
        arrowMesh.rotation.z = -aAngle;
        arrowMesh.position.set(ax, 0.04, az);
        forkGroup.add(arrowMesh);
      });
      
      // Add flashing beacon reference to global so animation doesn't fail
      window.apexLight = apexLight;
    }

    // 4. Overhead Gantry Sign Spanning Both Tubes at Z = 265
    var forkCanvas = document.createElement('canvas');
    forkCanvas.width = 1024;
    forkCanvas.height = 256;
    var fctx = forkCanvas.getContext('2d');
    fctx.fillStyle = '#0b0f19';
    fctx.fillRect(0, 0, 1024, 256);
    fctx.strokeStyle = '#f59e0b';
    fctx.lineWidth = 14;
    fctx.strokeRect(7, 7, 1010, 242);

    fctx.fillStyle = '#ef4444';
    fctx.font = 'bold 44px Arial, sans-serif';
    fctx.fillText('⬅ EXIT 4B [BYPASS / REJECTED]', 28, 100);

    fctx.fillStyle = '#10b981';
    fctx.fillText('MAIN ROUTE · NH 275 [CHOSEN] ➡', 500, 100);

    fctx.fillStyle = '#fde68a';
    fctx.font = 'bold 30px Arial, sans-serif';
    fctx.fillText('DEAD RECKONING ACTIVE — SENSORS DETECT RIGHT TUBE CURVE', 45, 190);

    var forkSignTex = new THREE.CanvasTexture(forkCanvas);
    var forkSignMat = new THREE.MeshBasicMaterial({ map: forkSignTex });
    var forkSignMesh = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH + 14, 3.8), forkSignMat);
    forkSignMesh.position.set(0, 7.8, 265);
    forkGroup.add(forkSignMesh);

    // 5. Glowing Green Right-Turn Directional Arrows on Asphalt
    var greenArrowMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    var turnArrowPositions = [274, 290, 310, 330];
    turnArrowPositions.forEach(function(az) {
      var ax = getRouteX(az);
      var aAngle = getRouteTangentAngle(az);
      var arrowMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 3.6), greenArrowMat);
      arrowMesh.rotation.x = -Math.PI / 2;
      arrowMesh.rotation.z = -aAngle;
      arrowMesh.position.set(ax, 0.04, az);
      forkGroup.add(arrowMesh);
    });

    // 6. Neon Green Right-Turn Chevron Panels (>>>) along Outer Curved Wall
    var chevronCanvas = document.createElement('canvas');
    chevronCanvas.width = 256;
    chevronCanvas.height = 128;
    var cctx = chevronCanvas.getContext('2d');
    cctx.fillStyle = '#064e3b';
    cctx.fillRect(0, 0, 256, 128);
    cctx.strokeStyle = '#34d399';
    cctx.lineWidth = 8;
    cctx.strokeRect(4, 4, 248, 120);
    cctx.fillStyle = '#10b981';
    cctx.font = 'bold 74px Arial, sans-serif';
    cctx.textAlign = 'center';
    cctx.fillText('▶▶▶', 128, 92);

    var chevronTex = new THREE.CanvasTexture(chevronCanvas);
    var chevronMat = new THREE.MeshBasicMaterial({ map: chevronTex, side: THREE.DoubleSide });
    var chevronPositions = [282, 300, 320, 340];
    chevronPositions.forEach(function(cz) {
      var cx = getRouteX(cz) + 6.8;
      var cAngle = getRouteTangentAngle(cz);
      var cMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.8), chevronMat);
      cMesh.position.set(cx, 3.2, cz);
      cMesh.rotation.y = -cAngle - Math.PI / 2;
      forkGroup.add(cMesh);

      var chevronLight = new THREE.PointLight(0x10b981, 0.8, 8, 1.8);
      chevronLight.position.set(cx - 0.5, 3.2, cz);
      forkGroup.add(chevronLight);
    });

    // 7. Left Branch Arched Tunnel Tube (Red Ambient Interior)
    if (!${disableForkDecision}) {
      var leftTubeGeo = new THREE.CylinderGeometry(6.5, 6.5, 105, 12, 1, true, 0, Math.PI);
      var leftTubeMat = new THREE.MeshStandardMaterial({
        color: 0x3b0718,
        roughness: 0.3,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide
      });
      var leftTube = new THREE.Mesh(leftTubeGeo, leftTubeMat);
      leftTube.rotation.z = Math.PI / 2;
      leftTube.rotation.y = Math.PI / 2 - 0.38;
      leftTube.position.set(-14, 0, 320);
      forkGroup.add(leftTube);
    }

    scene.add(forkGroup);

    // ─── 6. 3D TRANSLUCENT CUTAWAY TUNNEL TUBES & ARCH RIBS ──────────────────
    var tunnelGroup = new THREE.Group();

    // 1. Pre-fork Common Tunnel Tube (Z = 200 to Z = 267)
    var straightTubeGeo = new THREE.CylinderGeometry(
      ROAD_WIDTH / 2 + 1.6,
      ROAD_WIDTH / 2 + 1.6,
      67,
      16, 1, true, 0, Math.PI
    );
    var tunnelTubeMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      roughness: 0.3,
      metalness: 0.7,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
    });
    var straightTube = new THREE.Mesh(straightTubeGeo, tunnelTubeMat);
    straightTube.rotation.z = Math.PI / 2;
    straightTube.rotation.y = Math.PI / 2;
    straightTube.position.set(0, 0, (200 + 267) / 2);
    tunnelGroup.add(straightTube);

    // Common tube arch ribs
    var ribMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
    var lampMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });

    for (var tz = 212; tz < 265; tz += 18) {
      var archGeo = new THREE.TorusGeometry(ROAD_WIDTH / 2 + 1.5, 0.45, 8, 16, Math.PI);
      var archMesh = new THREE.Mesh(archGeo, ribMat);
      archMesh.position.set(0, 0, tz);
      tunnelGroup.add(archMesh);

      var lampMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 0.6), lampMat);
      lampMesh.position.set(0, 6.4, tz);
      tunnelGroup.add(lampMesh);

      var pLight = new THREE.PointLight(0xfbbf24, 0.8, 18, 1.6);
      pLight.position.set(0, 5.8, tz);
      tunnelGroup.add(pLight);
    }

    // 2. Right Curved Tube Arch Ribs along the Turn: Z = 268 to Z = 415
    for (var rtz = 274; rtz < 415; rtz += 14) {
      var rxPos = getRouteX(rtz);
      var rAngle = getRouteTangentAngle(rtz);

      var cArchGeo = new THREE.TorusGeometry(ROAD_WIDTH / 2 + 0.6, 0.45, 8, 16, Math.PI);
      var cArchMesh = new THREE.Mesh(cArchGeo, ribMat);
      cArchMesh.position.set(rxPos, 0, rtz);
      cArchMesh.rotation.y = -rAngle;
      tunnelGroup.add(cArchMesh);

      var cLampMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 0.6), lampMat);
      cLampMesh.position.set(rxPos, 6.2, rtz);
      cLampMesh.rotation.y = -rAngle;
      tunnelGroup.add(cLampMesh);

      var cLight = new THREE.PointLight(0xfbbf24, 0.75, 18, 1.6);
      cLight.position.set(rxPos, 5.6, rtz);
      tunnelGroup.add(cLight);
    }

    // ─── 7. HIGH-VISIBILITY PORTALS (ENTRANCE & EXIT) ────────────────────────
    function createHighVisibilityPortal(xPos, zPos, titleText, isEntrance) {
      var pGroup = new THREE.Group();

      var pillarGeo = new THREE.BoxGeometry(3.5, 11, 4);
      var pillarMat = new THREE.MeshStandardMaterial({
        color: isEntrance ? 0x1e1b4b : 0x064e3b,
        roughness: 0.5
      });

      var leftP = new THREE.Mesh(pillarGeo, pillarMat);
      leftP.position.set(xPos - ROAD_WIDTH / 2 - 2.2, 5.5, zPos);
      pGroup.add(leftP);

      var rightP = new THREE.Mesh(pillarGeo, pillarMat);
      rightP.position.set(xPos + ROAD_WIDTH / 2 + 2.2, 5.5, zPos);
      pGroup.add(rightP);

      var beamGeo = new THREE.BoxGeometry(ROAD_WIDTH + 8, 3.4, 4);
      var topBeam = new THREE.Mesh(beamGeo, pillarMat);
      topBeam.position.set(xPos, 10.8, zPos);
      pGroup.add(topBeam);

      // Flashing Beacons
      var beaconMat = new THREE.MeshBasicMaterial({ color: isEntrance ? 0xf59e0b : 0x10b981 });
      var leftBeacon = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.9, 12), beaconMat);
      leftBeacon.position.set(xPos - ROAD_WIDTH / 2 - 1.8, 13.0, zPos);
      pGroup.add(leftBeacon);

      var rightBeacon = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.9, 12), beaconMat);
      rightBeacon.position.set(xPos + ROAD_WIDTH / 2 + 1.8, 13.0, zPos);
      pGroup.add(rightBeacon);

      // Overhead High-Contrast Sign
      var canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 256;
      var ctx = canvas.getContext('2d');

      ctx.fillStyle = isEntrance ? '#111827' : '#022c22';
      ctx.fillRect(0, 0, 1024, 256);

      ctx.strokeStyle = isEntrance ? '#f59e0b' : '#10b981';
      ctx.lineWidth = 14;
      ctx.strokeRect(8, 8, 1008, 240);

      ctx.fillStyle = isEntrance ? '#f59e0b' : '#10b981';
      ctx.font = 'bold 38px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(isEntrance ? '⚠️ GNSS DENIED SECTOR' : '✨ GNSS RECOVERY ZONE', 512, 70);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 58px Arial, sans-serif';
      ctx.fillText(titleText, 512, 160);

      ctx.fillStyle = isEntrance ? '#fde68a' : '#a7f3d0';
      ctx.font = 'bold 30px Arial, sans-serif';
      ctx.fillText(isEntrance ? 'DEAD RECKONING INERTIAL TRACKING' : 'KALMAN SENSOR FUSION ACTIVE', 512, 220);

      var signTex = new THREE.CanvasTexture(canvas);
      var signMat = new THREE.MeshBasicMaterial({ map: signTex });
      var signMesh = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH + 5, 3.2), signMat);
      signMesh.position.set(xPos, 10.8, isEntrance ? zPos - 2.2 : zPos + 2.2);
      if (!isEntrance) signMesh.rotation.y = Math.PI;
      pGroup.add(signMesh);

      scene.add(pGroup);
    }

    createHighVisibilityPortal(0, TUNNEL_START_Z, '🚧 TUNNEL ENTRANCE [ 320m ]', true);
    createHighVisibilityPortal(7.0, TUNNEL_END_Z, '✨ TUNNEL EXIT [ RESTORED ]', false);
    scene.add(tunnelGroup);

    // ─── 8. 3D CITY BUILDINGS ────────────────────────────────────────────────
    var buildingColors = [0x1e293b, 0x0f172a, 0x334155, 0x1e1b4b, 0x172554];
    var windowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    function createBuilding(x, z, w, h, d, color) {
      var bGroup = new THREE.Group();
      var bGeo = new THREE.BoxGeometry(w, h, d);
      var bMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.5, metalness: 0.2 });
      var bMesh = new THREE.Mesh(bGeo, bMat);
      bMesh.position.y = h / 2;
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;
      bGroup.add(bMesh);

      var rows = Math.floor(h / 6);
      var cols = Math.floor(w / 4);
      for (var r = 1; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          if (Math.random() > 0.4) {
            var win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.8), windowMat);
            win.position.set(-w / 2 + 2 + c * 3.5, r * 5.5, d / 2 + 0.05);
            bGroup.add(win);
          }
        }
      }

      bGroup.position.set(x, 0, z);
      scene.add(bGroup);
    }

    // Pre-tunnel skyscrapers (aligned around X = 0)
    for (var z = 20; z < TUNNEL_START_Z - 25; z += 35) {
      var hLeft = 25 + Math.random() * 45;
      createBuilding(-ROAD_WIDTH / 2 - 18, z, 22, hLeft, 24, buildingColors[Math.floor(Math.random() * buildingColors.length)]);
      var hRight = 30 + Math.random() * 40;
      createBuilding(ROAD_WIDTH / 2 + 18, z, 22, hRight, 24, buildingColors[Math.floor(Math.random() * buildingColors.length)]);
    }

    // Post-tunnel skyscrapers (aligned around X = 7.0)
    for (var z = TUNNEL_END_Z + 30; z < TOTAL_ROAD_LENGTH; z += 35) {
      var hLeft = 25 + Math.random() * 50;
      createBuilding(7.0 - ROAD_WIDTH / 2 - 18, z, 22, hLeft, 25, buildingColors[Math.floor(Math.random() * buildingColors.length)]);
      var hRight = 30 + Math.random() * 45;
      createBuilding(7.0 + ROAD_WIDTH / 2 + 18, z, 22, hRight, 25, buildingColors[Math.floor(Math.random() * buildingColors.length)]);
    }

    // ─── 9. DETAILED 3D VEHICLE MODEL WITH STEERING WHEELS ───────────────────
    var carGroup = new THREE.Group();

    // Metallic Chassis
    var carBodyMat = new THREE.MeshStandardMaterial({
      color: 0x4f46e5,
      metalness: 0.85,
      roughness: 0.25,
    });
    var bodyGeo = new THREE.BoxGeometry(2.6, 0.95, 5.2);
    var bodyMesh = new THREE.Mesh(bodyGeo, carBodyMat);
    bodyMesh.position.y = 0.8;
    bodyMesh.castShadow = true;
    carGroup.add(bodyMesh);

    // Cabin Glass
    var cabinMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.9,
    });
    var cabinGeo = new THREE.BoxGeometry(2.1, 0.75, 2.8);
    var cabinMesh = new THREE.Mesh(cabinGeo, cabinMat);
    cabinMesh.position.set(0, 1.55, -0.2);
    cabinMesh.castShadow = true;
    carGroup.add(cabinMesh);

    // 4 Wheels (front wheels have pivot for realistic steering angle)
    var wheelGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.38, 16);
    var wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
    var rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 });

    var wheels = [];
    var wheelOffsets = [
      [-1.35, 0.46, 1.5],  // front left
      [1.35, 0.46, 1.5],   // front right
      [-1.35, 0.46, -1.5], // rear left
      [1.35, 0.46, -1.5],  // rear right
    ];

    wheelOffsets.forEach(function(offset, index) {
      var wGroup = new THREE.Group();
      var tire = new THREE.Mesh(wheelGeo, wheelMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wGroup.add(tire);

      var rim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.39, 8), rimMat);
      rim.rotation.z = Math.PI / 2;
      wGroup.add(rim);

      wGroup.position.set(offset[0], offset[1], offset[2]);
      carGroup.add(wGroup);
      wheels.push(wGroup);
    });

    // Xenon Headlights
    var headlightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    var leftHead = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), headlightMat);
    leftHead.position.set(-0.95, 0.85, 2.61);
    carGroup.add(leftHead);

    var rightHead = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), headlightMat);
    rightHead.position.set(0.95, 0.85, 2.61);
    carGroup.add(rightHead);

    // Headlight SpotLight
    var headSpot = new THREE.SpotLight(0xfef08a, 2.8, 70, Math.PI / 5, 0.4, 1);
    headSpot.position.set(0, 1.0, 2.7);
    var spotTarget = new THREE.Object3D();
    spotTarget.position.set(0, 0, 35);
    carGroup.add(spotTarget);
    headSpot.target = spotTarget;
    carGroup.add(headSpot);

    // Taillights
    var tailMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    var leftTail = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.16, 0.1), tailMat);
    leftTail.position.set(-0.95, 0.85, -2.61);
    carGroup.add(leftTail);

    var rightTail = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.16, 0.1), tailMat);
    rightTail.position.set(0.95, 0.85, -2.61);
    carGroup.add(rightTail);

    // Top Roof Marker Disc
    var markerPillMat = new THREE.MeshBasicMaterial({ color: 0x6366f1 });
    var markerPill = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16), markerPillMat);
    markerPill.position.set(0, 2.05, -0.2);
    carGroup.add(markerPill);

    carGroup.position.set(0, 0, 10);
    scene.add(carGroup);

    // ─── 10. DYNAMIC PRE-ALLOCATED ZERO-FLICKER TRAJECTORY RIBBONS ───────────
    // Pre-tunnel GNSS Ribbon (Straight, X = 0)
    var gnssRibbonMat = new THREE.MeshBasicMaterial({ color: 0x6366f1, side: THREE.DoubleSide });
    var gnssRibbonGeo = new THREE.PlaneGeometry(1.2, 1);
    var gnssRibbonMesh = new THREE.Mesh(gnssRibbonGeo, gnssRibbonMat);
    gnssRibbonMesh.rotation.x = -Math.PI / 2;
    gnssRibbonMesh.position.set(0, 0.04, 0);
    gnssRibbonMesh.visible = false;
    scene.add(gnssRibbonMesh);

    // In-tunnel Dead Reckoning Ribbon (Dynamically follows curve)
    var DR_MAX_SEGMENTS = 120;
    var drPositions = new Float32Array((DR_MAX_SEGMENTS + 1) * 2 * 3);
    var drIndices = [];
    for (var di = 0; di < DR_MAX_SEGMENTS; di++) {
      var da = di * 2;
      var db = di * 2 + 1;
      var dc = (di + 1) * 2;
      var dd = (di + 1) * 2 + 1;
      drIndices.push(da, dc, db);
      drIndices.push(db, dc, dd);
    }
    var drRibbonGeo = new THREE.BufferGeometry();
    drRibbonGeo.setAttribute('position', new THREE.BufferAttribute(drPositions, 3));
    drRibbonGeo.setIndex(drIndices);
    var drRibbonMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide });
    var drRibbonMesh = new THREE.Mesh(drRibbonGeo, drRibbonMat);
    drRibbonMesh.visible = false;
    scene.add(drRibbonMesh);

    // Post-tunnel Fused Ribbon (Straight, X = 7.0)
    var fusedRibbonMat = new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide });
    var fusedRibbonGeo = new THREE.PlaneGeometry(1.2, 1);
    var fusedRibbonMesh = new THREE.Mesh(fusedRibbonGeo, fusedRibbonMat);
    fusedRibbonMesh.rotation.x = -Math.PI / 2;
    fusedRibbonMesh.position.set(7.0, 0.04, 0);
    fusedRibbonMesh.visible = false;
    scene.add(fusedRibbonMesh);

    // ─── 11. NAVIGATION CAMERA CONTROLLER ────────────────────────────────────
    //
    // Shared navigation camera system used by ALL simulation screens.
    // Implements:
    //   • Course-Up orientation (vehicle heading always toward top of screen)
    //   • 3D forward-looking perspective (vehicle in lower-third)
    //   • Speed-adaptive look-ahead offset
    //   • Full smooth interpolation (position, yaw, pitch, zoom)
    //   • Manual-pan detection → auto-follow pause → re-center button
    //   • Camera states: IDLE (overview) | RUNNING (3D nav) | COMPLETED (zoom-out)
    //   • 2D / 3D toggle with smooth transition
    //

    var cameraMode = 'DRIVE3D';      // 'DRIVE3D' | 'TOP'
    var cameraState = 'IDLE';        // 'IDLE' | 'RUNNING' | 'COMPLETED'

    // Current smoothed camera parameters (interpolated every frame)
    var camCurrent = {
      x: 0, y: 55, z: -40,          // world position
      yaw: 0,                        // current heading smoothed (radians, route tangent)
      pitch: 0.18,                   // tilt (0=top-down, 1=horizon)
      zoom: 55,                      // effective distance from car
      lookAhead: 25,                 // look-ahead offset in car-forward direction
    };

    // Target camera parameters driven by simulation state
    var camTarget = {
      x: 0, y: 55, z: -40,
      yaw: 0,
      pitch: 0.18,
      zoom: 55,
      lookAhead: 25,
    };

    // ── Manual pan / auto-follow ────────────────────────────────────────
    var autoFollow = true;           // false when user pans manually
    var lastManualInteractionTime = 0;
    var RECENTER_RESTORE_DELAY = 0;  // immediate re-center on button press

    function showRecenter(show) {
      var btn = document.getElementById('recenter-btn');
      if (!btn) return;
      if (show) {
        btn.classList.add('visible');
      } else {
        btn.classList.remove('visible');
      }
    }

    function recenterCamera() {
      autoFollow = true;
      showRecenter(false);
    }
    window.recenterCamera = recenterCamera;

    // ── 2D / 3D toggle ──────────────────────────────────────────────────
    function setCameraMode(mode) {
      cameraMode = mode;
      var btn3d = document.getElementById('btn-3d');
      var btn2d = document.getElementById('btn-2d');
      if (btn3d && btn2d) {
        if (mode === 'DRIVE3D') {
          btn3d.classList.add('active');
          btn2d.classList.remove('active');
        } else {
          btn2d.classList.add('active');
          btn3d.classList.remove('active');
        }
      }
      // Restore auto-follow when toggling
      autoFollow = true;
      showRecenter(false);
    }
    window.setCameraMode = setCameraMode;

    // ── Camera state driven by simulation state ─────────────────────────
    function updateCameraState(simState) {
      var prev = cameraState;
      if (simState === 'IDLE' || simState === 'STARTING') {
        cameraState = 'IDLE';
      } else if (simState === 'COMPLETED') {
        cameraState = 'COMPLETED';
      } else {
        cameraState = 'RUNNING';
      }

      // On transition from IDLE → RUNNING, ensure autoFollow is on
      if (prev !== 'RUNNING' && cameraState === 'RUNNING') {
        autoFollow = true;
        showRecenter(false);
      }
    }

    // ── Look-ahead amount based on speed ────────────────────────────────
    function calcLookAhead(speedKmh) {
      // Range: 12 (stopped) → 45 (fast highway)
      var clamped = Math.max(0, Math.min(130, speedKmh));
      return 12 + (clamped / 130) * 33;
    }

    // ── Camera target computation ────────────────────────────────────────
    // Builds target camera parameters for the current frame.
    // All values are fed through per-frame lerp to produce smooth motion.
    function computeCameraTarget(carX, carZ, carYaw, speedKmh, state) {
      updateCameraState(state);

      if (cameraMode === 'TOP') {
        // ── 2D / North-Up Top View ─────────────────────────────────────────
        camTarget.x = carX;
        camTarget.y = 52;
        camTarget.z = carZ;
        camTarget.yaw = 0;           // north-up: no rotation
        camTarget.pitch = 0.0;       // straight down
        camTarget.zoom = 52;
        camTarget.lookAhead = 12;
        return;
      }

      // ── DRIVE3D: Navigation perspective ───────────────────────────────
      switch (cameraState) {
        case 'IDLE': {
          // Wide route overview, slight tilt, north-up acceptable
          camTarget.x = carX;
          camTarget.y = 72;
          camTarget.z = carZ - 30;
          camTarget.yaw = 0;
          camTarget.pitch = 0.14;
          camTarget.zoom = 72;
          camTarget.lookAhead = 40;
          break;
        }
        case 'COMPLETED': {
          // Smooth zoom-out to full route overview
          camTarget.x = carX;
          camTarget.y = 120;
          camTarget.z = carZ - 60;
          camTarget.yaw = 0;
          camTarget.pitch = 0.1;
          camTarget.zoom = 120;
          camTarget.lookAhead = 60;
          break;
        }
        default: {
          // RUNNING — full 3D navigation perspective
          // Camera sits behind-and-above the vehicle, angled forward.
          // Look-ahead places more road in front on screen.
          var la = calcLookAhead(speedKmh);
          camTarget.yaw   = carYaw;           // course-up: heading toward top
          camTarget.pitch = 0.42;             // moderate forward tilt
          camTarget.zoom  = 22;              // tight follow distance
          camTarget.lookAhead = la;

          // Camera offset: behind car along current heading
          // We use carYaw (route tangent) as reference direction.
          var behindDist = 17;
          var heightVal  = 9.0;
          // position behind+above in heading direction
          camTarget.x = carX - Math.sin(carYaw) * behindDist;
          camTarget.y = heightVal;
          camTarget.z = carZ - Math.cos(carYaw) * behindDist;
          break;
        }
      }
    }

    // Angular lerp (handles wrap-around at ±π)
    function lerpAngle(a, b, t) {
      var diff = b - a;
      while (diff >  Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      return a + diff * t;
    }

    // Apply the smoothed camera to the Three.js camera each frame
    function applyCameraFrame(carX, carZ, carYaw, speedKmh) {
      if (!autoFollow) return;  // user is panning manually

      var lerpPos, lerpRot;
      if (cameraState === 'RUNNING' && cameraMode === 'DRIVE3D') {
        lerpPos = 0.10;   // smooth follow
        lerpRot = 0.08;   // smooth rotation
      } else if (cameraState === 'COMPLETED') {
        lerpPos = 0.04;   // slow zoom-out
        lerpRot = 0.04;
      } else {
        lerpPos = 0.06;   // idle / 2D
        lerpRot = 0.06;
      }

      // Interpolate all camera parameters
      camCurrent.x     += (camTarget.x     - camCurrent.x)     * lerpPos;
      camCurrent.y     += (camTarget.y     - camCurrent.y)     * lerpPos;
      camCurrent.z     += (camTarget.z     - camCurrent.z)     * lerpPos;
      camCurrent.yaw    = lerpAngle(camCurrent.yaw, camTarget.yaw, lerpRot);
      camCurrent.pitch += (camTarget.pitch - camCurrent.pitch) * lerpRot;
      camCurrent.lookAhead += (camTarget.lookAhead - camCurrent.lookAhead) * lerpPos;

      // Set actual camera position
      camera.position.set(camCurrent.x, camCurrent.y, camCurrent.z);

      // Compute look-at point:
      // In RUNNING 3D mode: look toward car + look-ahead in heading direction
      // placing the car in the lower portion of the viewport.
      var lookX, lookY, lookZ;
      if (cameraState === 'RUNNING' && cameraMode === 'DRIVE3D') {
        var la = camCurrent.lookAhead;
        lookX = carX + Math.sin(camCurrent.yaw) * la;
        lookY = 1.5;
        lookZ = carZ + Math.cos(camCurrent.yaw) * la;
      } else if (cameraMode === 'TOP') {
        lookX = carX;
        lookY = 0;
        lookZ = carZ;
      } else {
        // IDLE / COMPLETED overview
        lookX = carX + Math.sin(camCurrent.yaw) * camCurrent.lookAhead;
        lookY = 0;
        lookZ = carZ + Math.cos(camCurrent.yaw) * camCurrent.lookAhead;
      }
      camera.lookAt(lookX, lookY, lookZ);
    }

    function notifyParent(type) {
      var msg = JSON.stringify({ type: type });
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(msg);
      }
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(msg, '*');
      }
      if (type === 'fork_pause' && window.onForkDecisionPause) {
        window.onForkDecisionPause();
      }
      if (type === 'fork_resume' && window.onForkDecisionResume) {
        window.onForkDecisionResume();
      }
    }

    var decisionShown = false;
    var isPausedForDecision = false;

    function triggerDecisionDialog() {
      if (decisionShown) return;
      decisionShown = true;
      isPausedForDecision = true;

      // Lock position at the halt line inside the curve
      simData.carZ = HALT_Z;
      simData.progress = (HALT_Z / TOTAL_ROAD_LENGTH) * 100;
      simData.targetProgress = simData.progress;
      simData.speedKmh = 0;

      var hudSpeed = document.getElementById('hud-speed');
      if (hudSpeed) {
        hudSpeed.textContent = '0 km/h [HALTED AT FORK]';
        hudSpeed.style.color = '#f59e0b';
      }

      var modal = document.getElementById('decision-dialog-backdrop');
      if (modal) modal.style.display = 'flex';

      notifyParent('fork_pause');
    }

    function dismissDecisionDialog() {
      var modal = document.getElementById('decision-dialog-backdrop');
      if (modal) modal.style.display = 'none';

      isPausedForDecision = false;
      simData.speedKmh = 48;

      var hudSpeed = document.getElementById('hud-speed');
      if (hudSpeed) {
        hudSpeed.textContent = '48 km/h';
        hudSpeed.style.color = '#38bdf8';
      }

      notifyParent('fork_resume');
    }
    window.dismissDecisionDialog = dismissDecisionDialog;

    // Simulation Data State & Targets
    var simData = {
      progress: 0,
      targetProgress: 0,
      carZ: 10,
      carX: 0,
      carHeading: 0,
      speedKmh: 48,
      state: 'GNSS_ACTIVE',
      isInsideTunnel: false,
      isApproachingTunnel: false,
      driftMeters: 0,
      disableForkDecision: false,
    };

    // ── OpenStreetMap Mini-Map Initializer & Route Geometry ──────────────
    var miniMap = null;
    var miniMapMarker = null;
    var miniMapAttempts = 0;

    // Route Waypoints for smooth 60 FPS interpolation
    var routePoints = [
      [37.798020, -122.405500], // Start: Columbus Ave
      [37.797990, -122.406800], // Stockton St
      [37.797950, -122.408500], // Mid-block
      [37.797910, -122.410100], // Powell St
      [37.797870, -122.411400], // Pre-tunnel Mason St
      [37.797820, -122.412100], // Tunnel Entrance Portal
      [37.797800, -122.412900], // Tunnel: Taylor St
      [37.797775, -122.413800], // Tunnel: Mid-chamber
      [37.797745, -122.414800], // Tunnel: Jones St
      [37.797715, -122.415800], // Tunnel: Leavenworth St
      [37.797680, -122.416800], // Tunnel Exit Portal
      [37.797650, -122.417800], // Hyde St
      [37.797620, -122.419200], // Larkin St
      [37.797580, -122.420800], // Polk St
      [37.797520, -122.423500]  // Destination: Van Ness Ave
    ];

    function getRouteLatLngAtProgress(prog) {
      var clamped = Math.max(0, Math.min(100, prog));
      var t = clamped / 100;
      var totalSegs = routePoints.length - 1;
      var scaledT = t * totalSegs;
      var idx = Math.floor(scaledT);
      if (idx >= totalSegs) return routePoints[totalSegs];

      var frac = scaledT - idx;
      var p1 = routePoints[idx];
      var p2 = routePoints[idx + 1];

      var lat = p1[0] + (p2[0] - p1[0]) * frac;
      var lng = p1[1] + (p2[1] - p1[1]) * frac;
      return [lat, lng];
    }

    function initLeafletMiniMap() {
      if (miniMap) return;
      if (typeof L === 'undefined') {
        miniMapAttempts++;
        if (miniMapAttempts < 40) {
          setTimeout(initLeafletMiniMap, 150);
        }
        return;
      }

      var mapDiv = document.getElementById('leaflet-minimap-div');
      if (!mapDiv) return;

      try {
        var miniCenter = [${center.latitude}, ${center.longitude}];
        miniMap = L.map('leaflet-minimap-div', {
          zoomControl: false,
          attributionControl: false,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          touchZoom: false
        }).setView(miniCenter, 17);

        // 100% Free Official OpenStreetMap Tile Server (No API Key Required)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          subdomains: ['a', 'b', 'c'],
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(miniMap);

        // 1. Pre-Tunnel Segment (Indigo)
        var preTunnelPts = routePoints.slice(0, 6);
        L.polyline(preTunnelPts, {
          color: '#4F46E5',
          weight: 4.5,
          opacity: 0.9
        }).addTo(miniMap);

        // 2. HIGHLIGHTED TUNNEL PATH SEGMENT (Glowing Amber Dashed Line)
        var tunnelPts = routePoints.slice(5, 11);
        L.polyline(tunnelPts, {
          color: '#F59E0B',
          weight: 6.5,
          opacity: 0.95,
          dashArray: '8, 6'
        }).addTo(miniMap);

        // 3. Post-Tunnel Segment (Emerald Green)
        var postTunnelPts = routePoints.slice(10);
        L.polyline(postTunnelPts, {
          color: '#10B981',
          weight: 4.5,
          opacity: 0.9
        }).addTo(miniMap);

        // Car Marker
        var carIcon = L.divIcon({
          className: 'minimap-custom-icon',
          html: '<div class="minimap-dot"><div class="minimap-pulse"></div></div>',
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });

        miniMapMarker = L.marker(miniCenter, { icon: carIcon }).addTo(miniMap);

        setTimeout(function() {
          if (miniMap) miniMap.invalidateSize();
        }, 300);
        setTimeout(function() {
          if (miniMap) miniMap.invalidateSize();
        }, 1000);
      } catch(e) {
        console.log('MiniMap notice:', e);
      }
    }

    initLeafletMiniMap();

    function updateSimulationMap(data) {
      if (!data) return;

      if (data.disableForkDecision !== undefined) {
        simData.disableForkDecision = !!data.disableForkDecision;
      }

      var prog = (data.position && data.progress !== undefined)
        ? data.progress
        : (data.state === 'COMPLETED' ? 100 : simData.progress);

      if (!isPausedForDecision) {
        simData.targetProgress = prog;
      }
      simData.state = data.state || 'GNSS_ACTIVE';
      simData.isInsideTunnel = !!data.isInsideTunnel;
      simData.isApproachingTunnel = !!data.isApproachingTunnel;
      simData.driftMeters = data.driftMeters || 0;
      if (!isPausedForDecision) {
        simData.speedKmh = data.speedKmh || 48;
      }

      // Update HUD elements
      var hudSats = document.getElementById('hud-sats');
      var hudDrift = document.getElementById('hud-drift');
      var hudState = document.getElementById('hud-state');
      var hudProgress = document.getElementById('hud-progress');
      var hudSpeed = document.getElementById('hud-speed');

      if (hudProgress) hudProgress.textContent = Math.round(prog) + '%';
      if (hudSpeed && !isPausedForDecision) {
        hudSpeed.textContent = Math.round(simData.speedKmh) + ' km/h';
        hudSpeed.style.color = '#38bdf8';
      }

      if (simData.isInsideTunnel) {
        if (hudSats) hudSats.textContent = '0 🚫 (IN TUNNEL)';
        if (hudDrift) hudDrift.textContent = Number(simData.driftMeters).toFixed(1) + ' m';
        if (hudState) {
          hudState.textContent = 'DEAD RECKONING';
          hudState.style.background = '#f59e0b';
          hudState.style.boxShadow = '0 0 14px rgba(245, 158, 11, 0.6)';
        }
        carBodyMat.color.setHex(0xf59e0b);
        markerPillMat.color.setHex(0xf59e0b);
      } else if (simData.state === 'FUSED' || simData.state === 'COMPLETED') {
        if (hudSats) hudSats.textContent = '14 🛰️ (RESTORED)';
        if (hudDrift) hudDrift.textContent = '0.0 m';
        if (hudState) {
          hudState.textContent = 'FUSED (GNSS+IMU)';
          hudState.style.background = '#10b981';
          hudState.style.boxShadow = '0 0 14px rgba(16, 185, 129, 0.6)';
        }
        carBodyMat.color.setHex(0x10b981);
        markerPillMat.color.setHex(0x10b981);
      } else {
        if (hudSats) hudSats.textContent = '14 🛰️';
        if (hudDrift) hudDrift.textContent = '0.0 m';
        if (hudState) {
          hudState.textContent = 'GNSS ACTIVE';
          hudState.style.background = '#4f46e5';
          hudState.style.boxShadow = '0 0 14px rgba(79, 70, 229, 0.6)';
        }
        carBodyMat.color.setHex(0x4f46e5);
        markerPillMat.color.setHex(0x6366f1);
      }

      // Update SVG marker position (always works instantly)
      var svgMarker = document.getElementById('svg-marker-group');
      if (svgMarker) {
        var svgX = 20 + (prog / 100) * 120;
        var svgY = 142 - (prog / 100) * 124;
        svgMarker.setAttribute('transform', 'translate(' + svgX + ', ' + svgY + ')');
      }

      // Update Mini-Map OpenStreetMap position & marker
      if (data.position && data.position.length === 2 && miniMap && miniMapMarker) {
        var lat = data.position[0];
        var lng = data.position[1];
        miniMapMarker.setLatLng([lat, lng]);
        miniMap.panTo([lat, lng], { animate: true, duration: 0.1 });

        var streetLabel = document.getElementById('minimap-header-label');
        if (streetLabel) {
          if (simData.isInsideTunnel) {
            streetLabel.textContent = 'Broadway Tunnel';
          } else if (prog > 60) {
            streetLabel.textContent = 'Van Ness Ave';
          } else if (prog > 30) {
            streetLabel.textContent = '31st Street';
          } else {
            streetLabel.textContent = '33rd Street';
          }
        }
      }

      // Reset state upon re-run or restart
      if (data.state === 'STARTING' || data.state === 'IDLE') {
        decisionShown = false;
        isPausedForDecision = false;
        var modal = document.getElementById('decision-dialog-backdrop');
        if (modal) modal.style.display = 'none';
      }
    }
    window.updateSimulationMap = updateSimulationMap;

    // ─── 12. 60 FPS FLICKER-FREE RENDER LOOP ─────────────────────────────────
    var clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      var delta = clock.getDelta();

      if (isPausedForDecision) {
        // Car is stopped completely at the halt line until user clicks Next button
        simData.carZ = HALT_Z;
        simData.progress = (HALT_Z / TOTAL_ROAD_LENGTH) * 100;
        simData.targetProgress = simData.progress;
      } else {
        // Smooth continuous progress interpolation
        simData.progress += (simData.targetProgress - simData.progress) * 0.15;
        simData.carZ = (simData.progress / 100) * TOTAL_ROAD_LENGTH;

        // Check if car reaches the halt junction: must halt and show decision dialog (unless disabled)
        if (!simData.disableForkDecision && !decisionShown && simData.isInsideTunnel && simData.carZ >= HALT_Z - 1.5) {
          triggerDecisionDialog();
        }
      }

      // Compute exact position and tangent angle along the route curve
      var routeX = getRouteX(simData.carZ);
      var routeHeading = getRouteTangentAngle(simData.carZ);

      if (simData.isInsideTunnel) {
        // Add subtle lateral DR drift
        routeX += Math.min(2.0, simData.driftMeters * 0.4);
      }

      // Smooth kinematic interpolation
      simData.carX += (routeX - simData.carX) * 0.25;
      simData.carHeading += (routeHeading - simData.carHeading) * 0.25;

      // Update car position & rotation
      carGroup.position.set(simData.carX, 0, simData.carZ);
      carGroup.rotation.y = simData.carHeading;

      // ── 60 FPS REAL-TIME OPENSTREETMAP MARKER MOTION ───────────────────────
      var curLatLng = getRouteLatLngAtProgress(simData.progress);
      if (miniMap && miniMapMarker && curLatLng) {
        miniMapMarker.setLatLng(curLatLng);
        miniMap.panTo(curLatLng, { animate: false });

        var streetLabel = document.getElementById('minimap-header-label');
        if (streetLabel) {
          if (simData.isInsideTunnel) {
            streetLabel.textContent = 'Broadway Tunnel (GNSS DENIED)';
            streetLabel.style.color = '#d97706';
          } else if (simData.progress > 60) {
            streetLabel.textContent = 'Van Ness Ave';
            streetLabel.style.color = '#059669';
          } else {
            streetLabel.textContent = '33rd Street';
            streetLabel.style.color = '#2563eb';
          }
        }
      }

      // Update SVG marker position (always works smoothly at 60 FPS)
      var svgMarker = document.getElementById('svg-marker-group');
      if (svgMarker) {
        var svgX = 20 + (simData.progress / 100) * 122;
        var svgY = 142 - (simData.progress / 100) * 126;
        svgMarker.setAttribute('transform', 'translate(' + svgX + ', ' + svgY + ')');
      }

      // Front wheels turn realistically into the right curve
      var steerAngle = 0;
      if (simData.carZ >= 267 && simData.carZ <= TUNNEL_CURVE_APEX_Z + 15) {
        // Front wheels turn noticeably into the right turn bend
        steerAngle = Math.min(0.48, Math.max(-0.48, routeHeading * 2.2));
        // Dynamic subtle chassis roll into the turn
        bodyMesh.rotation.z = -routeHeading * 0.22;
      } else {
        steerAngle = 0;
        bodyMesh.rotation.z = 0;
      }
      wheels[0].rotation.y = steerAngle;
      wheels[1].rotation.y = steerAngle;

      // Spin wheels smoothly when car is in motion
      var spinSpeed = (!isPausedForDecision ? (simData.speedKmh / 3.6) : 0) * delta * 4;
      wheels.forEach(function(w) {
        w.children[0].rotation.x += spinSpeed;
      });

      // Flashing beacons (if present)
      if (window.apexLight) {
        var strobe = Math.sin(clock.getElapsedTime() * 8) > 0;
        window.apexLight.intensity = strobe ? 1.8 : 0.4;
      }

      // Update Pre-allocated 3D Trajectory Ribbons
      // 1. GNSS ribbon (Pre-tunnel, X = 0)
      var gnssLen = Math.min(simData.carZ, TUNNEL_START_Z) - 5;
      if (gnssLen > 0.5) {
        gnssRibbonMesh.visible = true;
        gnssRibbonMesh.scale.set(1, gnssLen, 1);
        gnssRibbonMesh.position.set(0, 0.04, 5 + gnssLen / 2);
      } else {
        gnssRibbonMesh.visible = false;
      }

      // 2. Dead Reckoning ribbon (In-tunnel, dynamically follows curve)
      if (simData.carZ > TUNNEL_START_Z) {
        drRibbonMesh.visible = true;
        var endDRZ = Math.min(simData.carZ, TUNNEL_END_Z);
        var drSpan = endDRZ - TUNNEL_START_Z;
        var steps = Math.min(DR_MAX_SEGMENTS, Math.max(2, Math.floor(drSpan / 2.0)));

        var posArr = drRibbonGeo.attributes.position.array;
        for (var si = 0; si <= steps; si++) {
          var sz = TUNNEL_START_Z + (si / steps) * drSpan;
          var sx = getRouteX(sz);
          var sAngle = getRouteTangentAngle(sz);
          var pX = Math.cos(sAngle);
          var pZ = -Math.sin(sAngle);
          var hw = 0.6;
          var sIdx = si * 2;

          posArr[sIdx * 3]     = sx - pX * hw;
          posArr[sIdx * 3 + 1] = 0.045;
          posArr[sIdx * 3 + 2] = sz - pZ * hw;

          posArr[(sIdx + 1) * 3]     = sx + pX * hw;
          posArr[(sIdx + 1) * 3 + 1] = 0.045;
          posArr[(sIdx + 1) * 3 + 2] = sz + pZ * hw;
        }

        drRibbonGeo.attributes.position.needsUpdate = true;
        drRibbonGeo.setDrawRange(0, steps * 6);
      } else {
        drRibbonMesh.visible = false;
      }

      // 3. Fused ribbon (Post-tunnel, X = 7.0)
      if (simData.carZ > TUNNEL_END_Z) {
        var fusedLen = simData.carZ - TUNNEL_END_Z;
        if (fusedLen > 0.5) {
          fusedRibbonMesh.visible = true;
          fusedRibbonMesh.scale.set(1, fusedLen, 1);
          fusedRibbonMesh.position.set(7.0, 0.04, TUNNEL_END_Z + fusedLen / 2);
        }
      } else {
        fusedRibbonMesh.visible = false;
      }

      // ── Navigation Camera: Course-Up, 3D forward perspective, smooth follow ──
      var carYawForCamera = carGroup.rotation.y;
      computeCameraTarget(simData.carX, simData.carZ, carYawForCamera, simData.speedKmh, simData.state);
      applyCameraFrame(simData.carX, simData.carZ, carYawForCamera, simData.speedKmh);

      renderer.render(scene, camera);
    }
    animate();

    // ─── 13. COMMUNICATION WITH APP ──────────────────────────────────────────
    document.addEventListener('message', function(e) {
      try { updateSimulationMap(JSON.parse(e.data)); } catch(err) {}
    });
    window.addEventListener('message', function(e) {
      try { updateSimulationMap(JSON.parse(e.data)); } catch(err) {}
    });

    window.addEventListener('resize', function() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    setTimeout(function() {
      notifyParent('ready');
    }, 200);
  </script>
</body>
</html>`;
}

export function SimulationMapView({
  frame,
  isPresentationMode = false,
  style,
  onMapReady,
  onForkDecisionPause,
  onForkDecisionResume,
  disableForkDecision = false,
}: SimulationMapViewProps) {
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const iframeRef = useRef<any>(null);

  const initialCenter = SIMULATION_ROUTE.start;

  // Determine marker mode label & color
  const isDR = frame.state === 'DEAD_RECKONING' || frame.state === 'GNSS_LOST';
  const isRecovering = frame.state === 'TUNNEL_EXIT' || frame.state === 'GNSS_RECOVERING';
  const isFused = frame.state === 'FUSED' || frame.state === 'COMPLETED';

  const markerColor = isDR ? '#8B5CF6' : isRecovering ? '#F59E0B' : isFused ? '#10B981' : colors.primary;
  const markerLabel = isDR ? 'DR' : isRecovering ? 'FUSION' : isFused ? 'FUSED' : 'GNSS';

  const pushUpdate = useCallback(() => {
    const payload = {
      progress: frame.routeProgressPercent,
      speedKmh: frame.carSpeedKmh,
      heading: frame.carHeading,
      driftMeters: frame.drDisplacementMeters,
      state: frame.state,
      label: markerLabel,
      color: markerColor,
      isInsideTunnel: frame.isInsideTunnel,
      isApproachingTunnel: frame.isApproachingTunnel,
      isPresentation: isPresentationMode,
      position: [frame.carPosition.latitude, frame.carPosition.longitude],
      disableForkDecision: !!disableForkDecision,
    };

    if (Platform.OS === 'web') {
      try {
        const win = iframeRef.current?.contentWindow;
        if (win && win.updateSimulationMap) {
          win.updateSimulationMap(payload);
        }
      } catch (err) {}
      return;
    }

    if (!webRef.current || !readyRef.current) return;
    const js = `if (window.updateSimulationMap) { window.updateSimulationMap(${JSON.stringify(payload)}); } true;`;
    webRef.current.injectJavaScript(js);
  }, [frame, markerColor, markerLabel, isPresentationMode, disableForkDecision]);

  useEffect(() => {
    pushUpdate();
  }, [pushUpdate]);

  const html = useMemo(() => buildSimulationHtml(initialCenter, disableForkDecision), [disableForkDecision]);

  const handleMessage = useCallback((eventData: string) => {
    try {
      const parsed = typeof eventData === 'string' ? JSON.parse(eventData) : eventData;
      if (parsed.type === 'ready') {
        readyRef.current = true;
        onMapReady?.();
        pushUpdate();
      } else if (parsed.type === 'fork_pause') {
        onForkDecisionPause?.();
      } else if (parsed.type === 'fork_resume') {
        onForkDecisionResume?.();
      }
    } catch {
      if (eventData === 'ready') {
        readyRef.current = true;
        onMapReady?.();
        pushUpdate();
      }
    }
  }, [onMapReady, onForkDecisionPause, onForkDecisionResume, pushUpdate]);

  // Web window message listener for iframe bridge
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleWebMessage = (e: MessageEvent) => {
        if (!e.data) return;
        handleMessage(e.data);
      };
      window.addEventListener('message', handleWebMessage);
      return () => window.removeEventListener('message', handleWebMessage);
    }
  }, [handleMessage]);

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, style]}>
        {/* @ts-ignore Web iframe element */}
        <iframe
          ref={iframeRef}
          srcDoc={html}
          style={{ width: '100%', height: '100%', border: 'none' }}
          onLoad={() => {
            readyRef.current = true;
            onMapReady?.();
            pushUpdate();
            if (iframeRef.current?.contentWindow) {
              iframeRef.current.contentWindow.onForkDecisionPause = onForkDecisionPause;
              iframeRef.current.contentWindow.onForkDecisionResume = onForkDecisionResume;
            }
          }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webRef}
        source={{ html, baseUrl: '' }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        mixedContentMode="always"
        onLoadEnd={() => {
          readyRef.current = true;
          onMapReady?.();
          pushUpdate();
        }}
        onMessage={(e) => {
          handleMessage(e.nativeEvent.data);
        }}
        onError={() => {}}
        {...(Platform.OS === 'android' ? {
          allowFileAccessFromFileURLs: true,
          allowUniversalAccessFromFileURLs: true,
        } : {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#050811',
  },
  webview: {
    flex: 1,
    backgroundColor: '#050811',
  },
});
