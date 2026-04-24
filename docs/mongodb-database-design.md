# MongoDB Database Design for University Timetable Management System

This design keeps transactional timetable data normalized while allowing selective denormalization for fast reads in dashboards and weekly timetable views.

## Design Principles

- Use separate collections for core academic entities.
- Store references with `ObjectId` for cross-module relationships.
- Denormalize small, frequently-read labels such as course code, lecturer name, and room name inside timetable entries for schedule rendering.
- Use compound indexes for timetable conflict detection and search.
- Keep audit fields (`createdAt`, `updatedAt`) on every collection.

## Core Collections

### 1. users
Used for authentication and role-based access.

```js
{
  _id: ObjectId,
  fullName: String,
  email: String,
  passwordHash: String,
  role: String, // admin, lecturer, student
  isActive: Boolean,
  lastLoginAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:
- `{ email: 1 }` unique
- `{ role: 1, isActive: 1 }`

### 2. faculties
Top-level academic structure.

```js
{
  _id: ObjectId,
  name: String,
  code: String,
  deanName: String,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:
- `{ code: 1 }` unique

### 3. departments
Belong to a faculty.

```js
{
  _id: ObjectId,
  facultyId: ObjectId,
  name: String,
  code: String,
  officeLocation: String,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:
- `{ facultyId: 1, code: 1 }` unique
- `{ facultyId: 1, name: 1 }`

### 4. programs
Degree programs offered by departments.

```js
{
  _id: ObjectId,
  departmentId: ObjectId,
  name: String,
  code: String,
  degreeLevel: String, // undergraduate, postgraduate
  durationYears: Number,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:
- `{ departmentId: 1, code: 1 }` unique

### 5. academicTerms
Tracks semesters, years, and scheduling windows.

```js
{
  _id: ObjectId,
  name: String,
  academicYear: String,
  semester: String, // semester-1, semester-2, summer
  startDate: Date,
  endDate: Date,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:
- `{ academicYear: 1, semester: 1 }` unique
- `{ isActive: 1 }`

### 6. lecturers
Profile data for teaching staff.

```js
{
  _id: ObjectId,
  userId: ObjectId,
  departmentId: ObjectId,
  employeeId: String,
  title: String,
  specialization: [String],
  maxWeeklyHours: Number,
  availabilityPreferences: [
    {
      dayOfWeek: String,
      startTime: String,
      endTime: String
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:
- `{ employeeId: 1 }` unique
- `{ departmentId: 1 }`

### 7. students
Profile data for enrolled students.

```js
{
  _id: ObjectId,
  userId: ObjectId,
  programId: ObjectId,
  registrationNumber: String,
  intakeYear: Number,
  currentLevel: Number,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:
- `{ registrationNumber: 1 }` unique
- `{ programId: 1, currentLevel: 1 }`

### 8. courses
Course catalog shared across terms.

```js
{
  _id: ObjectId,
  departmentId: ObjectId,
  programIds: [ObjectId],
  code: String,
  title: String,
  creditHours: Number,
  level: Number,
  semester: String,
  lectureHoursPerWeek: Number,
  labHoursPerWeek: Number,
  requiresLab: Boolean,
  preferredResources: [String],
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:
- `{ code: 1 }` unique
- `{ departmentId: 1, level: 1, semester: 1 }`
- `{ requiresLab: 1 }`

### 9. courseOfferings
Term-specific course delivery setup.

```js
{
  _id: ObjectId,
  courseId: ObjectId,
  academicTermId: ObjectId,
  lecturerIds: [ObjectId],
  targetProgramIds: [ObjectId],
  targetLevels: [Number],
  expectedEnrollment: Number,
  sectionCode: String,
  deliveryMode: String, // physical, online, hybrid
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:
- `{ academicTermId: 1, courseId: 1, sectionCode: 1 }` unique
- `{ lecturerIds: 1 }`

### 10. classrooms
Used by the Classroom & Resource Management module.

```js
{
  _id: ObjectId,
  roomName: String,
  building: String,
  capacity: Number,
  type: String, // classroom, lab
  resources: [String],
  status: String, // available, maintenance
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:
- `{ roomName: 1, building: 1 }` unique
- `{ building: 1, type: 1, status: 1, capacity: 1 }`

### 11. timeSlots
Reusable scheduling slots.

```js
{
  _id: ObjectId,
  dayOfWeek: String, // monday ... sunday
  startTime: String, // 08:00
  endTime: String,   // 10:00
  slotType: String,  // lecture, lab, exam
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:
- `{ dayOfWeek: 1, startTime: 1, endTime: 1 }` unique

### 12. timetableEntries
The main schedule collection. This is the most query-heavy collection.

```js
{
  _id: ObjectId,
  academicTermId: ObjectId,
  courseOfferingId: ObjectId,
  courseId: ObjectId,
  lecturerId: ObjectId,
  classroomId: ObjectId,
  timeSlotId: ObjectId,
  programId: ObjectId,
  studentGroup: String,
  deliveryMode: String,
  recurrencePattern: String, // weekly, odd-weeks, even-weeks
  startDate: Date,
  endDate: Date,

  // denormalized read model fields
  courseCode: String,
  courseTitle: String,
  lecturerName: String,
  roomName: String,
  building: String,
  dayOfWeek: String,
  startTime: String,
  endTime: String,

  status: String, // draft, published, cancelled
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:
- `{ academicTermId: 1, classroomId: 1, dayOfWeek: 1, startTime: 1 }`
- `{ academicTermId: 1, lecturerId: 1, dayOfWeek: 1, startTime: 1 }`
- `{ academicTermId: 1, programId: 1, studentGroup: 1, dayOfWeek: 1, startTime: 1 }`
- `{ academicTermId: 1, courseOfferingId: 1 }`
- `{ status: 1, academicTermId: 1 }`

Conflict checks should query timetable entries by term plus lecturer, classroom, or program cohort on the same day and overlapping time window.

### 13. enrollments
Maps students to active course offerings.

```js
{
  _id: ObjectId,
  studentId: ObjectId,
  academicTermId: ObjectId,
  courseOfferingId: ObjectId,
  enrollmentStatus: String, // enrolled, dropped, completed
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:
- `{ studentId: 1, academicTermId: 1, courseOfferingId: 1 }` unique
- `{ academicTermId: 1, courseOfferingId: 1 }`

### 14. resourceBookings
Optional collection when equipment is shared independently of a room.

```js
{
  _id: ObjectId,
  academicTermId: ObjectId,
  timetableEntryId: ObjectId,
  resourceName: String,
  quantity: Number,
  bookedBy: ObjectId,
  status: String, // reserved, issued, returned
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:
- `{ academicTermId: 1, timetableEntryId: 1 }`
- `{ resourceName: 1, status: 1 }`

## Relationship Map

- `faculty -> departments -> programs`
- `departments -> courses`
- `courses + academicTerms -> courseOfferings`
- `courseOfferings + timeSlots + classrooms + lecturers -> timetableEntries`
- `students + courseOfferings -> enrollments`
- `timetableEntries -> resourceBookings`

## Modeling Notes

### Reference vs embed
Use references for anything updated independently or shared across multiple modules:
- departments
- programs
- lecturers
- classrooms
- courses
- academic terms

Use embedded subdocuments only for small bounded lists:
- lecturer availability preferences
- course preferred resources
- classroom resources

### Conflict detection strategy
For scheduling conflicts, query `timetableEntries` with:
- same `academicTermId`
- same `classroomId` or `lecturerId` or `programId + studentGroup`
- same `dayOfWeek`
- overlapping `startTime/endTime`
- `status` not cancelled

### Availability tracking
Real-time classroom availability should be computed from:
- classroom `status` must be `available`
- no active timetable entry should overlap the requested term/day/time
- optional resource booking rules can be checked for scarce equipment

### Capacity planning
When placing a course offering into a classroom:
- `classroom.capacity >= courseOffering.expectedEnrollment`
- if `course.requiresLab`, then `classroom.type` should be `lab`
- if `course.preferredResources` is not empty, the classroom should contain those resources

## Recommended API Modules

- `/api/auth`
- `/api/faculties`
- `/api/departments`
- `/api/programs`
- `/api/lecturers`
- `/api/students`
- `/api/courses`
- `/api/course-offerings`
- `/api/classrooms`
- `/api/time-slots`
- `/api/timetable`
- `/api/enrollments`
- `/api/resource-bookings`

## Suggested Timetable Entry Validation Rules

- course offering must belong to the selected term
- lecturer must exist and be active
- classroom must exist and not be under maintenance
- classroom capacity must satisfy expected enrollment
- lab-only courses must not be placed in standard classrooms
- no lecturer, classroom, or student cohort conflict for the same time window

## When to denormalize
Denormalize labels in `timetableEntries` for fast timetable screens, but keep foreign keys for authoritative joins and data integrity. If a lecturer name or room name changes, update timetable entries with a background job or event-driven sync.
