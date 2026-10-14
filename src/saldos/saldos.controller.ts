import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { SaldoAsignacionService } from './saldo-asignacion.service';
import { SaldoClientId } from './saldo-asignacion.types';

@Controller('api/saldos')
export class SaldosController {
  constructor(private readonly saldos: SaldoAsignacionService) {}

  @Get()
  list() {
    return this.saldos.getAllStatus();
  }

  @Post('start')
  startAll() {
    return this.saldos.startAll();
  }

  @Post('stop')
  stopAll() {
    return this.saldos.stopAll();
  }

  @Post(':id/start')
  startOne(@Param('id') id: string) {
    return this.saldos.start(this.parseId(id));
  }

  @Post(':id/stop')
  stopOne(@Param('id') id: string) {
    return this.saldos.stop(this.parseId(id));
  }

  private parseId(id: string): SaldoClientId {
    if (id !== 'cliente33' && id !== 'cliente34') {
      throw new NotFoundException(`Cliente no encontrado: ${id}`);
    }
    return id;
  }
}
