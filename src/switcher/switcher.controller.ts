import { Controller, Get, Post } from '@nestjs/common';
import { SwitcherService } from './switcher.service';

@Controller('api/switcher')
export class SwitcherController {
  constructor(private readonly switcher: SwitcherService) {}

  @Get()
  status() {
    return this.switcher.getStatus();
  }

  @Post('start')
  start() {
    return this.switcher.start();
  }

  @Post('stop')
  stop() {
    return this.switcher.stop();
  }
}
