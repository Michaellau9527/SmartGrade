import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  UseFilters,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { buildUploadOptions } from '@/common/security/upload';
import { UploadExceptionFilter } from '@/common/security/upload.exception-filter';

@ApiTags('文件上传')
@ApiBearerAuth()
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('single')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '单文件上传' })
  @UseInterceptors(FileInterceptor('file', buildUploadOptions()))
  @UseFilters(new UploadExceptionFilter())
  async uploadSingle(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('请选择文件');
    }
    return this.uploadService.uploadSingle(file);
  }

  @Post('multiple')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '多文件上传' })
  @UseInterceptors(FilesInterceptor('files', 10, buildUploadOptions()))
  @UseFilters(new UploadExceptionFilter())
  async uploadMultiple(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('请选择文件');
    }
    return this.uploadService.uploadMultiple(files);
  }
}
