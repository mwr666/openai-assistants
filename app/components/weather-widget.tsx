import React from "react";
import styles from "./weather-widget.module.css";

const WeatherWidget = ({
  location = "---",
  temperature = "---",
  conditions = "Sunny",
  isEmpty = false,
  sendMessage,
}: {
  location?: string;
  temperature?: string;
  conditions?: string;
  isEmpty?: boolean;
  sendMessage: (message: string) => void;
}) => {
  // Remove the conditionClassMap

  if (isEmpty) {
    return (
      <div className={`${styles.weatherWidget} ${styles.weatherEmptyState}`}>
        <div className={styles.weatherWidgetData}>
          <h1>Who Covers It?</h1>
          <p>Identify journalists, bloggers, and publications to pitch your story</p>
          <br />
          <button onClick={() => sendMessage("Who covers AI at TechCrunch")}>
            Who covers AI at TechCrunch
          </button>
          <button onClick={() => sendMessage("What does Kara Swisher cover?")}>
            What does Kara Swisher cover?
          </button>
        </div>
      </div>
    );
  }

  const weatherClass = `${styles.weatherWidget}`;

  return (
    <div className={weatherClass}>
      <div className={styles.weatherWidgetData}>
        <p>{location}</p>
        <h2>{temperature !== "---" ? `${temperature}°F` : temperature}</h2>
        <p>{conditions}</p>
      </div>
    </div>
  );
};

export default WeatherWidget;