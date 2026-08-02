## Authorship and policy

- [ ] A human contributor opened and manages this pull request.
- [ ] Agent-assisted commits include `Assisted-by: Tool:Model`.
- [ ] This change follows `CONTRIBUTING.md` and `AGENTS.md`.

## Renderer boundary

- [ ] Fits the CPU-only Canvas2D renderer model.
- [ ] Does not add WebGL state, GPU buffers, shader programs, z-buffer behavior,
      PBR materials, environment maps, or shadow maps.
- [ ] Preserves public API shape unless the change is explicitly breaking.

## Docs and examples

- [ ] Updated docs/examples when behavior or public API changed.
- [ ] Added or updated tests for renderer, math, pipeline, or examples behavior.

## Summary

Explain the problem and the change.

## Related work

Link the issue, discussion, or maintainer request when one exists.

## Validation

List the checks that you ran and their results.

## Tool assistance

State `None` or list each coding assistant or generated-content tool and model
that had a meaningful role. Add the required `Assisted-by:` trailer to relevant
commits.

## Checklist

- [ ] The change is focused on this project.
- [ ] I reviewed the complete diff and can explain the change.
- [ ] I ran the relevant checks and reported the actual results.
- [ ] I checked license, source, security, and private-data requirements.
- [ ] I disclosed meaningful tool assistance.
