import React, { useEffect, useRef, useState } from 'react';

let googleMapsPromise;

function loadGoogleMaps(apiKey) {
  if (window.google?.maps) return Promise.resolve(window.google);
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-google-maps-loader]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.google), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Google Maps could not be loaded.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.dataset.googleMapsLoader = 'true';
    script.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(apiKey) + '&v=weekly';
    script.async = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error('Google Maps could not be loaded. Check your API key and Maps JavaScript API setup.'));
    document.head.appendChild(script);
  }).catch((error) => {
    googleMapsPromise = null;
    throw error;
  });

  return googleMapsPromise;
}

function getAddressParts(result) {
  const components = result.address_components || [];
  const get = (type, short = false) => {
    const component = components.find((item) => item.types.includes(type));
    return component ? component[short ? 'short_name' : 'long_name'] : '';
  };

  return {
    address: result.formatted_address || '',
    city: get('locality') || get('sublocality') || get('administrative_area_level_2'),
    state: get('administrative_area_level_1'),
    pincode: get('postal_code'),
  };
}

function LocationPicker({ apiKey, onSelect }) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const geocoderRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    if (!apiKey) return undefined;
    let active = true;

    loadGoogleMaps(apiKey)
      .then((google) => {
        if (!active || !mapElementRef.current || mapRef.current) return;
        const map = new google.maps.Map(mapElementRef.current, {
          center: { lat: 26.9124, lng: 75.7873 },
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        const geocoder = new google.maps.Geocoder();
        mapRef.current = map;
        geocoderRef.current = geocoder;
        map.addListener('click', (event) => {
          if (event.latLng) selectCoordinates(event.latLng.lat(), event.latLng.lng(), geocoder, google);
        });
      })
      .catch((error) => setMessage(error.message));

    return () => { active = false; };
  }, [apiKey]);

  function selectCoordinates(latitude, longitude, geocoder = geocoderRef.current, google = window.google) {
    if (!geocoder || !google?.maps) return;
    setLoading(true);
    setMessage('Finding this address…');
    geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
      setLoading(false);
      if (status !== 'OK' || !results?.[0]) {
        setMessage('Address details could not be found. You can still type your address manually.');
        return;
      }
      const location = { latitude, longitude, ...getAddressParts(results[0]) };
      if (markerRef.current) markerRef.current.setMap(null);
      markerRef.current = new google.maps.Marker({
        position: { lat: latitude, lng: longitude },
        map: mapRef.current,
        title: 'Delivery location',
      });
      onSelectRef.current(location);
      setSearch(location.address);
      setMessage('Location selected. You can edit the address and add house or landmark details.');
    });
  }

  function searchAddress(event) {
    event.preventDefault();
    if (!search.trim() || !geocoderRef.current) return;
    setLoading(true);
    setMessage('Searching on Google Maps…');
    geocoderRef.current.geocode({ address: search.trim(), componentRestrictions: { country: 'IN' } }, (results, status) => {
      setLoading(false);
      if (status !== 'OK' || !results?.[0]) {
        setMessage('No matching location found. Try a nearby landmark or pin the map manually.');
        return;
      }
      const point = results[0].geometry.location;
      mapRef.current.setCenter(point);
      mapRef.current.setZoom(16);
      selectCoordinates(point.lat(), point.lng());
    });
  }

  if (!apiKey) {
    return (
      <div className="location-picker">
        <p className="location-picker__message">Google Maps needs an API key before the map can be shown. Manual address entry is available meanwhile. Configure <strong>VITE_GOOGLE_MAPS_API_KEY</strong> in the client environment.</p>
      </div>
    );
  }

  return (
    <div className="location-picker">
      <form className="location-picker__search" onSubmit={searchAddress}>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search area, street or landmark" aria-label="Search map location" />
        <button type="submit" disabled={loading}>{loading ? 'Searching…' : 'Search map'}</button>
      </form>
      <div className="location-picker__map" ref={mapElementRef} role="application" aria-label="Google map. Click to select delivery location." />
      <p className="location-picker__message" aria-live="polite">{message || 'Search for an address or click the map to drop your delivery pin.'}</p>
    </div>
  );
}

export default LocationPicker;
