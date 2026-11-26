"""W3.10 / P3 lab runner (the Makefile calls this; Windows users without make can call it directly).

  python3 lab.py test  [--candidate starter|project/game]   compile, then run ONLY the supplied named checks
  python3 lab.py serve [--candidate ...] [--mode success|validation|timeout|malformed|provider-failure|irrelevant]
  python3 lab.py demo  [--mode ...]                          plain-JavaScript demonstration (no build)

On Windows use `python` or `py -3` instead of `python3`.
"""
import argparse, os, shutil, subprocess, sys

LAB = os.path.dirname(os.path.abspath(__file__))
SUPPLIED_TESTS = ["tests/evaluation.test.mjs", "tests/signals.test.mjs"]  # the 29 fixed adapter checks
MODES = ["success", "validation", "timeout", "malformed", "provider-failure", "irrelevant"]


def find_tsc(candidate):
    for base in (candidate, LAB):
        local = os.path.join(base, "node_modules", "typescript", "bin", "tsc")
        if os.path.exists(local):
            return ["node", local]
    found = shutil.which("tsc")
    return [found] if found else None


def build(candidate):
    if not os.path.exists(os.path.join(candidate, "tsconfig.json")):
        sys.exit(f"no tsconfig.json in {candidate}: did you copy the starter there? (cp -R starter project/game)")
    tsc = find_tsc(candidate)
    if tsc is None:
        print("TypeScript 5.9.3 not found; installing the pinned dev dependency with npm ci ...", flush=True)
        npm = shutil.which("npm") or "npm"
        subprocess.run([npm, "ci", "--no-audit", "--no-fund"], cwd=candidate, check=True)
        tsc = find_tsc(candidate)
    print("$ tsc -p tsconfig.json   (in " + os.path.relpath(candidate, LAB) + ")", flush=True)
    result = subprocess.run(tsc + ["-p", "tsconfig.json"], cwd=candidate)
    if result.returncode:
        sys.exit(result.returncode)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["test", "serve", "demo"])
    parser.add_argument("--candidate", default="starter")
    parser.add_argument("--mode", default="success", choices=MODES)
    parser.add_argument("--port", default="4310")
    args = parser.parse_args()
    if args.command == "demo":
        return subprocess.call(["node", os.path.join(LAB, "demo", "supplied", "server.mjs"), "--mode", args.mode, "--port", args.port])
    candidate = os.path.join(LAB, args.candidate)
    build(candidate)
    if args.command == "test":
        print("$ node --test " + " ".join(SUPPLIED_TESTS), flush=True)
        code = subprocess.call(["node", "--test"] + SUPPLIED_TESTS, cwd=candidate)
        print("PASS supplied adapter checks" if code == 0 else f"FAIL supplied adapter checks (exit {code})")
        return code
    try:
        return subprocess.call(["node", "dist/server.js", "--mode", args.mode, "--port", args.port], cwd=candidate)
    except KeyboardInterrupt:
        return 0


if __name__ == "__main__":
    sys.exit(main())
