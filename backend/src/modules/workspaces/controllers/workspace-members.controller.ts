import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  type AuthenticatedUser,
  CurrentUser,
} from '../../../common/decorators/current-user.decorator.js';
import { InvitationResponseDto } from '../dto/invitation-response.dto.js';
import { InviteMemberDto } from '../dto/invite-member.dto.js';
import { MemberResponseDto } from '../dto/member-response.dto.js';
import { UpdateMemberRoleDto } from '../dto/update-member-role.dto.js';
import { WorkspaceMembersService } from '../services/workspace-members.service.js';

@ApiTags('workspace members')
@ApiBearerAuth()
@ApiNotFoundResponse({ description: 'Workspace or member not found' })
@Controller('workspaces/:workspaceId')
export class WorkspaceMembersController {
  constructor(private readonly members: WorkspaceMembersService) {}

  @Get('members')
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
  ): Promise<MemberResponseDto[]> {
    const members = await this.members.findAll(workspaceId, user.id);
    return members.map((member) => MemberResponseDto.from(member));
  }

  @Patch('members/:userId')
  @ApiForbiddenResponse({ description: 'Only owners can change members' })
  @ApiConflictResponse({ description: 'Workspace must keep one owner' })
  async updateRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ): Promise<MemberResponseDto> {
    return MemberResponseDto.from(
      await this.members.updateRole(workspaceId, user.id, userId, dto.role),
    );
  }

  @Delete('members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiForbiddenResponse({ description: 'Only owners can change members' })
  @ApiConflictResponse({ description: 'Workspace must keep one owner' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    await this.members.remove(workspaceId, user.id, userId);
  }

  @Post('invitations')
  @ApiForbiddenResponse({ description: 'Only owners can invite' })
  @ApiConflictResponse({ description: 'Already a member or already invited' })
  async invite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body() dto: InviteMemberDto,
  ): Promise<InvitationResponseDto> {
    return InvitationResponseDto.from(
      await this.members.invite(workspaceId, user.id, dto),
    );
  }

  @Get('invitations')
  @ApiForbiddenResponse({ description: 'Only owners can see invitations' })
  async findInvitations(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
  ): Promise<InvitationResponseDto[]> {
    const invitations = await this.members.findInvitations(
      workspaceId,
      user.id,
    );
    return invitations.map((invitation) =>
      InvitationResponseDto.from(invitation),
    );
  }
}
