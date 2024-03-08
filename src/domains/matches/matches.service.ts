import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, User } from '@prisma/client';
import { nanoid } from 'nanoid';
import { PrismaService } from 'src/database/prisma/prisma.service';
<<<<<<< Updated upstream
import { UpdateMatchDto } from './matches.dto';
import {
  INVALID_APPLICATION,
  INVALID_GENDER,
  INVALID_MATCH,
  MAX_PARTICIPANTS_REACHED,
  MIN_PARTICIPANTS_REACHED,
  PROFILE_NEEDED,
  UNAUTHORIZED,
} from './matches-error.messages';
=======
import dayUtil from 'src/utils/day';
import { INVALID_MATCH, UNAUTHORIZED } from './matches-error.messages';
import { FindMatchesDto, UpdateMatchDto } from './matches.dto';
>>>>>>> Stashed changes

@Injectable()
export class MatchesService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}

<<<<<<< Updated upstream
  async findMatches() {
    return await this.prismaService.match.findMany();
=======
  async findMatches(filters: FindMatchesDto) {
    const todayUTC = dayUtil.day().utc();
    const endDateUTC = todayUTC.add(2, 'weeks');

    let where: Prisma.MatchWhereInput = {
      matchDay: {
        gte: todayUTC.toDate(),
        lte: endDateUTC.toDate(),
      },
    };

    console.log(todayUTC.toDate());
    console.log(endDateUTC.toDate());

    // if (filters.date) {
    //   const parsedDate = dayUtil.day(filters.date).toDate();
    //   console.log(parsedDate);

    //   const kstMatchDay = dayUtil.day(parsedDate).toISOString();
    //   console.log(kstMatchDay);
    //   // const date = dayUtil.day(filters.date).format();
    //   // console.log(today.format());
    //   // console.log(date);
    //   where.matchDay = kstMatchDay;
    // }

    // if (filters.region) {
    //   where.matchDay < endDateUTC;
    //   where.placeName = filters.region;
    // }

    if (filters.sportType) {
      where = {
        ...where,
        sportsType: {
          name: filters.sportType,
        },
      };
    }

    return this.prismaService.match.findMany({
      where: {
        sportsType: {
          name: filters.sportType,
        },
      },
    });
>>>>>>> Stashed changes
  }

  async findMatch(matchId: string) {
    return this.prismaService.match.findUnique({
      where: {
        id: matchId,
      },
    });
  }

  async createMatch(
    user: User,
    data: Omit<Prisma.MatchUncheckedCreateInput, 'id' | 'hostId'>,
  ) {
    const id = nanoid(this.configService.get('NANOID_SIZE'));
    await this.prismaService.match.create({
      data: {
        ...data,
        id,
        hostId: user.id,
        participants: {
          connect: {
            id: user.id,
          },
        },
      },
    });

    return await this.prismaService.match.findUnique({
      where: { id: id },
      include: { participants: true },
    });
  }

  async editMatch(userId: string, matchId: string, data: UpdateMatchDto) {
    return await this.prismaService.match.update({
      where: { id: matchId },
      data,
    });
  }

  async deleteMatch(userId: string, matchId: string) {
    return await this.prismaService.match.delete({
      where: {
        id: matchId,
      },
    });
  }

  async participate(matchId: string, userId: string) {
    const match = await this.prismaService.match.findUnique({
      where: { id: matchId },
      include: {
        participants: true,
      },
    });

    const isParticipating = match.participants.some(
      (participant) => participant.id === userId,
    );

    if (isParticipating) {
      if (match.participants.length / match.capability >= 0.8) {
        throw new ConflictException(MIN_PARTICIPANTS_REACHED);
      }
      return await this.prismaService.match.update({
        where: { id: matchId },
        include: {
          participants: {
            select: {
              id: true,
            },
          },
        },
        data: {
          participants: {
            disconnect: {
              id: userId,
            },
          },
        },
      });
    }

    const user = await this.prismaService.userProfile.findUnique({
      where: { userId: userId },
    });

    if (!user) {
      throw new UnauthorizedException(PROFILE_NEEDED);
    }

    if (match.hostId === user.userId) {
      throw new UnauthorizedException(INVALID_APPLICATION);
    }

    if (match.participants.length >= match.capability) {
      throw new ConflictException(MAX_PARTICIPANTS_REACHED);
    }

    if (match.gender !== 'both' && match.gender !== user.gender) {
      throw new UnauthorizedException(INVALID_GENDER);
    }

    const newParticipant = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    return await this.prismaService.match.update({
      where: { id: matchId },
      include: {
        participants: {
          select: {
            id: true,
          },
        },
      },
      data: {
        participants: {
          connect: {
            id: newParticipant.id,
          },
        },
      },
    });
  }

  async ratePlayer(
    matchId: string,
    graderId: string,
    data: Omit<
      Prisma.RatingUncheckedCreateInput,
      'id' | 'raterId' | 'sportsTypeId' | 'matchId'
    >,
  ) {
    const match = await this.prismaService.match.findUnique({
      where: { id: matchId },
      include: {
        participants: true,
      },
    });

    const id = nanoid(this.configService.get('NANOID_SIZE'));
    return await this.prismaService.rating.create({
      data: {
        id: id,
        userId: data.userId,
        raterId: graderId,
        sportsTypeId: match.sportsTypeId,
        matchId: matchId,
        ...data,
      },
    });
  }
}
