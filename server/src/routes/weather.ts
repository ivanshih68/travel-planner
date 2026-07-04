import { Router } from "express";
import { getWeatherData } from "../lib/weather";

const router = Router();

router.get("/", async (req, res) => {
  const { destination, date } = req.query;

  if (!destination || !date) {
    return res.status(400).json({ error: "Missing destination or date" });
  }

  const weather = await getWeatherData(destination as string, date as string);
  
  if (!weather) {
    return res.status(404).json({ error: "Weather data not available for this date/location" });
  }

  res.json(weather);
});

export default router;
