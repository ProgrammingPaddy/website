import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Map, Prisma } from '@prisma/client';

@Injectable()
export class MapsRepoService {
    constructor(private prisma: PrismaService) {}

    /**
     * @summary Inserts to database
     * @returns New db record ID
     */
    async Insert(newMap: Prisma.MapCreateInput): Promise<Map> {
        const result = await this.prisma.map.create({
            data: newMap
        });

        return result;
    }

    async Update(mapId: number, updateArgs: Partial<Map>): Promise<Map> {
        const result = await this.prisma.map.update({
            where: {
                id: mapId != null ? +mapId : undefined
            },
            data: updateArgs
        });

        return result;
    }

    /**
     * @summary Gets all from database
     * @returns All maps
     */
    async GetAll(where?: Prisma.MapWhereInput, skip?: number, take?: number): Promise<[Map[], number]> {
        const count = await this.prisma.map.count({
            where: where
        });
        const maps = await this.prisma.map.findMany({
            where: where,
            skip: skip != null ? +skip : undefined,
            take: take != null ? +take : undefined,
            include: {
                images: true
            }
        });
        return [maps, count];
    }

    /**
     * @summary Gets single from database
     * @returns Single maps
     */
    async Get(id: number): Promise<Map> {
        const where: Prisma.MapWhereUniqueInput = {};
        where.id = id != null ? +id : undefined;

        return await this.prisma.map.findFirst({
            where: where,
            include: {
                images: true
            }
        });
    }

    async UpdateCredit(where: Prisma.MapCreditWhereInput, input: Prisma.MapCreditUpdateInput) {
        this.prisma.mapCredit.updateMany({ where: where, data: input });
    }
}