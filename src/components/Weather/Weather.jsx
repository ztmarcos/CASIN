import React, { useState, useEffect } from 'react';
import './Weather.css';

const Weather = () => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const city = 'Mexico City';

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `https://api.weatherapi.com/v1/current.json?q=${city}`, {
          method: 'GET',
          headers: {
            'X-RapidAPI-Host': 'weatherapi-ninjas.p.rapidapi.com',
          }
        });

        if (!response.ok) {
          throw new Error('Weather data not available');
        }

        const data = await response.json();
        setWeather({
          temp: data.temp,
          humidity: data.humidity,
          windSpeed: data.wind_speed,
          feelsLike: data.feels_like
        });
      } catch (err) {
        setError("Unable to fetch weather data");
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, []);

  if (loading) {
    return (
      <div className="weather-widget loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="weather-widget error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="weather-widget">
      <div className="weather-main">
        <div className="location">{city}</div>
        <div className="weather-info">
          <div className="temperature">{weather?.temp}°C</div>
          <div className="feels-like">Feels like: {weather?.feelsLike}°C</div>
        </div>
      </div>
      <div className="weather-details">
        <div className="detail">
          <span className="label">Humidity</span>
          <span className="value">{weather?.humidity}%</span>
        </div>
        <div className="detail">
          <span className="label">Wind</span>
          <span className="value">{weather?.windSpeed} km/h</span>
        </div>
      </div>
    </div>
  );
};

export default Weather; 