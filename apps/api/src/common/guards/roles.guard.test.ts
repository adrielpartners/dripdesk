import assert from 'assert';
import { RolesGuard } from './roles.guard';

function createContext(userRole: string | undefined, membershipRole: string | undefined) {
  return {
    getHandler: () => 'handler',
    getClass: () => 'class',
    switchToHttp: () => ({
      getRequest: () => ({
        user: userRole ? { role: userRole } : undefined,
        tenant: membershipRole ? { membershipRole } : undefined,
      }),
    }),
  } as never;
}

const reflector = {
  getAllAndOverride: () => ['owner', 'admin'],
};

const guard = new RolesGuard(reflector as never);

assert.equal(guard.canActivate(createContext('recipient', 'owner')), true);
assert.equal(guard.canActivate(createContext('admin', undefined)), true);
assert.equal(guard.canActivate(createContext('recipient', undefined)), false);

const openGuard = new RolesGuard({ getAllAndOverride: () => undefined } as never);
assert.equal(openGuard.canActivate(createContext(undefined, undefined)), true);

console.log('roles-guard tests passed');
