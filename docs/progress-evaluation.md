# Progress Evaluation

Phase 14 centralizes step completion in `ProgressService`.

## Ownership

Completion logic lives in:

```text
packages/database/src/progress.service.ts
```

API controllers, tracking handlers, workers, and UI code must not duplicate completion rules. They should call `ProgressService` or enqueue `evaluate-progress`.

## Rules

Supported v1 progress rules:

- `time_based`
- `link_click_required`
- `reply_required`

Time-based progress completes the current step once the scheduler has claimed it and the worker has prepared the outbound message.

Link-click progress completes the current step when the enrollment step has `clicked_at` or a matching clicked message event exists for that enrollment and step.

Reply-required progress has two modes:

- any reply completes the step when no required phrases are configured
- configured phrases complete the step only when normalized reply text contains a normalized phrase

Reply normalization:

- lowercase
- remove punctuation
- normalize whitespace

## Advancement

When a current step completes, `ProgressService`:

- marks the current `enrollment_step_states` record `completed`
- records a `completed` message event
- advances `enrollments.current_step_order` to the next published step
- marks the enrollment `completed` when the final published step completes

Provider sending and inbound reply webhooks remain later phases. Those phases should write provider/reply events and then call `ProgressService` or enqueue `evaluate-progress`.
