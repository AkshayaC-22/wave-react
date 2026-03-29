'use client';

import React, { useEffect, useRef, useState } from 'react';

// Dynamic import for Leaflet (only on client side)
let L: any;
if (typeof window !== 'undefined') {
  L = require('leaflet');
  
  // Fix for default marker icons in Leaflet with Next.js
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

interface VillageMapProps {
  villages: any[];
  waterBodies: any[];
  center?: { lat: number; lng: number };
  zoom?: number;
  onVillageSelect: (village: any) => void;
  onWaterBodySelect: (body: any) => void;
}

const VillageMapComponent: React.FC<VillageMapProps> = ({
  villages,
  waterBodies,
  center,
  zoom = 5,
  onVillageSelect,
  onWaterBodySelect,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Check if running on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Cleanup function to remove markers
  const clearMarkers = () => {
    markersRef.current.forEach(marker => {
      if (marker && marker.remove) marker.remove();
    });
    markersRef.current = [];
  };

  // Initialize map only once
  useEffect(() => {
    setIsMounted(true);
    
    return () => {
      // Cleanup map on component unmount
      if (mapRef.current && mapRef.current.remove) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Initialize map after component mounts (client side only)
  useEffect(() => {
    if (!isClient || !isMounted || !containerRef.current || typeof window === 'undefined') return;
    if (!L) return;
    
    // Only initialize if map doesn't exist
    if (!mapRef.current) {
      try {
        const map = L.map(containerRef.current).setView([center?.lat || 23.1815, center?.lng || 79.9864], zoom);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
        }).addTo(map);
        
        mapRef.current = map;
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    }
  }, [isClient, isMounted, center, zoom]);

  // Handle user location marker and center
  useEffect(() => {
    if (!isClient || !mapRef.current || !L) return;

    // Center map if center prop changes
    if (center && center.lat && center.lng) {
      mapRef.current.setView([center.lat, center.lng], 12);
      
      // Remove existing user marker
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      
      // Add user location marker
      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: `<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 2px #3b82f6;"></div>`,
        iconSize: [16, 16],
        popupAnchor: [0, -8]
      });

      userMarkerRef.current = L.marker([center.lat, center.lng], { icon: userIcon })
        .addTo(mapRef.current)
        .bindPopup(`
          <div style="font-family: Arial, sans-serif; text-align: center;">
            <strong style="color: #3b82f6;">📍 Your Location</strong><br/>
            <span style="font-size: 12px;">Lat: ${center.lat.toFixed(4)}</span><br/>
            <span style="font-size: 12px;">Lng: ${center.lng.toFixed(4)}</span>
          </div>
        `);
    }
  }, [center, isClient]);

  // Add markers when villages or waterBodies change
  useEffect(() => {
    if (!isClient || !mapRef.current || !L) return;

    // Clear existing markers (except user marker)
    markersRef.current.forEach(marker => {
      if (marker && marker.remove) marker.remove();
    });
    markersRef.current = [];

    // Add village markers
    villages.forEach(village => {
      if (village.lat && village.lng) {
        const marker = L.marker([village.lat, village.lng])
          .addTo(mapRef.current)
          .bindPopup(`
            <div style="font-family: Arial, sans-serif; min-width: 150px;">
              <strong style="font-size: 14px; color: #2dd4bf;">🏘️ ${village.name}</strong><br/>
              <span style="font-size: 12px;">📍 ${village.village}</span><br/>
              <span style="font-size: 12px;">📞 ${village.contact}</span><br/>
              <span style="font-size: 12px;">💧 Water Quality: ${village.waterQuality || 'Good'}</span><br/>
              <button onclick="window.handleVillageSelect(${JSON.stringify(village).replace(/"/g, '&quot;')})" 
                style="margin-top: 8px; padding: 4px 12px; background: #2dd4bf; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                View Details
              </button>
            </div>
          `);
        
        marker.on('click', () => {
          onVillageSelect(village);
        });
        
        markersRef.current.push(marker);
      }
    });

    // Add water body markers
    waterBodies.forEach(body => {
      if (body.lat && body.lng) {
        const color = body.quality === 'Good' ? '#22c55e' : body.quality === 'Moderate' ? '#f59e0b' : '#ef4444';
        const icon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>`,
          iconSize: [12, 12],
          popupAnchor: [0, -6]
        });
        
        const marker = L.marker([body.lat, body.lng], { icon })
          .addTo(mapRef.current)
          .bindPopup(`
            <div style="font-family: Arial, sans-serif; min-width: 150px;">
              <strong style="font-size: 14px; color: #2dd4bf;">💧 ${body.name}</strong><br/>
              <span style="font-size: 12px;">📍 Type: ${body.type}</span><br/>
              <span style="font-size: 12px;">📊 Quality: ${body.quality}</span><br/>
              <span style="font-size: 12px;">🧪 pH: ${body.pH}</span><br/>
              <span style="font-size: 12px;">📏 Distance: ${body.distance}</span><br/>
              <button onclick="window.handleWaterBodySelect(${JSON.stringify(body).replace(/"/g, '&quot;')})" 
                style="margin-top: 8px; padding: 4px 12px; background: #2dd4bf; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                View Details
              </button>
            </div>
          `);
        
        marker.on('click', () => {
          onWaterBodySelect(body);
        });
        
        markersRef.current.push(marker);
      }
    });

    // Only fit bounds if no user location is set
    if (!center && markersRef.current.length > 0) {
      const bounds = L.latLngBounds(markersRef.current.map(m => m.getLatLng()));
      mapRef.current.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [villages, waterBodies, center, onVillageSelect, onWaterBodySelect, isClient]);

  // Add global handlers for popup buttons
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    (window as any).handleVillageSelect = (village: any) => {
      onVillageSelect(village);
    };
    (window as any).handleWaterBodySelect = (body: any) => {
      onWaterBodySelect(body);
    };

    return () => {
      delete (window as any).handleVillageSelect;
      delete (window as any).handleWaterBodySelect;
    };
  }, [onVillageSelect, onWaterBodySelect]);

  // Show loading state on server
  if (!isClient) {
    return (
      <div style={{ 
        width: '100%', 
        height: '500px', 
        borderRadius: '16px',
        background: '#f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        color: '#666'
      }}>
        🗺️ Loading Map...
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '500px', 
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }} 
    />
  );
};

export default VillageMapComponent;
