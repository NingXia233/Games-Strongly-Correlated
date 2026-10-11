# Implementation notes

## Model contract

`initialState(id)` accepts zero-based room IDs 0–7. It returns `{id, data, steps, feedback}`. `reduce(state, action)` produces a cloned next state; the input is unchanged. Refused moves preserve the apparatus and the operation counter while returning plain-language feedback. `evaluate(state)` computes the winning predicate and quantitative measurements independently of the UI.

SSH uses an 8×8 real symmetric Jacobi diagonalization. Every candidate seven-bond pattern is computed, including nonalternating experiments; winning additionally requires the specified alternating three-strong/four-weak apparatus.

`initialSave()`, `validateState()`, `validateSave()` and `parseSave()` are independent of DOM/storage. Save version 1 includes eight states, eight hint counts, sequential completed rooms, current room and intro status. Validation includes conserved hole ordering and the reachable Z₂ flux sector. Completion records persist through free experimentation, so a previously completed room need not currently be a winning configuration.

## UI controls

The delegated visual renderer is driven entirely by model state. Choosing an atom followed by a destination represents a hop; choosing two MPS sites swaps their representation positions. Dragging MPS sites is optional. The flux tool is explicitly armed before choosing one edge, separating it from gauge vertices. The model permits it only once in round 2. `check` verifies exact predicates; it does not supply a hidden solution.

Undo keeps up to 60 successful apparatus snapshots in memory for the current room; switching rooms clears this transient history. Each action is autosaved; localStorage failures produce a visible backup warning. Export is a user-triggered JSON download. Import validates the entire file before replacing any state. No import strings are inserted into HTML.

## Publication

Serve `dist/` with static hosting. `.openai/hosting.json` holds the owning Sites identity and static directory; credentials are never committed. The original development task handles Sites publication and the separately requested GitHub synchronization.
