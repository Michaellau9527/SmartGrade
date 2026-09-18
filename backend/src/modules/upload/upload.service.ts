import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { isAllowedUploadType } from '@/common/security/upload';

@Injectable()
export class UploadService {
  private uploadDir: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = this.configService.get('UPLOAD_DIR', './uploads');
    this.ensureUploadDir();
  }

  private ensureUploadDir() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadSingle(file: Express.Multer.File) {
    // 写入前再校验一次类型（纵深防御，不信任 multer 拦截层）
    if (!isAllowedUploadType(file.originalname, file.mimetype)) {
      throw new BadRequestException('不支持的文件类型，仅允许图片/PDF/Office/表格/文本类文件');
    }
    // 规范化扩展名为小写，避免路径/大小写绕过
    const ext = path.extname(file.originalname).toLowerCase();
    const fileName = `${uuidv4()}${ext}`;
    const filePath = path.join(this.uploadDir, fileName);

    await fs.promises.writeFile(filePath, file.buffer);

    return {
      url: `/uploads/${fileName}`,
      filename: fileName,
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  async uploadMultiple(files: Express.Multer.File[]) {
    const results = await Promise.all(
      files.map((file) => this.uploadSingle(file))
    );
    return results;
  }
}