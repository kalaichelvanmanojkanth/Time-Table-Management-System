const express = require("express");
const {
  createClassroom,
  getClassrooms,
  getClassroomById,
  updateClassroom,
  deleteClassroom,
  chatClassroomAssistant,
} = require("../controllers/classroomController");

const router = express.Router();

router.route("/").post(createClassroom).get(getClassrooms);
router.post("/ai/chat", chatClassroomAssistant);
router.route("/:id").get(getClassroomById).put(updateClassroom).delete(deleteClassroom);

module.exports = router;
