// Import Express
import express from "express";
import scrape from "./scrape.js";

// Initialize the app
const app = express();

// Set up a basic route
app.get("/", scrape);

// Define the port where the server will listen
const port = 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
