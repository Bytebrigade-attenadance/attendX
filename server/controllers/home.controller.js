import prisma from "../db/db.config.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";

// const getUserInfo = async (req, res) => {
//   try {
//     const { token, role } = req.body;
//     if (role == "teacher") {
//       if (!token) {
//         throw new ApiError(400, "Invalid login");
//       }
//       const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
//       if (!decodedToken) {
//         throw new ApiError(400, "Wrong token provided");
//       }
//       const user = await prisma.user.findFirst({
//         where: { id: decodedToken.userId },
//         select: {
//           id: true,
//           name: true,
//           email: true,
//           department: true,
//           role: true,
//           gender: true,
//           teacher: true,
//         },
//       });
//       if (!user) {
//         throw new ApiError(404, "User not found");
//       }

//       const teacherClasses = await prisma.teacherClass.findMany({
//         where: {
//           teacher_id: decodedToken.userId,
//         },
//         include: {
//           class: true, // Include full class information
//           subject: true, // Include full subject information
//         },
//       });

//       // Group the results by class
//       const classMap = new Map();

//       for (const record of teacherClasses) {
//         const classId = record.class_id;

//         // If we haven't seen this class yet, initialize it in our map
//         if (!classMap.has(classId)) {
//           classMap.set(classId, {
//             classInfo: record.class,
//             subjects: [],
//           });
//         }

//         // Add this subject to the class's subjects array
//         classMap.get(classId).subjects.push(record.subject);
//       }

//       // Convert the map to the desired array format
//       const classesTaught = Array.from(classMap.values());

//       // Return the result
//       return res
//         .status(200)
//         .json(new ApiResponse(200, { user, classesTaught }, "Verified token"));
//     } else {
//     }
//   } catch (error) {
//     console.log(error.message);
//   }
// };

const getUserInfo = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      throw new ApiError(400, "Invalid login");
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    if (!decodedToken) {
      throw new ApiError(400, "Wrong token provided");
    }

    const user = await prisma.user.findFirst({
      where: { id: decodedToken.userId },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        role: true,
        gender: true,
        student: {
          include: {
            class: true,
          },
        },
        teacher: true,
      },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const role = user.role;

    if (role === "teacher") {
      const teacherClasses = await prisma.teacherClass.findMany({
        where: {
          teacher_id: decodedToken.userId,
        },
        include: {
          class: true,
          subject: true,
        },
      });

      const classMap = new Map();
      for (const record of teacherClasses) {
        const classId = record.class_id;
        if (!classMap.has(classId)) {
          classMap.set(classId, {
            classInfo: record.class,
            subjects: [],
          });
        }
        classMap.get(classId).subjects.push(record.subject);
      }
      const classesTaught = Array.from(classMap.values());
      return res
        .status(200)
        .json(new ApiResponse(200, { user, classesTaught }, "Verified token"));
    } else if (role === "student") {
      if (!token) {
        throw new ApiError(400, "Invalid login");
      }

      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      if (!decodedToken) {
        throw new ApiError(400, "Wrong token provided");
      }

      const user = await prisma.user.findFirst({
        where: { id: decodedToken.userId },
        select: {
          id: true,
          name: true,
          email: true,
          department: true,
          role: true,
          gender: true,
          student: {
            include: {
              class: true,
            },
          },
        },
      });

      if (!user || !user.student) {
        throw new ApiError(404, "Student not found");
      }

      const studentId = user.id;
      const classId = user.student.class_id;

      // Fetch all attendance records for this class
      const attendanceRecords = await prisma.attendance.findMany({
        where: {
          class_id: classId,
        },
        include: {
          subject: true,
          teacher: {
            include: {
              user: true,
            },
          },
        },
      });

      // Aggregate attendance summary
      const attendanceSummaryMap = new Map();

      for (const record of attendanceRecords) {
        const subjectId = record.subject_id;
        const subjectKey = `${subjectId}`;

        if (!attendanceSummaryMap.has(subjectKey)) {
          attendanceSummaryMap.set(subjectKey, {
            subjectName: record.subject.name,
            subjectCode: record.subject.code,
            professorName: record.teacher.user.name,
            totalClasses: 0,
            presentCount: 0,
            absentCount: 0,
          });
        }

        const studentRecords = record.student_records || {};
        const studentInfo = studentRecords[studentId];

        // Count only if the student is part of the record
        if (studentInfo && studentInfo.status) {
          const summary = attendanceSummaryMap.get(subjectKey);
          summary.totalClasses += 1;
          if (studentInfo.status === "present") {
            summary.presentCount += 1;
          } else {
            summary.absentCount += 1;
          }
        }
      }

      const attendanceSummary = Array.from(attendanceSummaryMap.values());

      return res.status(200).json(
        new ApiResponse(
          200,
          {
            user: {
              id: user.id,
              name: user.name,
              regNo: user.student.reg_no,
              class: user.student.class,
            },
            attendanceSummary,
          },
          "Verified student token"
        )
      );
    }
  } catch (error) {
    console.log(error.message);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

export { getUserInfo };
