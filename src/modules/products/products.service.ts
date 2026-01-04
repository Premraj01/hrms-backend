import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    try {
      const product = await this.prisma.product.create({
        data: createProductDto,
      });

      this.logger.log(`Product created: ${product.name} (${product.id})`);
      return product;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Product with this name or code already exists');
      }
      throw error;
    }
  }

  async findAll(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };

    return this.prisma.product.findMany({
      where,
      include: {
        _count: {
          select: { projects: true },
        },
        projects: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        projects: {
          include: {
            _count: {
              select: { members: true },
            },
          },
        },
        _count: {
          select: { projects: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: updateProductDto,
      });

      this.logger.log(`Product updated: ${product.name} (${product.id})`);
      return product;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }
      if (error.code === 'P2002') {
        throw new ConflictException('Product with this name or code already exists');
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      const product = await this.prisma.product.delete({
        where: { id },
      });

      this.logger.log(`Product deleted: ${product.name} (${product.id})`);
      return { message: 'Product deleted successfully' };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }
      if (error.code === 'P2003') {
        throw new ConflictException('Cannot delete product with associated projects');
      }
      throw error;
    }
  }

  async deactivate(id: string) {
    return this.update(id, { isActive: false });
  }

  async activate(id: string) {
    return this.update(id, { isActive: true });
  }
}

