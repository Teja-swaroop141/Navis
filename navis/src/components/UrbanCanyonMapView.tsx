/**
 * UrbanCanyonMapView.tsx
 *
 * Perspective 3D Driving Environment with Three.js WebGL & 2D Minimap Overlay
 * for the Urban Canyon GNSS Degradation scenario.
 *
 * Features:
 * - 3D Perspective Camera following behind the NAVIS vehicle down 6th Avenue
 * - Extruded 3D Skyscraper City Canyon blocks that grow taller in the canyon zone
 * - Multi-lane asphalt road geometry with double-yellow centerlines and sidewalks
 * - 3D NAVIS Car mesh with glowing spotlights casting beams forward
 * - 3D GNSS Multipath ray visualization bouncing off building glass facades
 * - Floating 2D Leaflet minimap overlay in the top-right corner
 */

import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { LatLng } from '../data/simulationRoute';
import { URBAN_CANYON_ROUTE } from '../data/urbanCanyonRoute';
import { UrbanCanyonFrame } from '../services/urbanCanyonEngine';
import { colors } from '../theme/colors';

interface UrbanCanyonMapViewProps {
  frame: UrbanCanyonFrame;
  isPresentationMode?: boolean;
  style?: object;
  onMapReady?: () => void;
}

function buildUrbanCanyonHtml(center: LatLng): string {
  const routeNodes = URBAN_CANYON_ROUTE.waypoints.map((w) => [w.position.latitude, w.position.longitude]);
  const canyonNodes = URBAN_CANYON_ROUTE.canyonNodes.map((n) => [n.latitude, n.longitude]);
  const entrance = URBAN_CANYON_ROUTE.canyonEntrance;
  const exit = URBAN_CANYON_ROUTE.canyonExit;
  const start = URBAN_CANYON_ROUTE.start;
  const dest = URBAN_CANYON_ROUTE.destination;
  const totalMeters = URBAN_CANYON_ROUTE.totalDistanceMeters;
  const canyonInDist = URBAN_CANYON_ROUTE.canyonEntranceDistance;
  const canyonOutDist = URBAN_CANYON_ROUTE.canyonExitDistance;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #0b0f19; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

    #three-container { width: 100%; height: 100%; position: absolute; top: 0; left: 0; z-index: 1; }

    #minimap-card {
      position: absolute; top: 12px; right: 12px; width: 140px; height: 140px;
      border-radius: 12px; border: 2px solid rgba(255,255,255,0.7);
      box-shadow: 0 8px 24px rgba(0,0,0,0.5); overflow: hidden; z-index: 100;
      background: #0f172a;
    }
    #minimap { width: 100%; height: 100%; }

    #hud-overlay {
      position: absolute; top: 12px; left: 12px; z-index: 90;
      display: flex; flex-direction: column; gap: 6px; pointer-events: none;
    }
    .hud-badge {
      background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px);
      padding: 5px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.18);
      color: #f8fafc; font-size: 10px; font-weight: 800; letter-spacing: 0.8px;
      display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .hud-dot { width: 7px; height: 7px; border-radius: 50%; background: #10b981; transition: background 0.3s; }
    .portal-marker { background: transparent; border: none; }
    .car-marker-container { background: transparent; border: none; }
    .car-rotator { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
    .gnss-dot { width: 10px; height: 10px; border-radius: 50%; background: #4f46e5; border: 2px solid #ffffff; }
  </style>
</head>
<body>
  <div id="three-container"></div>

  <div id="hud-overlay">
    <div class="hud-badge">
      <div id="hud-dot" class="hud-dot"></div>
      <span id="hud-status-text">3D PERSPECTIVE • NORMAL GNSS</span>
    </div>
  </div>

  <div id="minimap-card">
    <div id="minimap"></div>
  </div>

  <script>
    // -------------------------------------------------------------
    // THREE.JS 3D DRIVING SCENE INITIALIZATION
    // -------------------------------------------------------------
    var container = document.getElementById('three-container');
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0f19);
    scene.fog = new THREE.FogExp2(0x0f172a, 0.006);

    var camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Lighting
    var ambientLight = new THREE.AmbientLight(0x94a3b8, 0.65);
    scene.add(ambientLight);

    var dirLight = new THREE.DirectionalLight(0xf1f5f9, 1.2);
    dirLight.position.set(30, 90, -40);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // 3D Road Mesh
    var totalLen = ${totalMeters};
    var canyonInZ = ${canyonInDist};
    var canyonOutZ = ${canyonOutDist};

    var roadWidth = 16;
    var roadGeo = new THREE.PlaneGeometry(roadWidth, totalLen + 300);
    var roadMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    var roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(0, 0, (totalLen + 300) / 2 - 100);
    roadMesh.receiveShadow = true;
    scene.add(roadMesh);

    // Double Yellow Centerline
    var yellowGeo = new THREE.PlaneGeometry(0.35, totalLen + 300);
    var yellowMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    var yellowLine = new THREE.Mesh(yellowGeo, yellowMat);
    yellowLine.rotation.x = -Math.PI / 2;
    yellowLine.position.set(0, 0.02, (totalLen + 300) / 2 - 100);
    scene.add(yellowLine);

    // Dashed White Lane Markings
    var laneGroup = new THREE.Group();
    scene.add(laneGroup);
    var dashGeo = new THREE.PlaneGeometry(0.2, 4);
    var dashMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    for (var z = -50; z < totalLen + 200; z += 12) {
      var dashL = new THREE.Mesh(dashGeo, dashMat);
      dashL.rotation.x = -Math.PI / 2;
      dashL.position.set(-4, 0.02, z);
      laneGroup.add(dashL);

      var dashR = new THREE.Mesh(dashGeo, dashMat);
      dashR.rotation.x = -Math.PI / 2;
      dashR.position.set(4, 0.02, z);
      laneGroup.add(dashR);
    }

    // Sidewalks Left & Right
    var swGeo = new THREE.BoxGeometry(4, 0.3, totalLen + 300);
    var swMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
    var swLeft = new THREE.Mesh(swGeo, swMat);
    swLeft.position.set(-10, 0.15, (totalLen + 300) / 2 - 100);
    scene.add(swLeft);

    var swRight = new THREE.Mesh(swGeo, swMat);
    swRight.position.set(10, 0.15, (totalLen + 300) / 2 - 100);
    scene.add(swRight);

    // 3D City Buildings (Canyon Effect)
    var buildingGroup = new THREE.Group();
    scene.add(buildingGroup);

    function createWindowTexture() {
      var canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 256;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 128, 256);
      ctx.fillStyle = '#38bdf8';
      for (var y = 10; y < 240; y += 24) {
        for (var x = 10; x < 110; x += 22) {
          if (Math.random() > 0.3) {
            ctx.fillStyle = Math.random() > 0.4 ? '#38bdf8' : '#fde68a';
            ctx.fillRect(x, y, 14, 16);
          }
        }
      }
      var tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2, 8);
      return tex;
    }
    var winTex = createWindowTexture();

    function buildCity() {
      var step = 32;
      for (var z = -40; z < totalLen + 150; z += step) {
        var inCanyon = (z >= canyonInZ - 40 && z <= canyonOutZ + 40);
        var height = inCanyon ? (110 + Math.sin(z * 0.04) * 45) : (18 + Math.sin(z * 0.05) * 8);
        var width = 24;
        var depth = 26;

        var bMat = new THREE.MeshStandardMaterial({
          color: inCanyon ? 0x0f172a : 0x1e293b,
          roughness: 0.2,
          metalness: 0.5,
          map: inCanyon ? winTex : null
        });

        // Left Building Box
        var bGeoL = new THREE.BoxGeometry(width, height, depth);
        var bMeshL = new THREE.Mesh(bGeoL, bMat);
        bMeshL.position.set(-(12 + width / 2), height / 2, z);
        buildingGroup.add(bMeshL);

        // Right Building Box
        var bMeshR = new THREE.Mesh(bGeoL, bMat);
        bMeshR.position.set(12 + width / 2, height / 2, z + 6);
        buildingGroup.add(bMeshR);
      }
    }
    buildCity();

    // 3D Car Mesh (NAVIS Vehicle)
    var carGroup = new THREE.Group();
    scene.add(carGroup);

    var carBodyMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.2, metalness: 0.8 });
    var bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.95, 4.4), carBodyMat);
    bodyMesh.position.y = 0.7;
    bodyMesh.castShadow = true;
    carGroup.add(bodyMesh);

    var cabinMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.75, 2.4),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.85 })
    );
    cabinMesh.position.set(0, 1.45, -0.2);
    carGroup.add(cabinMesh);

    // Car Spotlights
    var lightL = new THREE.SpotLight(0xfef08a, 2.5, 40, Math.PI / 6, 0.5);
    lightL.position.set(-0.8, 0.8, 2.2);
    carGroup.add(lightL);
    carGroup.add(lightL.target);
    lightL.target.position.set(-0.8, 0.1, 18.0);

    var lightR = new THREE.SpotLight(0xfef08a, 2.5, 40, Math.PI / 6, 0.5);
    lightR.position.set(0.8, 0.8, 2.2);
    carGroup.add(lightR);
    carGroup.add(lightR.target);
    lightR.target.position.set(0.8, 0.1, 18.0);

    // GNSS Dot & Multipath Reflection Line Group
    var gnssDotMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x4f46e5 })
    );
    scene.add(gnssDotMesh);

    var rayMat = new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 2, transparent: true, opacity: 0.85 });
    var rayGeo = new THREE.BufferGeometry();
    var rayCoords = new Float32Array(18); // 3 line segments
    rayGeo.setAttribute('position', new THREE.BufferAttribute(rayCoords, 3));
    var multipathLines = new THREE.LineSegments(rayGeo, rayMat);
    scene.add(multipathLines);

    // -------------------------------------------------------------
    // LEAFLET 2D MINIMAP SETUP
    // -------------------------------------------------------------
    var minimap = L.map('minimap', { zoomControl: false, attributionControl: false })
      .setView([${center.latitude}, ${center.longitude}], 15.5);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(minimap);

    var plannedRouteNodes = ${JSON.stringify(routeNodes)};
    L.polyline(plannedRouteNodes, { color: '#94A3B8', weight: 6, opacity: 0.9 }).addTo(minimap);
    L.polyline(plannedRouteNodes, { color: '#E2E8F0', weight: 3, opacity: 0.95 }).addTo(minimap);

    var canyonNodes = ${JSON.stringify(canyonNodes)};
    L.polyline(canyonNodes, { color: '#F59E0B', weight: 8, opacity: 0.35 }).addTo(minimap);

    var gtPolyline = L.polyline([], { color: '#64748B', weight: 2.5, opacity: 0.9 }).addTo(minimap);
    var gnssPolyline = L.polyline([], { color: '#4F46E5', weight: 2.5, opacity: 0.85 }).addTo(minimap);
    var navisPolyline = L.polyline([], { color: '#10B981', weight: 3.5, opacity: 0.95 }).addTo(minimap);

    var carMinimapMarker = null;
    var gnssMinimapMarker = null;

    // -------------------------------------------------------------
    // REAL-TIME UPDATE & ANIMATION LOOP
    // -------------------------------------------------------------
    var currentData = null;
    var carZ = 0;
    var carX = 0;
    var gnssZ = 0;
    var gnssX = 0;
    var targetZ = 0;
    var targetX = 0;

    function updateUrbanCanyonMap(data) {
      if (!data) return;
      currentData = data;

      if (data.gt) gtPolyline.setLatLngs(data.gt);
      if (data.gnss) gnssPolyline.setLatLngs(data.gnss);
      if (data.navis) navisPolyline.setLatLngs(data.navis);

      if (data.gnssFix) {
        var gll = [data.gnssFix[0], data.gnssFix[1]];
        if (!gnssMinimapMarker) {
          gnssMinimapMarker = L.marker(gll, {
            icon: L.divIcon({ className: 'portal-marker', html: '<div class="gnss-dot"></div>', iconSize: [10, 10], iconAnchor: [5, 5] })
          }).addTo(minimap);
        } else {
          gnssMinimapMarker.setLatLng(gll);
        }
      }

      if (data.position) {
        var mll = [data.position[0], data.position[1]];
        if (!carMinimapMarker) {
          carMinimapMarker = L.marker(mll, {
            icon: L.divIcon({ className: 'portal-marker', html: '<div class="minimap-car"></div>', iconSize: [12, 12], iconAnchor: [6, 6] })
          }).addTo(minimap);
        } else {
          carMinimapMarker.setLatLng(mll);
        }
        minimap.panTo(mll, { animate: false });
      }

      // HUD Text
      var hudText = document.getElementById('hud-status-text');
      var hudDot = document.getElementById('hud-dot');
      if (data.isInsideCanyon) {
        hudText.innerText = 'URBAN CANYON • GNSS DEGRADED';
        hudDot.style.background = '#d97706';
        carBodyMat.color.setHex(0x8b5cf6);
      } else if (data.state === 'EXIT_RECOVERY' || data.state === 'GNSS_RECOVERING') {
        hudText.innerText = 'EXIT CANYON • GNSS RECOVERING';
        hudDot.style.background = '#7c3aed';
        carBodyMat.color.setHex(0xf59e0b);
      } else {
        hudText.innerText = '3D PERSPECTIVE • NORMAL GNSS';
        hudDot.style.background = '#10b981';
        carBodyMat.color.setHex(0x10b981);
      }

      if (data.totalDrivenMeters !== undefined) {
        targetZ = data.totalDrivenMeters;
      }
      if (data.gnssFix && data.position) {
        var dx = (data.gnssFix[1] - data.position[1]) * 100000;
        gnssX = dx * 0.8;
      }
    }

    var lastTime = null;
    function animate(now) {
      if (!lastTime) lastTime = now;
      var dt = (now - lastTime) / 1000;
      lastTime = now;
      if (dt > 0.1) dt = 0.1;

      // 3D Car Position Lerp
      carZ += (targetZ - carZ) * Math.min(1, dt * 10);
      carGroup.position.set(carX, 0, carZ);

      // Elevated Navigation Camera Follow Setup
      var camZ = carZ - 10.2;
      var camY = 6.4;
      var camX = carX;
      camera.position.set(camX, camY, camZ);
      camera.lookAt(carX, 0.5, carZ + 15.0);

      // GNSS Dot Position
      var inCanyon = currentData && currentData.isInsideCanyon;
      if (inCanyon) {
        gnssZ = carZ + (Math.sin(now * 0.005) * 4.0);
        gnssDotMesh.position.set(gnssX, 0.4, gnssZ);

        // Multipath rays bouncing off skyscrapers
        var pos = multipathLines.geometry.attributes.position.array;
        pos[0] = -12; pos[1] = 45; pos[2] = carZ + 10;
        pos[3] = gnssX; pos[4] = 0.4; pos[5] = gnssZ;

        pos[6] = 12; pos[7] = 60; pos[8] = carZ - 5;
        pos[9] = gnssX; pos[10] = 0.4; pos[11] = gnssZ;

        pos[12] = -12; pos[13] = 30; pos[14] = carZ - 15;
        pos[15] = gnssX; pos[16] = 0.4; pos[17] = gnssZ;

        multipathLines.geometry.attributes.position.needsUpdate = true;
        multipathLines.visible = true;
      } else {
        gnssDotMesh.position.set(carX, 0.4, carZ);
        multipathLines.visible = false;
      }

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);

    window.addEventListener('resize', function() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    window.updateUrbanCanyonMap = updateUrbanCanyonMap;
    document.addEventListener('message', function(e) {
      try { updateUrbanCanyonMap(JSON.parse(e.data)); } catch(err) {}
    });
    window.addEventListener('message', function(e) {
      try { updateUrbanCanyonMap(JSON.parse(e.data)); } catch(err) {}
    });

    setTimeout(function() {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('ready');
    }, 250);
  </script>
</body>
</html>`;
}

export function UrbanCanyonMapView({
  frame,
  isPresentationMode = false,
  style,
  onMapReady,
}: UrbanCanyonMapViewProps) {
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const iframeRef = useRef<any>(null);
  const initialCenter = URBAN_CANYON_ROUTE.start;

  const isDegraded = frame.state === 'GNSS_DEGRADED' || frame.state === 'NAVIS_ESTIMATION';
  const isRecovering = frame.state === 'EXIT_RECOVERY' || frame.state === 'GNSS_RECOVERING';
  const isFused = frame.state === 'FUSED' || frame.state === 'COMPLETED';

  const markerColor = isDegraded ? '#8B5CF6' : isRecovering ? '#F59E0B' : isFused ? '#10B981' : colors.primary;
  const markerLabel = isDegraded ? 'NAVIS' : isRecovering ? 'FUSION' : isFused ? 'NAVIS' : 'NAVIS';

  const thinPath = (pts: LatLng[], max = 280) => {
    if (pts.length <= max) return pts.map((c) => [c.latitude, c.longitude]);
    const step = Math.ceil(pts.length / max);
    const out: number[][] = [];
    for (let i = 0; i < pts.length; i += step) {
      out.push([pts[i].latitude, pts[i].longitude]);
    }
    const last = pts[pts.length - 1];
    const prev = out[out.length - 1];
    if (!prev || prev[0] !== last.latitude || prev[1] !== last.longitude) {
      out.push([last.latitude, last.longitude]);
    }
    return out;
  };

  const pushUpdate = useCallback(() => {
    const payload = {
      gt: thinPath(frame.groundTruthTrajectory),
      gnss: thinPath(frame.gnssTrajectory),
      navis: thinPath(frame.navisTrajectory),
      position: [frame.carPosition.latitude, frame.carPosition.longitude],
      gnssFix: [frame.gnssPosition.latitude, frame.gnssPosition.longitude],
      heading: frame.carHeading,
      totalDrivenMeters: frame.totalDrivenMeters,
      state: frame.state,
      label: markerLabel,
      color: markerColor,
      isInsideCanyon: frame.isInsideCanyon,
      isApproachingCanyon: frame.isApproachingCanyon,
      isPresentation: isPresentationMode,
    };

    if (Platform.OS === 'web') {
      try {
        const win = iframeRef.current?.contentWindow;
        if (win && win.updateUrbanCanyonMap) {
          win.updateUrbanCanyonMap(payload);
        }
      } catch (err) {}
      return;
    }

    if (!webRef.current || !readyRef.current) return;
    const js = `if (window.updateUrbanCanyonMap) { window.updateUrbanCanyonMap(${JSON.stringify(payload)}); } true;`;
    webRef.current.injectJavaScript(js);
  }, [frame, markerColor, markerLabel, isPresentationMode]);

  useEffect(() => {
    pushUpdate();
  }, [pushUpdate]);

  const html = useMemo(() => buildUrbanCanyonHtml(initialCenter), []);

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
          if (e.nativeEvent.data === 'ready') {
            readyRef.current = true;
            onMapReady?.();
            pushUpdate();
          }
        }}
        onError={() => {}}
        {...(Platform.OS === 'android'
          ? {
              allowFileAccessFromFileURLs: true,
              allowUniversalAccessFromFileURLs: true,
            }
          : {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
});
