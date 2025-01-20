import React, { useState, useEffect } from 'react';
import './Weather.css';

const Weather = () => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    const getLocation = () => {
      console.log('Obteniendo ubicación...');
      if (!navigator.geolocation) {
        setError('Tu navegador no soporta geolocalización');
        setLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Ubicación recibida:', position.coords);
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        (err) => {
          console.error('Error de geolocalización:', err);
          setError('No se pudo obtener tu ubicación. Usando ubicación predeterminada.');
          // Ubicación predeterminada: Ciudad de México
          setLocation({
            lat: 19.4326,
            lon: -99.1332
          });
        },
        {
          timeout: 5000,
          maximumAge: 0
        }
      );
    };

    getLocation();
  }, []);

  useEffect(() => {
    const fetchWeather = async () => {
      if (!location) {
        console.log('Ubicación no disponible aún');
        return;
      }
      
      console.log('Obteniendo clima para:', location);
      try {
        setLoading(true);
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m`;
        console.log('Consultando URL:', url);

        const response = await fetch(url);
        console.log('Estado de respuesta:', response.status);

        if (!response.ok) {
          throw new Error(`Datos del clima no disponibles (${response.status})`);
        }

        const data = await response.json();
        console.log('Datos del clima recibidos:', data);

        if (!data.current) {
          throw new Error('Formato de datos del clima inválido');
        }

        setWeather({
          temp: Math.round(data.current.temperature_2m),
          humidity: data.current.relative_humidity_2m,
          windSpeed: Math.round(data.current.wind_speed_10m),
          feelsLike: Math.round(data.current.apparent_temperature),
          location: 'Tu ubicación'
        });
        setError(null);
      } catch (err) {
        console.error('Error en API del clima:', err);
        setError("No se pudo obtener el clima: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [location]);

  console.log('Estado del renderizado:', { loading, error, weather, location });

  if (loading) {
    return (
      <div className="weather-widget loading">
        <div className="loading-spinner"></div>
        <p className="loading-text">Cargando datos del clima...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="weather-widget error">
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="retry-button"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="weather-widget">
      <div className="weather-main">
        <div className="location">{weather?.location}</div>
        <div className="weather-info">
          <div className="temperature">{weather?.temp}°C</div>
          <div className="feels-like">Sensación térmica: {weather?.feelsLike}°C</div>
        </div>
      </div>
      <div className="weather-details">
        <div className="detail">
          <span className="label">Humedad</span>
          <span className="value">{weather?.humidity}%</span>
        </div>
        <div className="detail">
          <span className="label">Viento</span>
          <span className="value">{weather?.windSpeed} km/h</span>
        </div>
      </div>
    </div>
  );
};

export default Weather; 