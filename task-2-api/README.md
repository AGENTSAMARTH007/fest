# EcoPulse — Environmental Intelligence Dashboard

EcoPulse is a responsive environmental dashboard that helps users explore weather conditions and air quality for cities around the world.

## Features

- Search for cities and select locations from search results.
- Display current weather information, including temperature, humidity, and wind speed.
- Display air-quality indicators, including US AQI, PM2.5, and PM10.
- Explore air-quality and temperature trends through an interactive chart.
- Save favorite cities and compare their air-quality data.
- Filter cities by air-quality category.
- Responsive layout for desktop and mobile screens.
- Loading states and error handling for API requests.

## Technologies Used

- HTML5
- CSS3
- JavaScript (Vanilla JS)
- Open-Meteo Geocoding API
- Open-Meteo Weather Forecast API
- Open-Meteo Air Quality API
- HTML Canvas for data visualization
- LocalStorage for saved favorite cities

## APIs

- Geocoding: https://geocoding-api.open-meteo.com/v1/search
- Weather: https://api.open-meteo.com/v1/forecast
- Air Quality: https://air-quality-api.open-meteo.com/v1/air-quality

## How to Run Locally

1. Clone or download the repository.
2. Open the project folder in Visual Studio Code.
3. Open `index.html` using the Live Server extension.
4. Search for a city and explore its weather and air-quality information.

An internet connection is required to retrieve API data.

## Data Notes

Air-quality and weather information is provided by Open-Meteo APIs. The air-quality indicators use the US AQI scale, and the displayed values may be forecast/model estimates rather than direct readings from a local monitoring station.

## Project Structure

```text
task-2-api/
├── index.html
├── README.md
├── css/
│   └── style.css
└── js/
    └── script.js
```

## Testing

The following features have been tested in the browser:

- City search and selection
- Interactive chart indicators
- Saving favorite cities
- AQI category filtering
- Responsive layout

## Future Improvements

- Add historical air-quality trends.
- Improve accessibility and keyboard navigation.
- Add more detailed environmental insights.
- Display data-source attribution and timestamps more prominently.
