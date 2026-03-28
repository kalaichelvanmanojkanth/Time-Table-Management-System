const mongoose = require("mongoose");

const classroomSchema = new mongoose.Schema(
  {
    roomName: {
      type: String,
      required: [true, "roomName is required"],
      trim: true,
      maxlength: [100, "roomName cannot exceed 100 characters"],
    },
    building: {
      type: String,
      required: [true, "building is required"],
      trim: true,
      maxlength: [100, "building cannot exceed 100 characters"],
    },
    capacity: {
      type: Number,
      required: [true, "capacity is required"],
      min: [1, "capacity must be at least 1"],
    },
    type: {
      type: String,
      enum: {
        values: ["classroom", "lab"],
        message: "type must be either classroom or lab",
      },
      required: [true, "type is required"],
      lowercase: true,
      trim: true,
    },
    resources: {
      type: [String],
      default: [],
      set: (value) => {
        if (!Array.isArray(value)) {
          return [];
        }

        // Normalize and de-duplicate resource names.
        const normalized = value
          .map((item) => String(item).trim().toLowerCase())
          .filter(Boolean);

        return [...new Set(normalized)];
      },
    },
    status: {
      type: String,
      enum: {
        values: ["available", "maintenance"],
        message: "status must be either available or maintenance",
      },
      default: "available",
      lowercase: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

classroomSchema.index({ roomName: 1, building: 1 }, { unique: true });
classroomSchema.index({ building: 1, type: 1, status: 1, capacity: 1 });

module.exports = mongoose.model("Classroom", classroomSchema);
