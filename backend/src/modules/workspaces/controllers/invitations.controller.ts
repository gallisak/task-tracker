import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse, ApiTags } from '@nestjs/swagger';
import {
  type AuthenticatedUser,
  CurrentUser,
} from '../../../common/decorators/current-user.decorator.js';
import { AcceptInvitationDto } from '../dto/accept-invitation.dto.js';
import { AcceptedInvitationResponseDto } from '../dto/accepted-invitation-response.dto.js';
import { WorkspaceMembersService } from '../services/workspace-members.service.js';

@ApiTags('workspace members')
@ApiBearerAuth()
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly members: WorkspaceMembersService) {}

  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @ApiNotFoundResponse({ description: 'Invitation not found or expired' })
  async accept(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AcceptInvitationDto,
  ): Promise<AcceptedInvitationResponseDto> {
    return AcceptedInvitationResponseDto.from(
      await this.members.acceptInvitation(user, dto.token),
    );
  }
}
