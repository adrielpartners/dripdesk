import { prisma } from '@dripdesk/database';

export async function cleanupExpiredTokens() {
  const now = new Date();

  const [deletedReset, deletedUnsub, deletedInvites] = await Promise.all([
    prisma.passwordResetToken.deleteMany({
      where: { expiresAt: { lte: now } },
    }),
    prisma.unsubscribeToken.deleteMany({
      where: { expiresAt: { lte: now } },
    }),
    prisma.inviteToken.deleteMany({
      where: { expiresAt: { lte: now } },
    }),
  ]);

  return {
    deletedPasswordResetTokens: deletedReset.count,
    deletedUnsubscribeTokens: deletedUnsub.count,
    deletedInviteTokens: deletedInvites.count,
  };
}
