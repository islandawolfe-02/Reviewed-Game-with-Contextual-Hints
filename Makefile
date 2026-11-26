# W3.10 / P3 lab commands. Run from this lab directory (learner/units/w03-software-design-and-ai/labs/w3-10).
# Windows without make: python lab.py test --candidate project/game   (see README.md)
CANDIDATE ?= starter
MODE ?= success
PYTHON ?= python3

.PHONY: test serve demo

# Compile the candidate, then run only the supplied named adapter checks (29).
test:
	$(PYTHON) lab.py test --candidate $(CANDIDATE)

# Compile and serve the candidate on http://127.0.0.1:4310 with a deterministic local MODE.
serve:
	$(PYTHON) lab.py serve --candidate $(CANDIDATE) --mode $(MODE)

# Plain-JavaScript demonstration (no build) on http://127.0.0.1:4310.
demo:
	$(PYTHON) lab.py demo --mode $(MODE)
