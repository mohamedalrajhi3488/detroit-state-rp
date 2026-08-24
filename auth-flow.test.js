const test = require('node:test');
const assert = require('node:assert/strict');

const { shouldRedirectToInvite } = require('./auth-flow');

test('login is not blocked when guild membership is not required', () => {
  assert.equal(
    shouldRedirectToInvite({
      targetGuildId: '123',
      botToken: 'token',
      discordInviteCode: 'abc',
      isMember: false,
      requireGuildMembership: false
    }),
    false
  );
});

test('login can still be blocked only when the app explicitly requires guild membership', () => {
  assert.equal(
    shouldRedirectToInvite({
      targetGuildId: '123',
      botToken: 'token',
      discordInviteCode: 'abc',
      isMember: false,
      requireGuildMembership: true
    }),
    true
  );
});
