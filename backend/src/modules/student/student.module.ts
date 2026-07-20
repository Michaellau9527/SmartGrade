import { Module } from '@nestjs/common';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { StudentSnapshotService } from './student-snapshot.service';

@Module({
  controllers: [StudentController],
  providers: [StudentService, StudentSnapshotService],
  exports: [StudentService, StudentSnapshotService],
})
export class StudentModule {}
