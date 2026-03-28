const mongoose = require("mongoose");
const Classroom = require("../models/Classroom");

const parseInteger = (value) => {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const buildListFilter = (query) => {
  const filter = {};

  if (query.building) {
    filter.building = { $regex: query.building, $options: "i" };
  }

  if (query.type) {
    filter.type = query.type.toLowerCase();
  }

  if (query.status) {
    filter.status = query.status.toLowerCase();
  }

  const minCapacity = parseInteger(query.minCapacity);
  const maxCapacity = parseInteger(query.maxCapacity);

  if (minCapacity !== undefined || maxCapacity !== undefined) {
    filter.capacity = {};

    if (minCapacity !== undefined) {
      filter.capacity.$gte = minCapacity;
    }

    if (maxCapacity !== undefined) {
      filter.capacity.$lte = maxCapacity;
    }
  }

  if (query.resource) {
    filter.resources = { $in: [query.resource.toLowerCase()] };
  }

  if (query.availableOnly === "true") {
    filter.status = "available";
  }

  return filter;
};

const createClassroom = async (req, res, next) => {
  try {
    const classroom = await Classroom.create(req.body);
    return res.status(201).json({ success: true, data: classroom });
  } catch (error) {
    return next(error);
  }
};

const getClassrooms = async (req, res, next) => {
  try {
    const filter = buildListFilter(req.query);

    const page = Math.max(parseInteger(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInteger(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Classroom.find(filter).sort({ building: 1, roomName: 1 }).skip(skip).limit(limit),
      Classroom.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: items.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: items,
    });
  } catch (error) {
    return next(error);
  }
};

const getClassroomById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid classroom id" });
    }

    const classroom = await Classroom.findById(id);

    if (!classroom) {
      return res.status(404).json({ success: false, message: "Classroom not found" });
    }

    return res.status(200).json({ success: true, data: classroom });
  } catch (error) {
    return next(error);
  }
};

const updateClassroom = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid classroom id" });
    }

    const classroom = await Classroom.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!classroom) {
      return res.status(404).json({ success: false, message: "Classroom not found" });
    }

    return res.status(200).json({ success: true, data: classroom });
  } catch (error) {
    return next(error);
  }
};

const deleteClassroom = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid classroom id" });
    }

    const classroom = await Classroom.findByIdAndDelete(id);

    if (!classroom) {
      return res.status(404).json({ success: false, message: "Classroom not found" });
    }

    return res.status(200).json({ success: true, message: "Classroom deleted successfully" });
  } catch (error) {
    return next(error);
  }
};

const buildBotFallback = () => {
  return [
    "I can help with classroom inventory questions.",
    "Try asking:",
    "- How many rooms are available?",
    "- Show maintenance rooms",
    "- What is the largest classroom?",
    "- Which labs are available?",
    "- Find rooms with projector",
  ].join("\n");
};

const chatClassroomAssistant = async (req, res, next) => {
  try {
    const message = String(req.body?.message || "").trim();

    if (!message) {
      return res.status(400).json({ success: false, message: "message is required" });
    }

    const query = message.toLowerCase();

    if (/\b(hi|hello|hey)\b/.test(query)) {
      return res.status(200).json({
        success: true,
        data: {
          reply:
            "Hello! I am your Classroom Bot. Ask me about availability, labs, capacity, maintenance, or room resources.",
        },
      });
    }

    const [totalRooms, availableRooms, labRooms, maintenanceRooms] = await Promise.all([
      Classroom.countDocuments({}),
      Classroom.countDocuments({ status: "available" }),
      Classroom.countDocuments({ type: "lab" }),
      Classroom.find({ status: "maintenance" }).sort({ building: 1, roomName: 1 }).lean(),
    ]);

    if (/\b(summary|overview|stats?)\b/.test(query)) {
      return res.status(200).json({
        success: true,
        data: {
          reply: `Total rooms: ${totalRooms}. Available rooms: ${availableRooms}. Labs: ${labRooms}. Maintenance rooms: ${maintenanceRooms.length}.`,
        },
      });
    }

    if (/\b(available|free)\b/.test(query) && /\b(lab|labs)\b/.test(query)) {
      const availableLabs = await Classroom.find({ type: "lab", status: "available" })
        .sort({ capacity: -1 })
        .limit(8)
        .lean();

      const reply = availableLabs.length
        ? `Available labs (${availableLabs.length} shown): ${availableLabs
            .map((room) => `${room.roomName} (${room.building}, cap ${room.capacity})`)
            .join(", ")}`
        : "No available labs found right now.";

      return res.status(200).json({ success: true, data: { reply } });
    }

    if (/\b(maintenance|repair|out of service)\b/.test(query)) {
      const reply = maintenanceRooms.length
        ? `Rooms under maintenance: ${maintenanceRooms
            .slice(0, 10)
            .map((room) => `${room.roomName} (${room.building})`)
            .join(", ")}`
        : "Great news: there are no rooms under maintenance.";

      return res.status(200).json({ success: true, data: { reply } });
    }

    if (/\b(largest|biggest|max capacity)\b/.test(query)) {
      const largestRoom = await Classroom.findOne({ status: "available" })
        .sort({ capacity: -1 })
        .lean();

      const reply = largestRoom
        ? `Largest available room is ${largestRoom.roomName} in ${largestRoom.building} with capacity ${largestRoom.capacity}.`
        : "I could not find an available room to evaluate capacity.";

      return res.status(200).json({ success: true, data: { reply } });
    }

    const resourceMatch = query.match(/\b(projector|computer|computers|smart board|whiteboard)\b/);
    if (/\b(with|has|have|resource|resources)\b/.test(query) && resourceMatch) {
      const normalizedResource = resourceMatch[1] === "computers" ? "computers" : resourceMatch[1];
      const rooms = await Classroom.find({ resources: { $in: [normalizedResource] }, status: "available" })
        .sort({ capacity: -1 })
        .limit(10)
        .lean();

      const reply = rooms.length
        ? `Available rooms with ${normalizedResource}: ${rooms
            .map((room) => `${room.roomName} (${room.building}, cap ${room.capacity})`)
            .join(", ")}`
        : `No available rooms with ${normalizedResource} were found.`;

      return res.status(200).json({ success: true, data: { reply } });
    }

    const buildingMatch = query.match(/\b(?:in|at)\s+([a-z0-9\-\s]{3,40})/i);
    if (/\b(available|rooms|classrooms|labs)\b/.test(query) && buildingMatch) {
      const buildingText = buildingMatch[1].trim();
      const rooms = await Classroom.find({
        building: { $regex: buildingText, $options: "i" },
        status: "available",
      })
        .sort({ capacity: -1 })
        .limit(10)
        .lean();

      const reply = rooms.length
        ? `Available rooms in ${buildingText}: ${rooms
            .map((room) => `${room.roomName} (${room.type}, cap ${room.capacity})`)
            .join(", ")}`
        : `No available rooms found in ${buildingText}.`;

      return res.status(200).json({ success: true, data: { reply } });
    }

    return res.status(200).json({
      success: true,
      data: {
        reply: buildBotFallback(),
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createClassroom,
  getClassrooms,
  getClassroomById,
  updateClassroom,
  deleteClassroom,
  chatClassroomAssistant,
};
