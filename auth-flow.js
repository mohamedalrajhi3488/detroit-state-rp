function shouldRedirectToInvite({
  requireGuildMembership = false,
  targetGuildId,
  discordInviteCode,
  isMember = false
}) {
  if (!requireGuildMembership || !targetGuildId || isMember) return false
  return Boolean(discordInviteCode)
}

module.exports = { shouldRedirectToInvite }
