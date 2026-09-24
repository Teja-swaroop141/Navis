/**
 * LeafletMapView.tsx
 *
 * A high-performance, WebView-based OpenStreetMap component using Leaflet.js.
 * - Pure OpenStreetMap (Free, No API Key, No Watermark)
 * - 100% compatible with Expo Go, Android, iOS, and Web
 * - Zero-flicker live animated position marker with pulse effect & mode label
 * - Multi-colored trajectories (GNSS indigo, Dead Reckoning amber dashed, Fused emerald)
 * - Smooth camera follow
 */

import React, { useRef, useCallback, useEffect } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface LeafletMapProps {
  initialCenter: LatLng;
  currentPosition: LatLng | null;
  gnssTrajectory: LatLng[];
  drTrajectory: LatLng[];
  fusedTrajectory: LatLng[];
  markerLabel: string;
  markerColor: string;
  style?: object;
  onMapReady?: () => void;
}

function buildHtml(center: LatLng): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #f0f2f8; overflow: hidden; }
    
    .custom-marker {
      background: transparent;
      border: none;
    }
    .marker-wrap {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      transform: translate3d(0,0,0);
      -webkit-transform: translate3d(0,0,0);
    }
    .marker-pulse {
      position: absolute;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      opacity: 0.35;
      animation: pulse 1.8s ease-out infinite;
      pointer-events: none;
    }
    @keyframes pulse {
      0% { transform: scale(0.6); opacity: 0.8; }
      100% { transform: scale(1.4); opacity: 0; }
    }
    .marker-dot {
      position: relative;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 10px;
      font-weight: 800;
      color: white;
      letter-spacing: 0.5px;
      border: 2.5px solid #ffffff;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      transition: background-color 0.3s ease;
    }
    .leaflet-tile {
      image-rendering: -webkit-optimize-contrast;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([${center.latitude}, ${center.longitude}], 16);

    // Official Free OpenStreetMap Tile Server (No API Key, No Watermark)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Trajectory polylines
    var gnssLine = L.polyline([], { color: '#4F46E5', weight: 4, opacity: 0.95 }).addTo(map);
    var drLine   = L.polyline([], { color: '#F59E0B', weight: 3.5, opacity: 0.9, dashArray: '8, 6' }).addTo(map);
    var fusedLine= L.polyline([], { color: '#10B981', weight: 4, opacity: 0.95 }).addTo(map);

    // Position marker state
    var marker = null;
    var currentLabel = '';
    var currentColor = '';

    function makeIcon(label, color) {
      return L.divIcon({
        className: 'custom-marker',
        html: '<div class="marker-wrap"><div class="marker-pulse" style="background:' + color + '"></div><div class="marker-dot" style="background:' + color + '">' + label + '</div></div>',
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });
    }

    function updateMap(data) {
      if (!data) return;
      if (data.gnss) gnssLine.setLatLngs(data.gnss);
      if (data.dr) drLine.setLatLngs(data.dr);
      if (data.fused) fusedLine.setLatLngs(data.fused);

      if (data.position) {
        var latlng = [data.position[0], data.position[1]];
        var label = data.label || 'GNSS';
        var color = data.color || '#4F46E5';

        if (!marker) {
          currentLabel = label;
          currentColor = color;
          marker = L.marker(latlng, { icon: makeIcon(label, color) }).addTo(map);
        } else {
          marker.setLatLng(latlng);
          // Only re-create icon if mode/color changed (prevents DOM recreation and flickering)
          if (label !== currentLabel || color !== currentColor) {
            currentLabel = label;
            currentColor = color;
            marker.setIcon(makeIcon(label, color));
          }
        }
        map.panTo(latlng, { animate: true, duration: 0.4 });
      }
    }

    window.updateMap = updateMap;

    document.addEventListener('message', function(e) {
      try { updateMap(JSON.parse(e.data)); } catch(err) {}
    });
    window.addEventListener('message', function(e) {
      try { updateMap(JSON.parse(e.data)); } catch(err) {}
    });

    setTimeout(function() {
      map.invalidateSize();
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage('ready');
      }
    }, 200);
  </script>
</body>
</html>`;
}

export function LeafletMapView({
  initialCenter,
  currentPosition,
  gnssTrajectory,
  drTrajectory,
  fusedTrajectory,
  markerLabel,
  markerColor,
  style,
  onMapReady,
}: LeafletMapProps) {
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);

  const iframeRef = useRef<any>(null);

  const pushUpdate = useCallback(() => {
    const payload = {
      gnss: gnssTrajectory.map(c => [c.latitude, c.longitude]),
      dr: drTrajectory.map(c => [c.latitude, c.longitude]),
      fused: fusedTrajectory.map(c => [c.latitude, c.longitude]),
      position: currentPosition
        ? [currentPosition.latitude, currentPosition.longitude]
        : null,
      label: markerLabel,
      color: markerColor,
    };

    if (Platform.OS === 'web') {
      try {
        const win = iframeRef.current?.contentWindow;
        if (win && win.updateMap) {
          win.updateMap(payload);
        }
      } catch (err) {}
      return;
    }

    if (!webRef.current || !readyRef.current) return;
    const js = `if (window.updateMap) { window.updateMap(${JSON.stringify(payload)}); } true;`;
    webRef.current.injectJavaScript(js);
  }, [currentPosition, gnssTrajectory, drTrajectory, fusedTrajectory, markerLabel, markerColor]);

  useEffect(() => {
    pushUpdate();
  }, [pushUpdate]);

  const html = React.useMemo(() => buildHtml(initialCenter), [initialCenter.latitude, initialCenter.longitude]);

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, style]}>
        {/* @ts-ignore Web iframe */}
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
        {...(Platform.OS === 'android' ? {
          allowFileAccessFromFileURLs: true,
          allowUniversalAccessFromFileURLs: true,
        } : {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', backgroundColor: '#f0f2f8' },
  webview: { flex: 1, backgroundColor: '#f0f2f8' },
});
