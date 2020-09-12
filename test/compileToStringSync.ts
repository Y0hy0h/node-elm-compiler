import * as chai from "chai";
import * as path from "path";

import * as compiler from "../src";

var expect = chai.expect;

var fixturesDir = path.join(__dirname, "fixtures");

function prependFixturesDir(filename) {
  return path.join(fixturesDir, filename);
}

describe("#compileToStringSync", function () {
  it('returns string JS output of the given elm file', function () {
    const opts = { verbose: true, cwd: fixturesDir } as any;
    const result = compiler.compileToStringSync(prependFixturesDir("Parent.elm"), opts);

    expect(result).to.include("_Platform_export");
  });

  it('returns html output given "html" output option', function () {
    const opts = {
      verbose: true,
      cwd: fixturesDir,
      output: prependFixturesDir('compiled.html'),
    } as any;
    const result = compiler.compileToStringSync(prependFixturesDir("Parent.elm"), opts);

    expect(result).to.include('<!DOCTYPE HTML>');
    expect(result).to.include('<title>Parent</title>');
    expect(result).to.include("_Platform_export");
  });
});
