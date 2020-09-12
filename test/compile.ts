import * as chai from "chai";
import * as path from "path";
import * as childProcess from "child_process";
import * as _ from "lodash";
import * as temp from "temp";

import * as compiler from "../src"

const expect = chai.expect;

const fixturesDir = path.join(__dirname, "fixtures");

function prependFixturesDir(filename: string) {
  return path.join(fixturesDir, filename);
}

describe("#compile", function () {
  // Use a timeout of 5 minutes because Travis on Linux can be SUPER slow.
  this.timeout(300000);

  it("reports errors on bad source", function (done) {
    const opts = {
      verbose: true,
      cwd: fixturesDir
    };
    const compileProcess = compiler.compile(prependFixturesDir("Bad.elm"), opts);

    compileProcess.on("exit", function (exitCode: number) {
      const desc = "Expected elm make to have exit code 1";
      expect(exitCode, desc).to.equal(1);
      done();
    });
  });

  it("throws when given an unrecognized argument", function () {
    const opts = {
      foo: "bar",
      output: "/dev/null",
      verbose: true,
      cwd: fixturesDir
    };

    expect(function () {
      const compileProcess = compiler.compile(prependFixturesDir("Parent.elm"), opts);

    }).to.throw();
  });
});

describe("#compileToString", function () {
  // Use an epic timeout because Travis on Linux can be SUPER slow.
  this.timeout(600000);

  it("adds runtime options as arguments", function () {
    const opts = {
      verbose: true,
      cwd: fixturesDir,
      runtimeOptions: ["-A128M", "-H128M", "-n8m"]
    } as any;

    return expect(compiler
      ._prepareProcessArgs("a.elm", opts)
      .join(" ")).to.equal("make a.elm +RTS -A128M -H128M -n8m -RTS");
  });

  it("reports errors on bad syntax", function () {
    const opts = {
      verbose: true,
      cwd: fixturesDir
    };
    const compilePromise = compiler.compileToString(prependFixturesDir("Bad.elm"), opts);

    return compilePromise.catch(function (err: Error) {
      expect(err).to.be.an('error');
      expect(String(err))
        .to.contain("Compilation failed")
        .and.contain("PARSE ERROR");
    });
  });

  it("reports type errors", function () {
    const opts = {
      verbose: true,
      cwd: fixturesDir
    };
    const compilePromise = compiler.compileToString(prependFixturesDir("TypeError.elm"), opts);

    return compilePromise.catch(function (err: Error) {
      expect(err).to.be.an('error');
      expect(String(err))
        .to.contain("Compilation failed")
        .and.contain("TYPE MISMATCH");
    });
  });

  it("Rejects the Promise when given an unrecognized argument like `yes`", function () {
    const opts = {
      foo: "bar",
      verbose: true,
      cwd: fixturesDir
    };

    const compilePromise = compiler.compileToString(prependFixturesDir("Parent.elm"), opts);

    return new Promise(function (resolve, reject) {
      return compilePromise.then(function () {
        reject("Expected the compilation promise to be rejected due to the unrecognized compiler argument.");
      }).catch(function () {
        resolve();
      });
    });
  });


  it("works when run multiple times", function () {
    const opts = {
      verbose: true,
      cwd: fixturesDir
    };

    const runCompile = function () {
      const compilePromise = compiler.compileToString(prependFixturesDir("Parent.elm"), opts)

      return compilePromise.then(function (result: string) {
        const desc = "Expected elm make to return the result of the compilation";
        expect(result.toString(), desc).to.be.a('string');
      });
    };

    // Compiling in parallel leads to issues with the cache. Therefore we chain
    // the compilations instead. For details, see https://github.com/elm/compiler/issues/1853.
    // This issue is tracked as https://github.com/rtfeldman/node-elm-compiler/issues/86.
    let promiseChain = Promise.resolve();
    for (let i = 0; i < 10; i++) {
      promiseChain = promiseChain.then(() => runCompile());
    }
    return promiseChain;
  });

  it("handles output suffix correctly", function () {
    const opts = {
      verbose: true,
      cwd: fixturesDir,
      output: prependFixturesDir("compiled.html"),
    };

    return compiler.compileToString(prependFixturesDir("Parent.elm"), opts)
      .then(function (result: string) {
        const desc = "Expected elm make to return the result of the compilation";
        expect(result.toString(), desc).to.be.a('string');
      });
  });
});

describe("#compileWorker", function () {
  // Use a timeout of 5 minutes because Travis on Linux can be SUPER slow.
  this.timeout(300000);

  it("works with BasicWorker.elm", function () {
    const opts = {
      verbose: true,
      cwd: fixturesDir
    };
    const compilePromise = compiler.compileWorker(
      prependFixturesDir(""),
      prependFixturesDir("BasicWorker.elm"),
      "BasicWorker",
      {}
    );

    return compilePromise.then(function (app: any) {
      app.ports.reportFromWorker.subscribe(function (str: string) {
        expect(str).to.equal("it's alive!");
      });
    })
  });
});
