import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '../theme/colors';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface OSMMapViewProps {
  initialCenter: LatLng;
  currentPosition: LatLng | null;
  gnssTrajectory: LatLng[];
  drTrajectory: LatLng[];
  fusedTrajectory: LatLng[];
  markerLabel?: string;
  markerColor?: string;
  onMapReady?: () => void;
}

export function OSMMapView({
  initialCenter,
  currentPosition,
  gnssTrajectory,
  drTrajectory,
  fusedTrajectory,
  markerLabel = 'GNSS',
  markerColor = colors.markerGNSS,
  onMapReady,
}: OSMMapViewProps) {
  const webViewRef = useRef<WebView>(null);
  const [isReady, setIsReady] = useState(false);

  const initialLat = initialCenter.latitude;
  const initialLng = initialCenter.longitude;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #F0F2FA; overflow: hidden; }
    
    .nav-marker-container {
      position: relative;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .nav-marker-halo {
      position: absolute;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      opacity: 0.35;
      animation: pulseAnim 1.8s infinite ease-out;
    }
    
    .nav-marker-core {
      position: relative;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 2.5px solid #FFFFFF;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFFFFF;
      font-size: 8px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-weight: 800;
      letter-spacing: 0.5px;
      transition: background-color 0.3s ease;
    }

    @keyframes pulseAnim {
      0% { transform: scale(0.6); opacity: 0.8; }
      100% { transform: scale(1.5); opacity: 0; }
    }
    
    .leaflet-control-attribution {
      font-size: 8px !important;
      background: rgba(255,255,255,0.7) !important;
      border-radius: 4px !important;
      padding: 1px 4px !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      center: [${initialLat}, ${initialLng}],
      zoom: 17,
      zoomControl: false,
      attributionControl: false
    });

    // Pure OpenStreetMap Standard Tiles (No Google Maps, No API keys required)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Polylines for trajectories
    var gnssPolyline = L.polyline([], {
      color: '#4F46E5',
      weight: 4,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    var drPolyline = L.polyline([], {
      color: '#F59E0B',
      weight: 3.5,
      opacity: 0.95,
      dashArray: '8, 6',
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    var fusedPolyline = L.polyline([], {
      color: '#10B981',
      weight: 4,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    var currentMarker = null;

    function createMarkerIcon(label, color) {
      var html = '<div class="nav-marker-container">' +
                   '<div class="nav-marker-halo" style="background-color:' + color + '"></div>' +
                   '<div class="nav-marker-core" style="background-color:' + color + '">' + label + '</div>' +
                 '</div>';
      return L.divIcon({
        className: 'nav-icon-wrapper',
        html: html,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
    }

    function handlePayload(data) {
      if (!data) return;

      if (Array.isArray(data.gnss)) {
        gnssPolyline.setLatLngs(data.gnss.map(function(p) { return [p.latitude, p.longitude]; }));
      }
      if (Array.isArray(data.dr)) {
        drPolyline.setLatLngs(data.dr.map(function(p) { return [p.latitude, p.longitude]; }));
      }
      if (Array.isArray(data.fused)) {
        fusedPolyline.setLatLngs(data.fused.map(function(p) { return [p.latitude, p.longitude]; }));
      }

      if (data.pos && typeof data.pos.latitude === 'number' && typeof data.pos.longitude === 'number') {
        var latlng = [data.pos.latitude, data.pos.longitude];
        var icon = createMarkerIcon(data.markerLabel || 'GNSS', data.markerColor || '#4F46E5');
        
        if (!currentMarker) {
          currentMarker = L.marker(latlng, { icon: icon }).addTo(map);
        } else {
          currentMarker.setLatLng(latlng);
          currentMarker.setIcon(icon);
        }
        
        map.panTo(latlng, { animate: true, duration: 0.4 });
      }
    }

    window.addEventListener('message', function(e) {
      try {
        var data = JSON.parse(e.data);
        handlePayload(data);
      } catch (err) {}
    });

    document.addEventListener('message', function(e) {
      try {
        var data = JSON.parse(e.data);
        handlePayload(data);
      } catch (err) {}
    });

    // Notify React Native ready
    setTimeout(function() {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
      }
    }, 200);
  </script>
</body>
</html>
  `;

  // Send updates to Leaflet inside WebView whenever props update
  useEffect(() => {
    if (!isReady || !webViewRef.current) return;

    const payload = JSON.stringify({
      pos: currentPosition,
      markerLabel,
      markerColor,
      gnss: gnssTrajectory,
      dr: drTrajectory,
      fused: fusedTrajectory,
    });

    const js = `
      try {
        handlePayload(${payload});
      } catch (e) {}
      true;
    `;
    webViewRef.current.injectJavaScript(js);
  }, [isReady, currentPosition, markerLabel, markerColor, gnssTrajectory, drTrajectory, fusedTrajectory]);

  const onMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MAP_READY') {
        setIsReady(true);
        if (onMapReady) onMapReady();
      }
    } catch (e) {}
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        onMessage={onMessage}
        onLoadEnd={() => {
          setIsReady(true);
          if (onMapReady) onMapReady();
        }}
      />
      {!isReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#E8EBF5',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#E8EBF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
