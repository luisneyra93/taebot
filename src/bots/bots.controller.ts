import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { BotId } from '../config/bots.config';
import { BotRunnerService } from './bot-runner.service';

@Controller('api/bots')
export class BotsController {
  constructor(private readonly runner: BotRunnerService) {}

  @Get()
  list() {
    return this.runner.getAllStatus();
  }

  @Get(':id')
  one(@Param('id') id: string) {
    return this.runner.getStatus(this.parseId(id));
  }

  @Post(':id/start')
  start(@Param('id') id: string) {
    return this.runner.start(this.parseId(id));
  }

  @Post(':id/stop')
  stop(@Param('id') id: string) {
    return this.runner.stop(this.parseId(id));
  }

  @Put(':id/rate')
  setRate(
    @Param('id') id: string,
    @Body() body: { ratePerMinute?: number },
  ) {
    if (body?.ratePerMinute == null) {
      throw new BadRequestException('ratePerMinute es requerido');
    }
    try {
      return this.runner.setRate(this.parseId(id), Number(body.ratePerMinute));
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private parseId(id: string): BotId {
    if (id !== 'bot1' && id !== 'bot2') {
      throw new NotFoundException(`Bot no encontrado: ${id}`);
    }
    return id;
  }
}
