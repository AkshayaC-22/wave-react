'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

interface Village {
  id: number;
  name: string;
  lat: number;
  lng: number;
  contact: string;
  waterQuality: string;
}

interface WaterBody {
  id: number;
  name: string;
  lat: number;
  lng: number;
  type: string;
  quality: string;
  pH: number;
}

interface VillageMapProps {
  villages: Village[];
  waterBodies: WaterBody[];
  onVillageSelect?: (village: Village) => void;
  onWaterBodySelect?: (waterBody: WaterBody) => void;
}

const VillageMapComponent: React.FC<VillageMapProps> = ({
  villages,
  waterBodies,
  onVillageSelect,
  onWaterBodySelect,
}) => {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [L, setL] = useState<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    const initializeMap = async () => {
      const leaflet = await import('leaflet');
      await import('leaflet/dist/leaflet.css');
      setL(leaflet.default);

      const map = leaflet.default.map(containerRef.current).setView([23.1815, 79.9864], 5);

      leaflet.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
      setMapInitialized(true);
    };

    initializeMap();
  }, []);

  useEffect(() => {
    if (!mapRef.current || !L) return;

    const map = mapRef.current;

    // Clear existing layers
    map.eachLayer((layer: any) => {
      if (layer.remove) {
        layer.remove();
      }
    });

    // Re-add base layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add village markers
    villages.forEach((village) => {
      const icon = L.divIcon({
        className: 'village-marker',
        html: `
          <div class="marker-icon village-marker-icon">
            🏘️
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40],
      });

      const marker = L.marker([village.lat, village.lng], { icon })
        .bindPopup(`
          <div class="map-popup">
            <h4>${village.name}</h4>
            <p><strong>Village:</strong> ${village.village}</p>
            <p><strong>Water Quality:</strong> ${village.waterQuality}</p>
            <p><strong>Contact:</strong> ${village.contact}</p>
          </div>
        `)
        .addTo(map);

      marker.on('click', () => {
        onVillageSelect?.(village);
      });
    });

    // Add water body markers
    waterBodies.forEach((body) => {
      let icon = '💧';
      if (body.type === 'river') icon = '🌊';
      if (body.type === 'pond') icon = '🏞️';
      if (body.type === 'well') icon = '🚰';

      const qualityColor =
        body.quality === 'Good'
          ? '#22c55e'
          : body.quality === 'Moderate'
            ? '#f59e0b'
            : '#ef4444';

      const marker = L.circleMarker([body.lat, body.lng], {
        radius: 10,
        fillColor: qualityColor,
        color: '#000',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      })
        .bindPopup(`
          <div class="map-popup">
            <h4>${icon} ${body.name}</h4>
            <p><strong>Type:</strong> ${body.type}</p>
            <p><strong>Quality:</strong> <span style="color: ${qualityColor}; font-weight: bold;">${body.quality}</span></p>
            <p><strong>pH:</strong> ${body.pH}</p>
          </div>
        `)
        .addTo(map);

      marker.on('click', () => {
        onWaterBodySelect?.(body);
      });
    });

    // Fit bounds to show all markers
    if ((villages.length > 0 || waterBodies.length > 0) && mapInitialized) {
      const allLocations = [
        ...villages.map((v) => [v.lat, v.lng]),
        ...waterBodies.map((w) => [w.lat, w.lng]),
      ];
      const bounds = L.latLngBounds(allLocations);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [villages, waterBodies, mapInitialized, L, onVillageSelect, onWaterBodySelect]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '600px',
        borderRadius: '1rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(0, 0, 0, 0.05)',
        overflow: 'hidden',
      }}
    >
      <style>{`
        .village-marker-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          font-size: 24px;
          border: 3px solid #2dd4bf;
          animation: bounce 0.6s infinite;
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .map-popup {
          font-family: Arial, sans-serif;
          min-width: 200px;
        }

        .map-popup h4 {
          margin: 0 0 8px 0;
          color: #1e293b;
          font-size: 14px;
          font-weight: 600;
        }

        .map-popup p {
          margin: 4px 0;
          font-size: 13px;
          color: #475569;
        }

        .leaflet-popup-content-wrapper {
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        }

        .leaflet-popup-tip {
          background-color: white;
        }

        .leaflet-container {
          background: #f0f9ff;
          font-family: Arial, sans-serif;
        }

        .leaflet-control-zoom,
        .leaflet-control-attribution {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
};

const VillageMap = dynamic(() => Promise.resolve(VillageMapComponent), {
  ssr: false,
  loading: () => <div style={{ width: '100%', height: '600px', background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '1rem' }}>Loading map...</div>,
});

export default VillageMap;
