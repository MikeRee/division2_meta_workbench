# Division 2 Meta Workbench

This is a React-based web application designed for Division 2 game build planning and gear management. The application provides players with tools to construct optimal gear builds using comprehensive game data.

## Project Purpose

This project was built primarily to practice using AI coding agents and to test out the features and functionality of OpenHands. It serves as a demonstration of how AI agents can be used to develop, understand, and enhance complex web applications.

## Key Features

- **Data Loading**: Loads game data from multiple sources including JSON files, Google Sheets API, and CSV files
- **Data Processing**: Parses and normalizes data from various sources into structured models
- **Build Management**: Provides components for constructing and managing gear builds
- **Real-time Integration**: Can connect to live Google Sheets for up-to-date game information

## Technical Stack

- **Frontend**: React with TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand
- **Data Sources**: JSON files, Google Sheets API, CSV files
- **Dependencies**: React, React DOM, React Icons

## Usage

The application can be run locally using:
```bash
npm install
npm run dev
```

## Data Sources

The application supports loading data from:
1. Local JSON files in the `/data/` directory
2. Google Sheets using the Google Sheets API
3. CSV files containing various game attributes and stats

## Development Focus

This project demonstrates the capabilities of AI coding agents in:
- Understanding complex codebases
- Implementing feature enhancements
- Testing new technologies and frameworks
- Building comprehensive web applications

The project structure shows it's designed as a complete frontend application that can work with both local data files and live Google Sheets data, making it useful for Division 2 players who want to optimize their builds using the most current game information.