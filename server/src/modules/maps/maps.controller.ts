import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Query,
    Res,
    UploadedFile,
    UseInterceptors,
    HttpCode,
    HttpStatus,
    BadRequestException,
    StreamableFile
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiBody,
    ApiOperation,
    ApiTags,
    ApiParam,
    ApiConsumes,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiConflictResponse,
    ApiBadRequestResponse,
    ApiForbiddenResponse,
    ApiNoContentResponse
} from '@nestjs/swagger';
import { ApiOkPaginatedResponse, PaginatedResponseDto } from '../../@common/dto/paginated-response.dto';
import { MapsService } from './maps.service';
import { CreateMapDto, MapDto } from '../../@common/dto/map/map.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { MapsGetAllQuery, MapsGetQuery } from '../../@common/dto/query/map-queries.dto';
import { Roles } from '../../@common/decorators/roles.decorator';
import { Roles as RolesEnum } from '../../@common/enums/user.enum';
import { LoggedInUser } from '../../@common/decorators/logged-in-user.decorator';

@ApiBearerAuth()
@Controller('api/v1/maps')
@ApiTags('Maps')
export class MapsController {
    constructor(private readonly mapsService: MapsService) {}

    //#region Map

    @Get()
    @ApiOperation({ summary: 'Returns all maps' })
    @ApiOkPaginatedResponse(MapDto, { description: 'Paginated list of maps' })
    getAllMaps(
        @LoggedInUser('id') userID: number,
        @Query() query?: MapsGetAllQuery
    ): Promise<PaginatedResponseDto<MapDto>> {
        return this.mapsService.getAll(
            userID,
            query.skip,
            query.take,
            query.expand,
            query.search,
            query.submitterID,
            query.type,
            query.difficultyLow,
            query.difficultyHigh,
            query.isLinear
        );
    }

    @Post()
    @HttpCode(HttpStatus.NO_CONTENT)
    @Roles(RolesEnum.MAPPER)
    @ApiOperation({ summary: 'Creates a single map' })
    @ApiOkResponse({ type: MapDto, description: 'The newly created map' })
    @ApiForbiddenResponse({ description: 'User does not have the Mapper role' })
    @ApiBadRequestResponse({ description: 'Map object is invalid' })
    @ApiConflictResponse({ description: 'Map already exists' })
    @ApiConflictResponse({ description: 'Submitter has reached pending map limit' })
    @ApiBody({
        type: CreateMapDto,
        description: 'The create map data transfer object',
        required: true
    })
    async createMap(
        @Res({ passthrough: true }) res,
        @Body() body: CreateMapDto,
        @LoggedInUser('id') userID: number
    ): Promise<void> {
        const id = await this.mapsService.create(body, userID);

        MapsController.setMapUploadLocationHeader(res, id);
    }

    @Get('/:mapID')
    @ApiOperation({ summary: 'Returns a single map' })
    @ApiParam({
        name: 'mapID',
        type: Number,
        description: 'Target Map ID',
        required: true
    })
    @ApiOkResponse({ description: 'The found map' })
    @ApiNotFoundResponse({ description: 'Map was not found' })
    getMap(
        @LoggedInUser('id') userID: number,
        @Param('mapID', ParseIntPipe) mapID: number,
        @Query() query?: MapsGetQuery
    ): Promise<MapDto> {
        return this.mapsService.get(mapID, userID, query.expand);
    }

    @Post('/:mapID/upload')
    @ApiOperation({ summary: 'Uploads a single map' })
    @ApiParam({
        name: 'mapID',
        type: Number,
        description: 'Target Map ID',
        required: true
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary'
                }
            }
        }
    })
    @UseInterceptors(FileInterceptor('file'))
    uploadMap(@Param('mapID') mapID: number, @UploadedFile() mapFile: Express.Multer.File): Promise<MapDto> {
        // see https://stackoverflow.com/questions/66605192/file-uploading-along-with-other-data-in-swagger-nestjs
        // for swagger shit
        return this.mapsService.upload(+mapID, mapFile.buffer);
    }
    //#endregion

    //#region Private

    // Frontend reads this header property and sends upload POST to that endpoint
    private static setMapUploadLocationHeader(res, mapID): void {
        res.set('Location', `api/v1/maps/${mapID}/upload`);
    }

    //#endregion
}
