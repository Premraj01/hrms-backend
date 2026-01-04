import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto';
import { RequirePermissions, CurrentUser, CurrentUserData } from '../../common/decorators';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @RequirePermissions('products.create')
  create(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  @RequirePermissions('products.read')
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.productsService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  @RequirePermissions('products.read')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('products.update')
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @RequirePermissions('products.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.productsService.remove(id);
  }

  @Patch(':id/deactivate')
  @RequirePermissions('products.update')
  deactivate(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.productsService.deactivate(id);
  }

  @Patch(':id/activate')
  @RequirePermissions('products.update')
  activate(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.productsService.activate(id);
  }
}

