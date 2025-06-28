const pkg = require('../package.json');

describe('package.json sanity checks', () => {
  it('has a name field', () => {
    expect(pkg.name).toBeDefined();
  });

  it('has a valid semver version', () => {
    expect(pkg.version).toMatch(/^[0-9]+\.[0-9]+\.[0-9]+(?:-.+)?$/);
  });
});
