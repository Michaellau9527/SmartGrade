import { Injectable } from '@nestjs/common';

@Injectable()
export class IncidentService {
  async findAll(query: any) {
    return [];
  }

  async findOne(id: number) {
    return {};
  }

  async create(body: any, user: any) {
    return {};
  }

  async handle(id: number, body: any, user: any) {
    return {};
  }

  async close(id: number, user: any) {
    return {};
  }
}