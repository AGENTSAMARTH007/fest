
"use strict";

// ============================================
// EcoPulse: Environmental Intelligence
// APIs: Open-Meteo Geocoding, Weather, Air Quality
// ============================================

const API = {
  geocoding: "https://geocoding-api.open-meteo.com/v1/search",
  weather: "https://api.open-meteo.com/v1/forecast",
  air: "https://air-quality-api.open-meteo.com/v1/air-quality"
};

const $ = (selector) => document.querySelector(selector);

const elements = {
  searchForm: $("#city-search-form"),
  cityInput: $("#city-input"),
  searchButton: $("#search-button"),
  searchStatus: $("#search-status"),
  cityResults: $("#city-results"),

  loading: $("#loading-state"),
  error: $("#error-state"),
  errorTitle: $("#error-title"),
  errorMessage: $("#error-message"),
  retryButton: $("#retry-button"),
  dashboard: $("#dashboard-content"),

  currentCity: $("#current-city"),
  locationMeta: $("#location-meta"),
  favoriteButton: $("#favorite-button"),

  aqiValue: $("#aqi-value"),
  aqiCategory: $("#aqi-category"),
  aqiDescription: $("#aqi-description"),
  insightTitle: $("#insight-title"),
  insightText: $("#insight-text"),

  temperature: $("#temperature-value"),
  humidity: $("#humidity-value"),
  wind: $("#wind-value"),
  pm25: $("#pm25-value"),
  pm10: $("#pm10-value"),

  trendFilter: $("#trend-filter"),
  chart: $("#trend-chart"),
  chartLabel: $("#chart-label"),
  chartEmpty: $("#chart-empty"),

  aqiFilter: $("#aqi-filter"),
  comparisonList: $("#comparison-list"),
  comparisonStatus: $("#comparison-status")
};

// Application state
let currentCity = null;
let currentWeather = null;
let currentAir = null;
let currentForecast = null;
let currentAirForecast = null;
let lastSearchCity = "Pune";
let requestNumber = 0;

const FAVORITES_KEY = "ecopulse-favorite-cities";

const TREND_OPTIONS = {
  us_aqi: {
    label: "US AQI",
    unit: "AQI",
    source: "air"
  },
  pm2_5: {
    label: "PM2.5",
    unit: "µg/m³",
    source: "air"
  },
  pm10: {
    label: "PM10",
    unit: "µg/m³",
    source: "air"
  },
  temperature_2m: {
    label: "Temperature",
    unit: "°C",
    source: "weather"
  }
};

// --------------------------------------------
// Helpers
// --------------------------------------------

function setText(element, value) {
  element.textContent = value;
}

function formatNumber(value, digits = 1) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "--";
  }

  return value.toFixed(digits);
}

function getFavorites() {
  try {
    const stored = JSON.parse(
      localStorage.getItem(FAVORITES_KEY) || "[]"
    );

    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function saveFavorites(favorites) {
  try {
    localStorage.setItem(
      FAVORITES_KEY,
      JSON.stringify(favorites)
    );
    return true;
  } catch {
    return false;
  }
}

function isFavorite(city) {
  return getFavorites().some(
    (item) =>
      item.latitude === city.latitude &&
      item.longitude === city.longitude
  );
}

function setLoading(isLoading) {
  elements.loading.hidden = !isLoading;
  elements.searchButton.disabled = isLoading;
  elements.cityInput.disabled = isLoading;

  elements.searchButton.textContent = isLoading
    ? "Loading..."
    : "Explore city ↗";

  if (isLoading) {
    elements.error.hidden = true;
    elements.dashboard.hidden = true;
  }
}

function showError(title, message) {
  elements.loading.hidden = true;
  elements.error.hidden = false;
  elements.dashboard.hidden = true;

  setText(elements.errorTitle, title);
  setText(elements.errorMessage, message);
}

function showDashboard() {
  elements.loading.hidden = true;
  elements.error.hidden = true;
  elements.dashboard.hidden = false;
}

async function fetchJSON(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  return response.json();
}

// --------------------------------------------
// AQI interpretation
// US AQI categories, not India's CPCB AQI scale
// --------------------------------------------

function getAqiInfo(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return {
      category: "Unavailable",
      description: "An AQI value is not available for this location."
    };
  }

  if (value <= 50) {
    return {
      category: "Good",
      description: "Air quality is in the good range on the US AQI scale."
    };
  }

  if (value <= 100) {
    return {
      category: "Moderate",
      description: "Air quality is in the moderate range on the US AQI scale."
    };
  }

  if (value <= 150) {
    return {
      category: "Unhealthy for sensitive groups",
      description: "Sensitive individuals may need to take extra care."
    };
  }

  if (value <= 200) {
    return {
      category: "Unhealthy",
      description: "The US AQI falls in the unhealthy range."
    };
  }

  if (value <= 300) {
    return {
      category: "Very unhealthy",
      description: "The US AQI falls in the very unhealthy range."
    };
  }

  return {
    category: "Hazardous",
    description: "The US AQI falls in the hazardous range."
  };
}

// --------------------------------------------
// 1. Search cities using the Geocoding API
// --------------------------------------------

elements.searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const query = elements.cityInput.value.trim();

  if (query.length < 2) {
    setText(elements.searchStatus, "Enter at least two characters.");
    return;
  }

  elements.cityResults.hidden = true;
  elements.cityResults.replaceChildren();

  setText(elements.searchStatus, "Searching for cities...");

  try {
    const url = new URL(API.geocoding);

    url.search = new URLSearchParams({
      name: query,
      count: "6",
      language: "en",
      format: "json"
    });

    const data = await fetchJSON(url);

    if (!data.results || data.results.length === 0) {
      setText(
        elements.searchStatus,
        `No cities found for "${query}". Try another spelling.`
      );
      return;
    }

    renderCityResults(data.results);

    setText(
      elements.searchStatus,
      `${data.results.length} matching location(s) found. Select one.`
    );
  } catch (error) {
    console.error("City search failed:", error);

    setText(
      elements.searchStatus,
      "City search failed. Check your internet connection and try again."
    );
  }
});

function renderCityResults(cities) {
  elements.cityResults.replaceChildren();

  cities.forEach((city) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "city-result";

    const details = document.createElement("div");
    const name = document.createElement("strong");
    const location = document.createElement("span");

    name.textContent = city.name;

    location.textContent = [
      city.admin1,
      city.country
    ].filter(Boolean).join(", ");

    details.append(name, location);

    const arrow = document.createElement("span");
    arrow.textContent = "↗";
    arrow.setAttribute("aria-hidden", "true");

    button.append(details, arrow);

    button.addEventListener("click", () => {
      loadCity({
        name: city.name,
        country: city.country || "",
        admin1: city.admin1 || "",
        latitude: city.latitude,
        longitude: city.longitude,
        timezone: city.timezone || "auto"
      });
    });

    elements.cityResults.append(button);
  });

  elements.cityResults.hidden = false;
}

// --------------------------------------------
// 2. Fetch weather and air-quality data
// --------------------------------------------

async function loadCity(city) {
  const thisRequest = ++requestNumber;

  lastSearchCity = city.name;

  elements.cityResults.hidden = true;
  setText(elements.searchStatus, "");

  setLoading(true);

  try {
    const weatherURL = new URL(API.weather);

    weatherURL.search = new URLSearchParams({
      latitude: String(city.latitude),
      longitude: String(city.longitude),
      current: [
        "temperature_2m",
        "relative_humidity_2m",
        "wind_speed_10m"
      ].join(","),
      hourly: "temperature_2m",
      forecast_days: "1",
      timezone: city.timezone || "auto"
    });

    const airURL = new URL(API.air);

    airURL.search = new URLSearchParams({
      latitude: String(city.latitude),
      longitude: String(city.longitude),
      current: "us_aqi,pm2_5,pm10",
      hourly: "us_aqi,pm2_5,pm10",
      forecast_days: "1",
      timezone: city.timezone || "auto"
    });

    // Fetch both APIs concurrently.
    const [weather, air] = await Promise.all([
      fetchJSON(weatherURL),
      fetchJSON(airURL)
    ]);

    // Ignore older responses if a newer city was selected.
    if (thisRequest !== requestNumber) return;

    if (!weather.current || !air.current) {
      throw new Error("The APIs returned incomplete current data.");
    }

    currentCity = city;
    currentWeather = weather.current;
    currentAir = air.current;
    currentForecast = weather.hourly;
    currentAirForecast = air.hourly;

    renderDashboard();
    showDashboard();

    setText(
      elements.searchStatus,
      `Showing available data for ${city.name}.`
    );
  } catch (error) {
    if (thisRequest !== requestNumber) return;

    console.error("Dashboard request failed:", error);

    showError(
      "Unable to load environmental data",
      "Check your connection and retry. If the problem continues, the data service may be temporarily unavailable."
    );
  } finally {
    if (thisRequest === requestNumber) {
      elements.searchButton.disabled = false;
      elements.cityInput.disabled = false;
      elements.searchButton.textContent = "Explore city ↗";
    }
  }
}

// --------------------------------------------
// 3. Render the dashboard
// --------------------------------------------

function renderDashboard() {
  const city = currentCity;
  const weather = currentWeather;
  const air = currentAir;

  setText(
    elements.currentCity,
    [city.name, city.country].filter(Boolean).join(", ")
  );

  setText(
    elements.locationMeta,
    `${city.latitude.toFixed(2)}°, ${city.longitude.toFixed(2)}°`
  );

  setText(
    elements.temperature,
    weather.temperature_2m == null
      ? "--"
      : `${formatNumber(weather.temperature_2m)} °C`
  );

  setText(
    elements.humidity,
    weather.relative_humidity_2m == null
      ? "--"
      : `${formatNumber(weather.relative_humidity_2m, 0)}%`
  );

  setText(
    elements.wind,
    weather.wind_speed_10m == null
      ? "--"
      : `${formatNumber(weather.wind_speed_10m)} km/h`
  );

  setText(
    elements.pm25,
    air.pm2_5 == null
      ? "--"
      : formatNumber(air.pm2_5)
  );

  setText(
    elements.pm10,
    air.pm10 == null
      ? "--"
      : formatNumber(air.pm10)
  );

  setText(
    elements.aqiValue,
    air.us_aqi == null ? "--" : formatNumber(air.us_aqi, 0)
  );

  const aqiInfo = getAqiInfo(air.us_aqi);

  setText(elements.aqiCategory, aqiInfo.category);
  setText(elements.aqiDescription, aqiInfo.description);

  if (typeof air.us_aqi === "number") {
    const clampedAqi = Math.max(0, Math.min(500, air.us_aqi));
    const rotation = -35 + (clampedAqi / 500) * 270;

    $(".aqi-ring").style.transform = `rotate(${rotation}deg)`;
  }

  renderInsight();
  updateFavoriteButton();
  drawTrendChart();
  renderComparison();
}

function renderInsight() {
  const aqi = currentAir.us_aqi;
  const temperature = currentWeather.temperature_2m;

  if (typeof aqi === "number") {
    const info = getAqiInfo(aqi);

    setText(elements.insightTitle, `${info.category} air quality`);

    setText(
      elements.insightText,
      `The available US AQI estimate for ${currentCity.name} is ${Math.round(aqi)}. ${info.description}`
    );
  } else if (typeof temperature === "number") {
    setText(elements.insightTitle, "Weather data is available");

    setText(
      elements.insightText,
      `The reported temperature is ${formatNumber(temperature)} °C. Air-quality data is currently unavailable.`
    );
  } else {
    setText(elements.insightTitle, "Partial data available");
    setText(
      elements.insightText,
      "Some environmental variables could not be retrieved."
    );
  }
}

// --------------------------------------------
// 4. Retry a failed request
// --------------------------------------------

elements.retryButton.addEventListener("click", () => {
  if (!currentCity) {
    searchCityByName(lastSearchCity);
    return;
  }

  loadCity(currentCity);
});

async function searchCityByName(name) {
  elements.cityInput.value = name;

  const url = new URL(API.geocoding);

  url.search = new URLSearchParams({
    name,
    count: "1",
    language: "en",
    format: "json"
  });

  try {
    setLoading(true);

    const data = await fetchJSON(url);

    if (!data.results || data.results.length === 0) {
      throw new Error("City not found.");
    }

    const city = data.results[0];

    await loadCity({
      name: city.name,
      country: city.country || "",
      admin1: city.admin1 || "",
      latitude: city.latitude,
      longitude: city.longitude,
      timezone: city.timezone || "auto"
    });
  } catch (error) {
    console.error("Retry failed:", error);

    showError(
      "Retry unsuccessful",
      "We couldn't retrieve the city's data. Please try again."
    );

    elements.searchButton.disabled = false;
    elements.cityInput.disabled = false;
    elements.searchButton.textContent = "Explore city ↗";
  }
}

// --------------------------------------------
// 5. Trend selector and chart
// Draw the chart using Canvas, without libraries.
// --------------------------------------------

elements.trendFilter.addEventListener("change", drawTrendChart);

function drawTrendChart() {
  const canvas = elements.chart;
  const context = canvas.getContext("2d");
  const indicator = elements.trendFilter.value;
  const option = TREND_OPTIONS[indicator];

  const forecast = option.source === "weather"
    ? currentForecast
    : currentAirForecast;

  const values = forecast?.[indicator];
  const times = forecast?.time;

  if (
    !Array.isArray(values) ||
    !Array.isArray(times) ||
    !values.some((value) => typeof value === "number")
  ) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    elements.chartEmpty.hidden = false;
    setText(elements.chartLabel, `${option.label} · unavailable`);
    return;
  }

  elements.chartEmpty.hidden = true;
  setText(
    elements.chartLabel,
    `${option.label} · hourly forecast (${option.unit})`
  );

  const rect = canvas.getBoundingClientRect();
  const width = Math.max(280, rect.width);
  const height = Math.max(160, rect.height);
  const pixelRatio = window.devicePixelRatio || 1;

  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);

  const points = values
    .map((value, index) => ({
      value,
      time: times[index]
    }))
    .filter((point) => typeof point.value === "number")
    .slice(0, 24);

  if (points.length === 0) {
    elements.chartEmpty.hidden = false;
    return;
  }

  const padding = {
    left: 42,
    right: 14,
    top: 18,
    bottom: 30
  };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const minValue = Math.min(...points.map((point) => point.value));
  const maxValue = Math.max(...points.map((point) => point.value));

  const spread = maxValue - minValue;
  const margin = spread === 0 ? Math.max(1, Math.abs(maxValue) * 0.1) : spread * 0.15;

  const lower = Math.max(0, minValue - margin);
  const upper = maxValue + margin || 1;
  const range = upper - lower || 1;

  context.font = "10px Segoe UI, sans-serif";
  context.textBaseline = "middle";

  // Grid and y-axis labels
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartHeight * i) / 4;
    const value = upper - (range * i) / 4;

    context.beginPath();
    context.strokeStyle = "#243349";
    context.lineWidth = 1;
    context.moveTo(padding.left, y);
    context.lineTo(width - padding.right, y);
    context.stroke();

    context.fillStyle = "#91a2b8";
    context.textAlign = "right";
    context.fillText(
      formatNumber(value, 0),
      padding.left - 9,
      y
    );
  }

  const coordinates = points.map((point, index) => ({
    x: padding.left +
      (points.length === 1 ? 0 : (index / (points.length - 1)) * chartWidth),
    y: padding.top +
      ((upper - point.value) / range) * chartHeight
  }));

  // Line
  context.beginPath();

  coordinates.forEach((point, index) => {
    if (index === 0) {
      context.moveTo(point.x, point.y);
    } else {
      context.lineTo(point.x, point.y);
    }
  });

  context.strokeStyle = "#63e6be";
  context.lineWidth = 2.5;
  context.lineJoin = "round";
  context.stroke();

  // Area under the line
  const gradient = context.createLinearGradient(
    0,
    padding.top,
    0,
    height - padding.bottom
  );

  gradient.addColorStop(0, "rgba(99, 230, 190, 0.18)");
  gradient.addColorStop(1, "rgba(99, 230, 190, 0)");

  context.lineTo(
    coordinates[coordinates.length - 1].x,
    height - padding.bottom
  );

  context.lineTo(padding.left, height - padding.bottom);
  context.closePath();
  context.fillStyle = gradient;
  context.fill();

  // Time labels
  context.fillStyle = "#91a2b8";
  context.textAlign = "center";

  const labelCount = Math.min(6, points.length);

  for (let i = 0; i < labelCount; i++) {
    const index = labelCount === 1
      ? 0
      : Math.round((i / (labelCount - 1)) * (points.length - 1));

    const time = points[index].time;
    const label = time.includes("T")
      ? time.split("T")[1].slice(0, 5)
      : time;

    context.fillText(
      label,
      coordinates[index].x,
      height - 10
    );
  }
}

// Redraw the chart when the browser changes size.
window.addEventListener("resize", drawTrendChart);

// --------------------------------------------
// 6. Save favourite cities
// --------------------------------------------

elements.favoriteButton.addEventListener("click", () => {
  if (!currentCity) return;

  let favorites = getFavorites();

  const alreadySaved = isFavorite(currentCity);

  if (alreadySaved) {
    favorites = favorites.filter(
      (item) =>
        item.latitude !== currentCity.latitude ||
        item.longitude !== currentCity.longitude
    );
  } else {
    favorites.push({
      name: currentCity.name,
      country: currentCity.country,
      latitude: currentCity.latitude,
      longitude: currentCity.longitude,
      timezone: currentCity.timezone
    });
  }

  if (!saveFavorites(favorites)) {
    setText(
      elements.comparisonStatus,
      "Unable to save favourites in this browser."
    );
    return;
  }

  updateFavoriteButton();
  renderComparison();
});

function updateFavoriteButton() {
  if (!currentCity) {
    elements.favoriteButton.disabled = true;
    return;
  }

  elements.favoriteButton.disabled = false;

  const saved = isFavorite(currentCity);

  elements.favoriteButton.setAttribute(
    "aria-pressed",
    String(saved)
  );

  setText(
    elements.favoriteButton,
    saved ? "★ Saved" : "☆ Save city"
  );
}

// --------------------------------------------
// 7. City comparison and AQI filtering
// --------------------------------------------

elements.aqiFilter.addEventListener("change", renderComparison);

async function renderComparison() {
  const favorites = getFavorites();
  const filter = elements.aqiFilter.value;

  elements.comparisonList.replaceChildren();

  if (favorites.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";

    const symbol = document.createElement("span");
    symbol.textContent = "⇄";

    const title = document.createElement("h3");
    title.textContent = "Your city comparison starts here.";

    const description = document.createElement("p");
    description.textContent =
      "Search for a city and save it to build your comparison list.";

    empty.append(symbol, title, description);
    elements.comparisonList.append(empty);

    setText(elements.comparisonStatus, "No saved cities yet.");
    return;
  }

  setText(
    elements.comparisonStatus,
    `Loading AQI for ${favorites.length} saved city/cities...`
  );

  const results = await Promise.all(
    favorites.map(async (city) => {
      try {
        const url = new URL(API.air);

        url.search = new URLSearchParams({
          latitude: String(city.latitude),
          longitude: String(city.longitude),
          current: "us_aqi",
          timezone: city.timezone || "auto"
        });

        const data = await fetchJSON(url);

        return {
          ...city,
          aqi: data.current?.us_aqi ?? null
        };
      } catch (error) {
        console.error(`Comparison failed for ${city.name}:`, error);

        return {
          ...city,
          aqi: null
        };
      }
    })
  );

  const filtered = results.filter((city) => {
    if (filter === "all") return true;

    if (typeof city.aqi !== "number") return false;

    if (filter === "good") return city.aqi <= 50;
    if (filter === "moderate") return city.aqi > 50 && city.aqi <= 100;
    if (filter === "sensitive") return city.aqi > 100 && city.aqi <= 150;
    if (filter === "poor") return city.aqi > 150 && city.aqi <= 200;
    if (filter === "very-poor") return city.aqi > 200 && city.aqi <= 300;
    if (filter === "hazardous") return city.aqi > 300;

    return true;
  });

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";

    const title = document.createElement("h3");
    title.textContent = "No cities match this filter.";

    const description = document.createElement("p");
    description.textContent =
      "Choose another AQI category or select All levels.";

    empty.append(title, description);
    elements.comparisonList.append(empty);

    setText(elements.comparisonStatus, "No matching saved cities.");
    return;
  }

  filtered.forEach((city) => {
    const row = document.createElement("div");
    row.className = "comparison-row";

    const identity = document.createElement("div");

    const name = document.createElement("strong");
    name.textContent = city.name;

    const country = document.createElement("small");
    country.textContent = city.country || "Location";

    identity.append(name, country);

    const aqi = document.createElement("div");
    aqi.className = "comparison-aqi";
    aqi.textContent = typeof city.aqi === "number"
      ? String(Math.round(city.aqi))
      : "--";

    const barCell = document.createElement("div");
    barCell.className = "comparison-bar-cell";

    const category = document.createElement("small");
    category.textContent = getAqiInfo(city.aqi).category;

    const track = document.createElement("div");
    track.className = "aqi-bar-track";

    const bar = document.createElement("div");
    bar.className = "aqi-bar";
    bar.style.width = typeof city.aqi === "number"
      ? `${Math.max(0, Math.min(100, city.aqi / 5))}%`
      : "0%";

    track.append(bar);
    barCell.append(category, track);

    const actions = document.createElement("div");
    actions.className = "comparison-actions";

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "remove-city-button";
    openButton.textContent = "Explore";

    openButton.addEventListener("click", () => loadCity(city));

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-city-button";
    removeButton.textContent = "Remove";

    removeButton.addEventListener("click", () => {
      const updated = getFavorites().filter(
        (item) =>
          item.latitude !== city.latitude ||
          item.longitude !== city.longitude
      );

      if (!saveFavorites(updated)) {
        setText(
          elements.comparisonStatus,
          "Unable to update saved cities."
        );
        return;
      }

      updateFavoriteButton();
      renderComparison();
    });

    actions.append(openButton, removeButton);
    row.append(identity, aqi, barCell, actions);

    elements.comparisonList.append(row);
  });

  setText(
    elements.comparisonStatus,
    `Showing ${filtered.length} of ${results.length} saved cities. AQI uses the US scale.`
  );
}

// --------------------------------------------
// 8. Sidebar navigation
// --------------------------------------------

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach((item) => {
      item.classList.remove("active");
    });

    link.classList.add("active");
  });
});

// --------------------------------------------
// 9. Start the application
// --------------------------------------------

searchCityByName("Pune");
