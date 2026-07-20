import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  async findAll() {
    return [];
  }

  async update(body: any) {
    return {};
  }

  async getRoles() {
    return [];
  }

  async createRole(body: any) {
    return {};
  }

  async updateRole(id: number, body: any) {
    return {};
  }

  async removeRole(id: number) {
    return { success: true };
  }

  async getTags() {
    return [];
  }

  async createTag(body: any) {
    return {};
  }

  async updateTag(id: number, body: any) {
    return {};
  }

  async removeTag(id: number) {
    return { success: true };
  }
}