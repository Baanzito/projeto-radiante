import { Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import { CsvDatasetDto, RestoreBackupDto } from './data-exports.dto';
import { DataExportsService } from './data-exports.service';

@Controller('exports')
export class DataExportsController {
  constructor(private readonly service: DataExportsService) {}
  @Get('json')
  @Header(
    'Content-Disposition',
    'attachment; filename="projeto-radiante-backup.json"',
  )
  backup() {
    return this.service.backup();
  }
  @Get('csv/:dataset')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="projeto-radiante.csv"')
  csv(@Param() params: CsvDatasetDto) {
    return this.service.csv(params.dataset);
  }
  @Post('restore')
  restore(@Body() input: RestoreBackupDto) {
    return this.service.restore(input.backup);
  }
}
