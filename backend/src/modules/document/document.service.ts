import { Injectable } from '@nestjs/common';

@Injectable()
export class DocumentService {
  async findAll(query: any) {
    return [];
  }

  async findOne(id: number) {
    return {};
  }

  async getReads(id: number) {
    return [];
  }

  async create(body: any, user: any) {
    return {};
  }

  async update(id: number, body: any) {
    return {};
  }

  async remove(id: number) {
    return { success: true };
  }

  async download(id: number) {
    return {};
  }

  async confirm(id: number, user: any) {
    return { success: true };
  }
}