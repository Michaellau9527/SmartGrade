import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

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
    const fileName = `${uuidv4()}${path.extname(file.originalname)}`;
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