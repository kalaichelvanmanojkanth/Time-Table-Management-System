const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

const classroomRoutes = require("./routes/classroomRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, message: "Service is healthy" });
});

app.use("/api/classrooms", classroomRoutes);

if (process.env.NODE_ENV === "production") {
  const clientDistPath = path.join(__dirname, "..", "client", "dist");
  app.use(express.static(clientDistPath));

  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
}

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use((error, req, res, next) => {
  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: Object.values(error.errors).map((err) => err.message),
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "A classroom with the same roomName and building already exists",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
});

module.exports = app;
