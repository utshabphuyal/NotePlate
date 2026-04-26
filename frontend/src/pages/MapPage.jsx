import React, { useEffect, useRef } from 'react';

export default function MapPage() {
  const mapContainer = useRef(null);
  const token = process.env.REACT_APP_MAPBOX_TOKEN;

  useEffect(() => {
    if (!token || !mapContainer.current) return;
    
    const script = document.createElement('script');
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js';
    script.onload = () => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css';
      document.head.appendChild(link);

      window.mapboxgl.accessToken = token;
      new window.mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [-74.4057, 40.0583],
        zoom: 12,
      });
    };
    document.head.appendChild(script);
  }, [token]);

  if (!token) return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <p>Add REACT_APP_MAPBOX_TOKEN to frontend/.env</p>
    </div>
  );

  return (
    <div style={{ height: 'calc(100vh - 8rem)', borderRadius: 16, overflow: 'hidden' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}