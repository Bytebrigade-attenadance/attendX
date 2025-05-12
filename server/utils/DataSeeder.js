import {
  Department,
  Gender,
  Role,
  AttendanceStatus,
  Semester,
} from "../generated/prisma/index.js";

import prisma from "../db/db.config.js";

async function seedMinimalData() {
  console.log("🌱 Starting minimal database seeding for testing...");

  try {
    // Clear existing data
    await prisma.attendance.deleteMany();
    await prisma.teacherClass.deleteMany();
    await prisma.classSubject.deleteMany();
    await prisma.student.deleteMany();
    await prisma.teacher.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.class.deleteMany();
    await prisma.user.deleteMany();

    // 1. Create one subject
    const subject = await prisma.subject.create({
      data: {
        code: "CS101",
        name: "Introduction to Computer Science",
      },
    });

    // 2. Create two classes
    const class1 = await prisma.class.create({
      data: {
        code: "CSE-1",
        branch: Department.CSE,
        semester: Semester.I,
      },
    });

    const class2 = await prisma.class.create({
      data: {
        code: "CSE-2",
        branch: Department.CSE,
        semester: Semester.I,
      },
    });

    // 3. Connect subject to class1 only (for attendance)
    await prisma.classSubject.create({
      data: {
        class_id: class1.id,
        subject_id: subject.id,
      },
    });

    // 4. Create admin user
    const admin = await prisma.user.create({
      data: {
        name: "Admin User",
        email: "admin@test.com",
        department: Department.CSE,
        role: Role.admin,
        gender: Gender.other,
      },
    });

    // 5. Create teacher and link
    const teacherUser = await prisma.user.create({
      data: {
        name: "Test Teacher",
        email: "teacher@test.com",
        department: Department.CSE,
        role: Role.teacher,
        gender: Gender.male,
      },
    });

    const teacher = await prisma.teacher.create({
      data: {
        id: teacherUser.id,
        teacher_id_no: "T001",
      },
    });

    await prisma.teacherClass.create({
      data: {
        teacher_id: teacher.id,
        class_id: class1.id,
        subject_id: subject.id,
      },
    });

    // 6. Create students
    const students = [];

    for (let i = 1; i <= 3; i++) {
      const studentUser = await prisma.user.create({
        data: {
          name: `Student ${i}`,
          email: `student${i}@test.com`,
          department: Department.CSE,
          role: Role.student,
          gender: i % 2 === 0 ? Gender.female : Gender.male,
        },
      });

      const assignedClass = i === 2 ? class2 : class1; // Student 2 → class2; rest → class1

      const student = await prisma.student.create({
        data: {
          id: studentUser.id,
          class_id: assignedClass.id,
          year: 1,
          reg_no: `CSE${1000 + i}`,
        },
      });

      students.push({
        ...student,
        user: studentUser,
        class_id: assignedClass.id,
      });
    }

    // 7. Create attendance only for class1 students
    const today = new Date();
    const class1StudentRecords = students
      .filter((s) => s.class_id === class1.id)
      .map((student, index) => ({
        student_id: student.id,
        status:
          index === 0 ? AttendanceStatus.absent : AttendanceStatus.present,
      }));

    const attendance = await prisma.attendance.create({
      data: {
        class_id: class1.id,
        subject_id: subject.id,
        teacher_id: teacher.id,
        date: today,
        session_start: new Date(today.setHours(9, 0, 0)),
        session_end: new Date(today.setHours(10, 0, 0)),
        student_records: class1StudentRecords,
      },
    });

    // Return created data
    return {
      admin,
      teacher: { ...teacher, user: teacherUser },
      classes: [class1, class2],
      subject,
      students,
      attendance,
    };
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    throw error;
  }
}

// Run the seeder
seedMinimalData()
  .then((data) => {
    console.log("✅ Database seeding completed successfully!");
    console.log(`- Admin: ${data.admin.email}`);
    console.log(
      `- Teacher: ${data.teacher.user.name} (${data.teacher.teacher_id_no})`
    );
    console.log(`- Class 1: ${data.classes[0].code}`);
    console.log(`- Class 2: ${data.classes[1].code}`);
    console.log(`- Subject: ${data.subject.name} (${data.subject.code})`);
    console.log(`- Students: ${data.students.length}`);
    console.log(`- Attendance Records: 1`);
  })
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
